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

              transactions.push({
                id: pi.id,
                source: 'stripe',
                date: new Date(pi.created * 1000).toISOString(),
                amount: pi.amount / 100,
                currency: pi.currency.toUpperCase(),
                reference: pi.metadata?.invoice_number || pi.description || '',
                senderName: pi.metadata?.organization_name || '',
              });
            }

            hasMore = paymentIntents.has_more;
            if (paymentIntents.data.length > 0) {
              startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
            }
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
          ...(from && { from: from.toISOString() }),
          ...(to && { to: to.toISOString() }),
        });

        for (const wiseTx of wiseTransactions) {
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
        if (!wiseError.message?.includes('environment variable')) {
          console.error('Failed to fetch Wise transactions:', wiseError);
        }
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
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
