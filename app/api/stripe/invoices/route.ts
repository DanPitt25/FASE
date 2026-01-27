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
    const customerId = searchParams.get('customer_id');
    const status = searchParams.get('status') as Stripe.InvoiceListParams.Status | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const startingAfter = searchParams.get('starting_after');

    const queryParams: Stripe.InvoiceListParams = {
      limit: Math.min(limit, 100),
    };

    if (customerId) {
      queryParams.customer = customerId;
    }

    if (status) {
      queryParams.status = status;
    }

    if (startingAfter) {
      queryParams.starting_after = startingAfter;
    }

    const invoices = await stripe.invoices.list(queryParams);

    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      amountRemaining: invoice.amount_remaining,
      currency: invoice.currency,
      created: invoice.created,
      createdDate: new Date(invoice.created * 1000).toISOString(),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : null,
      customerEmail: invoice.customer_email,
      customerName: invoice.customer_name,
      customerId: invoice.customer,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      metadata: invoice.metadata,
      subscriptionId: typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id,
      description: invoice.description,
      // Line items summary
      lineItems: invoice.lines?.data?.map((line) => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
      })),
    }));

    return NextResponse.json({
      success: true,
      invoices: formattedInvoices,
      hasMore: invoices.has_more,
      nextCursor: invoices.data.length > 0 ? invoices.data[invoices.data.length - 1].id : null,
    });
  } catch (error: any) {
    console.error('Error fetching Stripe invoices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
