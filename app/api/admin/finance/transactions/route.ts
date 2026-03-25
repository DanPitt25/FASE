import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

let stripe: Stripe | null = null;

const initializeStripe = () => {
  if (!stripe) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return null;
    }
    stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripe;
};

interface LinkedPaymentInfo {
  id: string;
  transactionId: string;
  source: string;
  accountId: string;
  accountName: string;
  paymentType: 'membership' | 'rendezvous';
  amount: number;
  currency: string;
  linkedAt: string | null;
  linkedBy: string;
  linkedByName: string;
  notes?: string;
}

interface Transaction {
  id: string;
  source: 'stripe' | 'wise';
  date: string;
  amount: number;
  currency: string;
  amountEur: number; // Converted to EUR for sorting/filtering
  reference: string;
  senderName?: string;
  // Additional fields for matching/invoicing
  email?: string;
  customerId?: string; // Stripe customer ID or Wise sender account
  description?: string;
  suppressed?: boolean; // Hidden from reports
  linkedPayment?: LinkedPaymentInfo; // Linked member info
}

// Approximate exchange rates - updated periodically
// For display purposes only, not financial calculations
async function getExchangeRates(): Promise<Record<string, number>> {
  try {
    const { fetchExchangeRates } = await import('../../../../../lib/currency-conversion');
    const rates = await fetchExchangeRates();
    // rates are EUR -> X, we need X -> EUR (inverse)
    return {
      EUR: 1,
      GBP: 1 / (rates['GBP'] || 0.85),
      USD: 1 / (rates['USD'] || 1.08),
    };
  } catch {
    // Fallback rates if API fails
    return { EUR: 1, GBP: 1.18, USD: 0.92 };
  }
}

/**
 * GET: Combined transaction list from Stripe and Wise
 * Query params: ?source=all|stripe|wise&from=&to=&hideSuppressed=true
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'all';
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const hideSuppressed = searchParams.get('hideSuppressed') === 'true';

    const now = new Date();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : now;

    const transactions: Transaction[] = [];
    const errors: string[] = [];

    // Get suppressed transaction IDs from Firestore
    const suppressedSnapshot = await adminDb.collection('suppressed-transactions').get();
    const suppressedIds = new Set(suppressedSnapshot.docs.map(doc => doc.id));

    // Get linked payments from Firestore
    const linkedSnapshot = await adminDb.collection('linked-payments').get();
    const linkedPayments = new Map(
      linkedSnapshot.docs.map(doc => [doc.id, {
        id: doc.id,
        ...doc.data(),
        linkedAt: doc.data().linkedAt?.toDate?.()?.toISOString() || null,
      }])
    );

    // Get exchange rates for EUR conversion
    const exchangeRates = await getExchangeRates();

    // Fetch Stripe transactions
    if (source === 'all' || source === 'stripe') {
      const stripeInstance = initializeStripe();
      if (stripeInstance) {
        try {
          let hasMore = true;
          let startingAfter: string | undefined;

          while (hasMore) {
            const listParams: Stripe.PaymentIntentListParams = {
              limit: 100,
              expand: ['data.latest_charge'],
              ...(startingAfter && { starting_after: startingAfter }),
            };

            if (from || to) {
              listParams.created = {};
              if (from) listParams.created.gte = Math.floor(from.getTime() / 1000);
              if (to) listParams.created.lte = Math.floor(to.getTime() / 1000);
            }

            const paymentIntents = await stripeInstance.paymentIntents.list(listParams);

            for (const pi of paymentIntents.data) {
              if (pi.status !== 'succeeded') continue;

              // Try to get sender name and email from various sources
              let senderName = pi.metadata?.organization_name || '';
              let email = '';

              if (pi.latest_charge && typeof pi.latest_charge !== 'string') {
                const charge = pi.latest_charge as Stripe.Charge;
                if (!senderName) {
                  senderName = charge.billing_details?.name || '';
                }
                email = charge.billing_details?.email || charge.receipt_email || '';
              }

              // Get customer ID
              const customerId = typeof pi.customer === 'string'
                ? pi.customer
                : pi.customer?.id || '';

              const amount = pi.amount / 100;
              const currency = pi.currency.toUpperCase();
              const amountEur = amount * (exchangeRates[currency] || 1);

              const txId = `stripe_${pi.id}`;
              transactions.push({
                id: pi.id,
                source: 'stripe',
                date: new Date(pi.created * 1000).toISOString(),
                amount,
                currency,
                amountEur,
                reference: pi.metadata?.invoice_number || pi.description || '',
                senderName,
                email,
                customerId,
                description: pi.description || '',
                suppressed: suppressedIds.has(txId),
                linkedPayment: linkedPayments.get(txId) as LinkedPaymentInfo | undefined,
              });
            }

            hasMore = paymentIntents.has_more;
            if (paymentIntents.data.length > 0) {
              startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
            }
          }
        } catch (stripeError: any) {
          errors.push(`Stripe error: ${stripeError.message}`);
        }
      }
    }

    // Fetch Wise transactions
    if (source === 'all' || source === 'wise') {
      try {
        const { getWiseClient } = await import('../../../../../lib/wise-api');
        const wiseClient = getWiseClient();
        // Wise API has 469 day limit, so cap at 365 days for "all time"
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const wiseFrom = from || oneYearAgo;

        const wiseResult = await wiseClient.getIncomingPayments({
          from: wiseFrom.toISOString(),
          to: to.toISOString(),
        });

        for (const wiseTx of wiseResult.transactions) {
          const amount = wiseTx.amount.value;
          const currency = wiseTx.amount.currency;
          const amountEur = amount * (exchangeRates[currency] || 1);

          const txId = `wise_${wiseTx.referenceNumber}`;
          transactions.push({
            id: wiseTx.referenceNumber,
            source: 'wise',
            date: wiseTx.date,
            amount,
            currency,
            amountEur,
            reference: wiseTx.details.paymentReference || wiseTx.details.description || '',
            senderName: wiseTx.details.senderName || '',
            description: wiseTx.details.description || '',
            suppressed: suppressedIds.has(txId),
            linkedPayment: linkedPayments.get(txId) as LinkedPaymentInfo | undefined,
          });
        }
      } catch (wiseError: any) {
        errors.push(`Wise error: ${wiseError.message}`);
      }
    }

    // Filter out small transactions (under €10 equivalent)
    let filteredTransactions = transactions.filter((t) => t.amountEur >= 10);

    // Optionally hide suppressed transactions (for View mode)
    if (hideSuppressed) {
      filteredTransactions = filteredTransactions.filter((t) => !t.suppressed);
    }

    // Sort by date descending
    filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate summary (excluding suppressed for accurate totals)
    const visibleTransactions = filteredTransactions.filter((t) => !t.suppressed);

    return NextResponse.json({
      success: true,
      transactions: filteredTransactions,
      summary: {
        total: visibleTransactions.length,
        stripeCount: visibleTransactions.filter((t) => t.source === 'stripe').length,
        wiseCount: visibleTransactions.filter((t) => t.source === 'wise').length,
        totalEur: visibleTransactions.reduce((sum, t) => sum + t.amountEur, 0),
        suppressedCount: filteredTransactions.filter((t) => t.suppressed).length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
