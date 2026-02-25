import { NextRequest, NextResponse } from 'next/server';
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
}

/**
 * GET: Combined transaction list from Stripe and Wise
 * Query params: ?source=all|stripe|wise&from=&to=
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'all';
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    const now = new Date();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : now;

    const transactions: Transaction[] = [];
    const errors: string[] = [];

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

              // Try to get sender name from various sources
              let senderName = pi.metadata?.organization_name || '';
              if (!senderName && pi.latest_charge && typeof pi.latest_charge !== 'string') {
                const charge = pi.latest_charge as Stripe.Charge;
                senderName = charge.billing_details?.name || '';
              }

              transactions.push({
                id: pi.id,
                source: 'stripe',
                date: new Date(pi.created * 1000).toISOString(),
                amount: pi.amount / 100,
                currency: pi.currency.toUpperCase(),
                reference: pi.metadata?.invoice_number || pi.description || '',
                senderName,
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
        const wiseFrom = from || new Date('2020-01-01');

        // Test that we can get balances first
        const balances = await wiseClient.getBalances();
        if (balances.length === 0) {
          errors.push('Wise: No currency balances found');
        } else {
          errors.push(`Wise: Found balances for ${balances.map(b => b.currency).join(', ')}`);
        }

        const wiseResult = await wiseClient.getIncomingPayments({
          from: wiseFrom.toISOString(),
          to: to.toISOString(),
        });

        // Add debug info
        errors.push(...wiseResult.debug);

        if (wiseResult.transactions.length === 0) {
          errors.push(`Wise: No incoming transactions found`);
        }

        for (const wiseTx of wiseResult.transactions) {
          transactions.push({
            id: wiseTx.referenceNumber,
            source: 'wise',
            date: wiseTx.date,
            amount: wiseTx.amount.value,
            currency: wiseTx.amount.currency,
            reference: wiseTx.details.paymentReference || wiseTx.details.description || '',
            senderName: wiseTx.details.senderName || '',
          });
        }
      } catch (wiseError: any) {
        errors.push(`Wise error: ${wiseError.message}`);
      }
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      transactions,
      summary: {
        total: transactions.length,
        stripeCount: transactions.filter((t) => t.source === 'stripe').length,
        wiseCount: transactions.filter((t) => t.source === 'wise').length,
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
