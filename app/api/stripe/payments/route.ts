import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

let stripe: Stripe;

const initializeStripe = () => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripe;
};

export async function GET(request: NextRequest) {
  try {
    initializeStripe();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const customerId = searchParams.get('customer_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const startingAfter = searchParams.get('starting_after');

    // Build query params
    const queryParams: Stripe.PaymentIntentListParams = {
      limit: Math.min(limit, 100),
    };

    if (startingAfter) {
      queryParams.starting_after = startingAfter;
    }

    // If we have a customer ID, filter by customer
    if (customerId) {
      queryParams.customer = customerId;
    }

    // Fetch payment intents
    const paymentIntents = await stripe.paymentIntents.list(queryParams);

    // If filtering by email without customer ID, we need to look up customers first
    let filteredPayments = paymentIntents.data;
    if (email && !customerId) {
      const customers = await stripe.customers.list({ email, limit: 10 });
      const customerIds = customers.data.map((c) => c.id);
      filteredPayments = paymentIntents.data.filter(
        (pi) => pi.customer && customerIds.includes(pi.customer as string)
      );
    }

    // Enrich with customer data
    const enrichedPayments = await Promise.all(
      filteredPayments.map(async (pi) => {
        let customerEmail = null;
        let customerName = null;

        if (pi.customer) {
          try {
            const customer = await stripe.customers.retrieve(pi.customer as string);
            if (customer && !customer.deleted) {
              customerEmail = customer.email;
              customerName = customer.name;
            }
          } catch {
            // Customer may have been deleted
          }
        }

        return {
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          created: pi.created,
          createdDate: new Date(pi.created * 1000).toISOString(),
          customerEmail,
          customerName,
          customerId: pi.customer,
          metadata: pi.metadata,
          description: pi.description,
          paymentMethod: pi.payment_method_types?.[0],
          receiptEmail: pi.receipt_email,
          invoiceNumber: pi.metadata?.invoice_number,
          accountId: pi.metadata?.account_id,
          organizationName: pi.metadata?.organization_name,
        };
      })
    );

    return NextResponse.json({
      success: true,
      payments: enrichedPayments,
      hasMore: paymentIntents.has_more,
      nextCursor: paymentIntents.data.length > 0
        ? paymentIntents.data[paymentIntents.data.length - 1].id
        : null,
    });
  } catch (error: any) {
    console.error('Error fetching Stripe payments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
