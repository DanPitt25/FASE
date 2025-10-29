import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { safeDocExists, safeDocData } from '../../../lib/firebase-helpers';
import { getGCPCredentials } from '../../../lib/gcp-credentials';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

let stripe: Stripe;
let admin: any;
let endpointSecret: string;

// Initialize everything at runtime
const initializeServices = async () => {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil',
    });
  }
  
  if (!endpointSecret) {
    endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  }
  
  if (!admin) {
    admin = await import('firebase-admin');
    
    if (admin.apps.length === 0) {
      const gcpCredentials = getGCPCredentials();
      
      admin.initializeApp({
        credential: gcpCredentials.credentials 
          ? admin.credential.cert(gcpCredentials.credentials)
          : admin.credential.applicationDefault(),
        projectId: gcpCredentials.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }
};

// Simplified payment status updater - uses direct Firebase Auth UID lookup
const updateMemberStatus = async (userId: string, paymentStatus: string, paymentMethod: string, paymentId: string) => {
  try {
    await initializeServices();
    const db = admin.firestore();
    
    // Step 1: Direct lookup by Firebase Auth UID (post-migration standard)
    const accountRef = db.collection('accounts').doc(userId);
    const accountDoc = await accountRef.get();
    
    if (safeDocExists(accountDoc)) {
      const accountData = safeDocData(accountDoc);
      console.log('Found account for user:', userId, 'with membershipType:', accountData?.membershipType);
      
      // Update account status (works for both individual and corporate accounts)
      await accountRef.update({
        status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        paymentId: paymentId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Account status updated successfully for user:', userId, 'account type:', accountData?.membershipType);
      return;
    }
    
    // Step 2: Fallback - search as team member in corporate accounts
    // This handles team members who are not primary contacts
    const accountsSnapshot = await db.collection('accounts')
      .where('membershipType', '==', 'corporate')
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
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Organization account status updated for team member:', userId, 'in org:', orgDoc.id);
        return;
      }
    }
    
    console.log('No account found for user:', userId);
  } catch (error) {
    console.error('Error updating member status:', error);
  }
};


export async function POST(request: NextRequest) {
  console.log('=== STRIPE WEBHOOK RECEIVED - Updated Secret ===');
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  
  await initializeServices();
  console.log('Services initialized, processing webhook...');
  
  const body = await request.text();
  const headersList = headers();
  const sig = headersList.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
    console.log('Webhook signature verified, event type:', event.type);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  console.log('Processing event:', event.type);
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Payment successful (checkout completed):', session.id);
      console.log('Session metadata:', session.metadata);
      
      // Update the member application status
      console.log('=== WEBHOOK: Full session metadata ===', JSON.stringify(session.metadata, null, 2));
      
      if (session.metadata?.user_id) {
        try {
          console.log('=== WEBHOOK: Attempting to update member for user:', session.metadata.user_id, '===');
          await updateMemberStatus(
            session.metadata.user_id,
            'paid',
            'stripe',
            session.id
          );
          console.log('=== WEBHOOK: Member application updated successfully for user:', session.metadata.user_id, '===');
        } catch (error) {
          console.error('=== WEBHOOK: Failed to update member application:', error, '===');
        }
      } else {
        console.error('=== WEBHOOK: No user_id found in session metadata ===');
        console.error('=== WEBHOOK: Available metadata keys:', Object.keys(session.metadata || {}));
        console.error('=== WEBHOOK: Full metadata:', JSON.stringify(session.metadata, null, 2));
      }
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Invoice payment successful:', invoice.id);
      console.log('Invoice metadata:', invoice.metadata);
      
      // Only handle subscription invoice payments (not standalone invoices)
      const invoiceAny = invoice as any;
      const subscriptionId = typeof invoiceAny.subscription === 'string' ? invoiceAny.subscription : invoiceAny.subscription?.id;
      
      if (subscriptionId) {
        // Handle subscription invoice payments
        console.log('Processing subscription invoice payment');
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (subscription.metadata?.user_id) {
          try {
            await updateMemberStatus(
              subscription.metadata.user_id,
              'paid',
              'stripe',
              invoice.id || ''
            );
            console.log('Member application updated for subscription user:', subscription.metadata.user_id);
          } catch (error) {
            console.error('Failed to update member application:', error);
          }
        }
      } else {
        console.log('Non-subscription invoice - ignoring (bank transfer invoices handled manually)');
      }
      break;


    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment failed:', paymentIntent.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  console.log('=== WEBHOOK PROCESSING COMPLETE ===');
  return NextResponse.json({ received: true, timestamp: new Date().toISOString() });
}