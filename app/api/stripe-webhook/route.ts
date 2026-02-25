import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { adminDb, FieldValue } from '../../../lib/firebase-admin';
import { safeDocExists, safeDocData } from '../../../lib/firebase-helpers';
import { logStripePayment, logPaymentReceived, logInvoicePaid } from '../../../lib/activity-logger';
import { generatePaidInvoicePDF, InvoiceGenerationData, PaymentInfo } from '../../../lib/invoice-pdf-generator';
import { uploadInvoicePDF } from '../../../lib/invoice-storage';

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

// Generate and store a PAID invoice PDF
const generateAndStorePaidInvoice = async (
  invoiceNumber: string,
  organizationName: string,
  amount: number,
  currency: string,
  paymentId: string,
  invoiceId?: string
): Promise<string | null> => {
  try {
    console.log(`📄 Auto-generating PAID invoice PDF for ${invoiceNumber}`);

    // Try to get more invoice details from Firestore if we have an invoiceId
    let invoiceData: InvoiceGenerationData = {
      invoiceNumber,
      organizationName,
      totalAmount: amount,
      email: '',
      forceCurrency: currency.toUpperCase(),
    };

    if (invoiceId) {
      const invoiceDoc = await adminDb.collection('invoices').doc(invoiceId).get();
      if (invoiceDoc.exists) {
        const firestoreData = invoiceDoc.data()!;
        invoiceData = {
          ...invoiceData,
          email: firestoreData.recipientEmail || firestoreData.email || '',
          fullName: firestoreData.recipientName || firestoreData.fullName || '',
          address: firestoreData.address,
          originalAmount: firestoreData.originalAmount,
          discountAmount: firestoreData.discountAmount,
          discountReason: firestoreData.discountReason,
          organizationType: firestoreData.organizationType,
          userLocale: firestoreData.locale || 'en',
        };
      }
    }

    const paymentInfo: PaymentInfo = {
      paidAt: new Date(),
      paymentMethod: 'stripe',
      paymentReference: paymentId,
      amountPaid: amount,
      currency: currency.toUpperCase(),
    };

    // Generate the PDF
    const result = await generatePaidInvoicePDF(invoiceData, paymentInfo);

    // Upload to Firebase Storage
    const uploadResult = await uploadInvoicePDF(
      result.pdfBase64,
      `${invoiceNumber}-PAID`,
      organizationName
    );

    console.log(`✅ PAID invoice PDF stored: ${uploadResult.downloadURL}`);

    // Update Firestore invoice with paid PDF URL
    if (invoiceId) {
      await adminDb.collection('invoices').doc(invoiceId).update({
        paidPdfUrl: uploadResult.downloadURL,
        paidPdfGeneratedAt: FieldValue.serverTimestamp(),
      });
    }

    return uploadResult.downloadURL;
  } catch (error) {
    console.error('Failed to generate/store PAID invoice PDF:', error);
    return null;
  }
};

// Simplified payment status updater - uses direct Firebase Auth UID lookup
const updateMemberStatus = async (userId: string, paymentStatus: string, paymentMethod: string, paymentId: string) => {
  try {
    // Step 1: Direct lookup by Firebase Auth UID (post-migration standard)
    const accountRef = adminDb.collection('accounts').doc(userId);
    const accountDoc = await accountRef.get();

    if (safeDocExists(accountDoc)) {
      // Update account status (works for both individual and corporate accounts)
      await accountRef.update({
        status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        paymentId: paymentId,
        updatedAt: FieldValue.serverTimestamp()
      });
      return;
    }

    // Step 2: Fallback - search as team member in corporate accounts
    // This handles team members who are not primary contacts
    // All accounts are corporate - search all accounts for team members
    const accountsSnapshot = await adminDb.collection('accounts')
      .get();

    for (const orgDoc of accountsSnapshot.docs) {
      const memberRef = orgDoc.ref.collection('members').doc(userId);
      const memberDoc = await memberRef.get();

      if (safeDocExists(memberDoc)) {
        // Found user as team member - update the organization account
        await orgDoc.ref.update({
          status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          paymentId: paymentId,
          updatedAt: FieldValue.serverTimestamp()
        });

        return;
      }
    }

    console.error('No account found for user:', userId);
  } catch (error) {
    console.error('Error updating member status:', error);
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

      if (session.metadata?.user_id) {
        try {
          await updateMemberStatus(
            session.metadata.user_id,
            'paid',
            'stripe',
            session.id
          );

          // Log activity for the payment
          const accountId = session.metadata.account_id || session.metadata.user_id;
          if (accountId && session.amount_total) {
            await logPaymentReceived(
              accountId,
              session.amount_total / 100,
              (session.currency || 'eur').toUpperCase(),
              'stripe'
            );
          }

          // If there's an invoice number, mark it as paid and log
          if (session.metadata.invoice_number && accountId) {
            await logInvoicePaid(
              accountId,
              session.metadata.invoice_number,
              (session.amount_total || 0) / 100,
              (session.currency || 'eur').toUpperCase(),
              session.metadata.invoice_id || '',
              'Stripe'
            );

            // Update the invoice in Firestore if we have an invoice_id
            if (session.metadata.invoice_id) {
              await adminDb.collection('invoices').doc(session.metadata.invoice_id).update({
                status: 'paid',
                paymentMethod: 'stripe',
                paymentId: session.id,
                stripeCheckoutSessionId: session.id,
                paidAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              });
            }

            // Auto-generate PAID invoice PDF
            const organizationName = session.metadata.organization_name || 'Unknown Organization';
            await generateAndStorePaidInvoice(
              session.metadata.invoice_number,
              organizationName,
              (session.amount_total || 0) / 100,
              (session.currency || 'eur').toUpperCase(),
              session.id,
              session.metadata.invoice_id
            );
          }
        } catch (error) {
          console.error('Failed to update member application:', error);
        }
      } else {
        console.error('No user_id found in session metadata');
      }
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;

      // Only handle subscription invoice payments (not standalone invoices)
      const invoiceAny = invoice as any;
      const subscriptionId = typeof invoiceAny.subscription === 'string' ? invoiceAny.subscription : invoiceAny.subscription?.id;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.metadata?.user_id) {
          try {
            await updateMemberStatus(
              subscription.metadata.user_id,
              'paid',
              'stripe',
              invoice.id || ''
            );
          } catch (error) {
            console.error('Failed to update member application:', error);
          }
        }
      }
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
