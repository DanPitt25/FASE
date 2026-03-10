import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { adminDb, FieldValue } from '../../../lib/firebase-admin';
import { logPaymentReceived, logInvoicePaid } from '../../../lib/activity-logger';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

let stripe: Stripe;
let endpointSecret: string;

// Initialize Stripe at runtime
const initializeStripe = () => {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    });
  }

  if (!endpointSecret) {
    endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  }
};

export async function POST(request: NextRequest) {
  initializeStripe();

  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;

      const accountId = session.metadata?.account_id || session.metadata?.user_id;

      if (accountId) {
        try {
          // Log activity for the payment
          if (session.amount_total) {
            await logPaymentReceived(
              accountId,
              session.amount_total / 100,
              (session.currency || 'eur').toUpperCase(),
              'stripe'
            );
          }

          // If there's an invoice number, mark it as paid and log
          if (session.metadata?.invoice_number && accountId) {
            await logInvoicePaid(
              accountId,
              session.metadata.invoice_number,
              (session.amount_total || 0) / 100,
              (session.currency || 'eur').toUpperCase(),
              session.metadata.invoice_id || '',
              'Stripe'
            );

            // Update the invoice in Firestore by invoice_id or invoice_number
            if (session.metadata.invoice_id) {
              await adminDb.collection('invoices').doc(session.metadata.invoice_id).update({
                status: 'paid',
                paymentMethod: 'stripe',
                paymentId: session.id,
                stripeCheckoutSessionId: session.id,
                paidAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              });
            } else {
              // Try to find invoice by invoice_number
              const invoicesSnapshot = await adminDb.collection('invoices')
                .where('invoiceNumber', '==', session.metadata.invoice_number)
                .limit(1)
                .get();

              if (!invoicesSnapshot.empty) {
                const invoiceDoc = invoicesSnapshot.docs[0];

                await invoiceDoc.ref.update({
                  status: 'paid',
                  paymentMethod: 'stripe',
                  paymentId: session.id,
                  stripeCheckoutSessionId: session.id,
                  paidAt: FieldValue.serverTimestamp(),
                  updatedAt: FieldValue.serverTimestamp(),
                });
                console.log(`✅ Invoice ${session.metadata.invoice_number} marked as paid via Stripe`);
              }
            }
          }
        } catch (error) {
          console.error('Failed to process payment:', error);
        }
      } else {
        console.error('No user_id or account_id found in session metadata');
      }
      break;

    case 'invoice.payment_succeeded':
      // Subscription invoice payments - just log
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Invoice payment succeeded:', invoice.id);
      break;

    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error('Payment failed:', paymentIntent.id);
      break;

    default:
      // Silently ignore unhandled event types
      break;
  }

  return NextResponse.json({ received: true, timestamp: new Date().toISOString() });
}
