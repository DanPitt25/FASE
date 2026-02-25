import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../../lib/firebase-admin';
import Stripe from 'stripe';

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

interface Transaction {
  id: string;
  source: 'stripe' | 'wise';
  date: string;
  amount: number;
  currency: string;
  reference: string;
  senderName?: string;
  matchedInvoice: {
    id: string;
    invoiceNumber: string;
    organizationName: string;
    amount: number;
  } | null;
  status: 'matched' | 'unmatched' | 'pending';
  rawData?: any;
}

/**
 * GET: Combined transaction list from Stripe and Wise
 * Query params: ?source=all|stripe|wise&matched=true|false&from=&to=&limit=
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'all';
    const matchedFilter = searchParams.get('matched'); // 'true', 'false', or null for all
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Calculate date range
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const from = fromDate ? new Date(fromDate) : defaultFrom;
    const to = toDate ? new Date(toDate) : now;

    // Get all invoices for matching
    const invoicesSnapshot = await adminDb.collection('invoices').get();
    const invoicesByNumber = new Map<string, any>();
    const invoicesById = new Map<string, any>();

    for (const doc of invoicesSnapshot.docs) {
      const data = doc.data();
      if (data.invoiceNumber) {
        invoicesByNumber.set(data.invoiceNumber.toUpperCase(), {
          id: doc.id,
          invoiceNumber: data.invoiceNumber,
          organizationName: data.organizationName,
          amount: data.amount || data.totalAmount,
          currency: data.currency,
          status: data.status,
        });
      }
      invoicesById.set(doc.id, {
        id: doc.id,
        invoiceNumber: data.invoiceNumber,
        organizationName: data.organizationName,
        amount: data.amount || data.totalAmount,
        currency: data.currency,
        status: data.status,
      });
    }

    const transactions: Transaction[] = [];

    // Fetch Stripe transactions
    if (source === 'all' || source === 'stripe') {
      const stripeInstance = initializeStripe();
      if (stripeInstance) {
        try {
          const paymentIntents = await stripeInstance.paymentIntents.list({
            limit: Math.min(limit, 100),
            created: {
              gte: Math.floor(from.getTime() / 1000),
              lte: Math.floor(to.getTime() / 1000),
            },
          });

          for (const pi of paymentIntents.data) {
            if (pi.status !== 'succeeded') continue;

            // Try to match by metadata
            let matchedInvoice: Transaction['matchedInvoice'] = null;
            const invoiceNumber = pi.metadata?.invoice_number;
            const invoiceId = pi.metadata?.invoice_id;

            if (invoiceNumber) {
              matchedInvoice = invoicesByNumber.get(invoiceNumber.toUpperCase()) || null;
            } else if (invoiceId) {
              matchedInvoice = invoicesById.get(invoiceId) || null;
            }

            const tx: Transaction = {
              id: pi.id,
              source: 'stripe',
              date: new Date(pi.created * 1000).toISOString(),
              amount: pi.amount / 100,
              currency: pi.currency.toUpperCase(),
              reference: invoiceNumber || pi.description || pi.id,
              senderName: pi.metadata?.organization_name,
              matchedInvoice,
              status: matchedInvoice ? 'matched' : 'unmatched',
            };

            transactions.push(tx);
          }
        } catch (stripeError) {
          console.error('Failed to fetch Stripe transactions:', stripeError);
        }
      }
    }

    // Fetch Wise transactions
    if (source === 'all' || source === 'wise') {
      try {
        const { getWiseClient } = await import('../../../../../lib/wise-api');
        const wiseClient = getWiseClient();
        const wiseTransactions = await wiseClient.getIncomingPayments({
          from: from.toISOString(),
          to: to.toISOString(),
        });

        for (const wiseTx of wiseTransactions) {
          // Try to match by reference
          let matchedInvoice: Transaction['matchedInvoice'] = null;
          const reference = (
            wiseTx.details.paymentReference ||
            wiseTx.details.description ||
            ''
          ).toUpperCase();

          // Check if reference contains any invoice number
          for (const [invNumber, invoice] of invoicesByNumber) {
            if (reference.includes(invNumber)) {
              matchedInvoice = invoice;
              break;
            }
          }

          const tx: Transaction = {
            id: wiseTx.referenceNumber,
            source: 'wise',
            date: wiseTx.date,
            amount: wiseTx.amount.value,
            currency: wiseTx.amount.currency,
            reference: wiseTx.details.paymentReference || wiseTx.details.description || '',
            senderName: wiseTx.details.senderName,
            matchedInvoice,
            status: matchedInvoice ? 'matched' : 'unmatched',
          };

          transactions.push(tx);
        }
      } catch (wiseError: any) {
        if (!wiseError.message?.includes('environment variable')) {
          console.error('Failed to fetch Wise transactions:', wiseError);
        }
      }
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply matched filter
    let filteredTransactions = transactions;
    if (matchedFilter === 'true') {
      filteredTransactions = transactions.filter((t) => t.status === 'matched');
    } else if (matchedFilter === 'false') {
      filteredTransactions = transactions.filter((t) => t.status === 'unmatched');
    }

    // Apply limit
    filteredTransactions = filteredTransactions.slice(0, limit);

    return NextResponse.json({
      success: true,
      transactions: filteredTransactions,
      summary: {
        total: filteredTransactions.length,
        matched: filteredTransactions.filter((t) => t.status === 'matched').length,
        unmatched: filteredTransactions.filter((t) => t.status === 'unmatched').length,
        stripeCount: filteredTransactions.filter((t) => t.source === 'stripe').length,
        wiseCount: filteredTransactions.filter((t) => t.source === 'wise').length,
      },
      filters: {
        source,
        matched: matchedFilter,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
