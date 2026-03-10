import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { adminDb, FieldValue } from '../../../lib/firebase-admin';
import { safeDocExists, safeDocData } from '../../../lib/firebase-helpers';
import { logStripePayment, logPaymentReceived, logInvoicePaid } from '../../../lib/activity-logger';
import { calculateRendezvousTotal } from '../../../lib/pricing';

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

// Process Rendezvous registration when bundled invoice is paid
const processRendezvousRegistration = async (
  invoiceData: any,
  paymentMethod: 'stripe' | 'wise',
  paymentId: string
) => {
  const passData = invoiceData.rendezvousPassReservation;
  if (!passData || !passData.reserved) {
    return null;
  }

  try {
    const registrationId = `membership_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const attendees = passData.attendees || [];
    const passCount = passData.passCount || attendees.length || 1;
    const organizationType = passData.organizationType || 'MGA';
    const isFaseMember = passData.isFaseMember !== false;
    const isAsaseMember = passData.isAsaseMember || false;

    // Calculate the rendezvous total
    const rendezvousTotal = calculateRendezvousTotal(
      organizationType,
      passCount,
      isFaseMember,
      isAsaseMember
    ).subtotal;

    const registrationRecord = {
      registrationId,
      billingInfo: {
        company: invoiceData.accountName || invoiceData.organizationName,
        billingEmail: invoiceData.recipientEmail,
        country: invoiceData.address?.country || '',
        organizationType,
      },
      attendees: attendees.map((att: any, i: number) => ({
        id: `att_${i}`,
        firstName: att.firstName || att.name?.split(' ')[0] || '',
        lastName: att.lastName || att.name?.split(' ').slice(1).join(' ') || '',
        email: att.email || '',
        jobTitle: att.jobTitle || att.title || '',
      })),
      additionalInfo: {
        specialRequests: passData.specialRequests || '',
        linkedInvoice: invoiceData.invoiceNumber,
      },
      totalPrice: rendezvousTotal,
      subtotal: rendezvousTotal,
      vatAmount: 0,
      vatRate: 0,
      currency: 'EUR',
      numberOfAttendees: passCount,
      companyIsFaseMember: isFaseMember,
      isAsaseMember,
      membershipType: isAsaseMember ? 'asase' : (isFaseMember ? 'fase' : 'none'),
      discount: 0,
      paymentMethod,
      paymentStatus: 'paid',
      [`${paymentMethod}PaymentId`]: paymentId,
      createdAt: new Date(),
      status: 'confirmed',
      source: 'membership-invoice-bundled',
      accountId: invoiceData.accountId,
    };

    await adminDb.collection('rendezvous-registrations').doc(registrationId).set(registrationRecord);
    console.log(`✅ Rendezvous registration created from bundled invoice: ${registrationId}`);

    // Send confirmation email
    try {
      const emailData = {
        email: invoiceData.recipientEmail,
        cc: 'admin@fasemga.com',
        subject: `MGA Rendezvous 2026 - Registration Confirmed (${registrationId})`,
        invoiceHTML: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://mgarendezvous.com/mga-rendezvous-logo.png" alt="MGA Rendezvous" style="max-width: 200px;">
            </div>
            <h2 style="color: #2D5574;">Registration Confirmed</h2>
            <p>Your MGA Rendezvous 2026 registration has been confirmed as part of your FASE membership invoice.</p>
            <p><strong>Registration ID:</strong> ${registrationId}</p>
            <p><strong>Company:</strong> ${invoiceData.accountName}</p>
            <p><strong>Number of Attendees:</strong> ${passCount}</p>
            <p><strong>Linked Invoice:</strong> ${invoiceData.invoiceNumber}</p>
            <p>We look forward to seeing you at MGA Rendezvous 2026!</p>
            <p>Best regards,<br>The FASE Team</p>
          </div>
        `,
        invoiceNumber: registrationId,
        organizationName: invoiceData.accountName,
        totalAmount: rendezvousTotal.toString(),
      };

      await fetch('https://us-central1-fase-site.cloudfunctions.net/sendInvoiceEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: emailData }),
      });
      console.log('✅ Rendezvous confirmation email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send rendezvous confirmation email:', emailError);
    }

    return registrationId;
  } catch (error) {
    console.error('❌ Failed to create rendezvous registration:', error);
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

      // Support both user_id (legacy) and account_id (new unified API)
      const userId = session.metadata?.user_id || session.metadata?.account_id;
      const accountId = session.metadata?.account_id || session.metadata?.user_id;

      if (userId) {
        try {
          await updateMemberStatus(
            userId,
            'paid',
            'stripe',
            session.id
          );

          // Log activity for the payment
          if (accountId && session.amount_total) {
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

            // Update the invoice in Firestore by invoice_number (unified API) or invoice_id (legacy)
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
              // Try to find invoice by invoice_number (unified API)
              const invoicesSnapshot = await adminDb.collection('invoices')
                .where('invoiceNumber', '==', session.metadata.invoice_number)
                .limit(1)
                .get();

              if (!invoicesSnapshot.empty) {
                const invoiceDoc = invoicesSnapshot.docs[0];
                const invoiceData = invoiceDoc.data();

                await invoiceDoc.ref.update({
                  status: 'paid',
                  paymentMethod: 'stripe',
                  paymentId: session.id,
                  stripeCheckoutSessionId: session.id,
                  paidAt: FieldValue.serverTimestamp(),
                  updatedAt: FieldValue.serverTimestamp(),
                });
                console.log(`✅ Invoice ${session.metadata.invoice_number} marked as paid via Stripe`);

                // Process bundled Rendezvous registration if present
                if (invoiceData?.rendezvousPassReservation) {
                  const rendezvousRegId = await processRendezvousRegistration(
                    { ...invoiceData, invoiceNumber: session.metadata.invoice_number },
                    'stripe',
                    session.id
                  );
                  if (rendezvousRegId) {
                    // Update invoice with linked registration
                    await invoiceDoc.ref.update({
                      linkedRendezvousRegistration: rendezvousRegId,
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to update member application:', error);
        }
      } else {
        console.error('No user_id or account_id found in session metadata');
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
