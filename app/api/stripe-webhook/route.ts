import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

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
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error('Firebase credentials not configured');
      }

      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : undefined;

      admin.initializeApp({
        credential: serviceAccount 
          ? admin.credential.cert(serviceAccount)
          : admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }
};

const updateMemberStatus = async (userId: string, paymentStatus: string, paymentMethod: string, paymentId: string) => {
  try {
    await initializeServices();
    const db = admin.firestore();
    
    // First check if this is an individual account
    const accountRef = db.collection('accounts').doc(userId);
    const doc = await accountRef.get();
    
    if (doc.exists) {
      const accountData = doc.data();
      console.log('Found account for user:', userId, 'with membershipType:', accountData?.membershipType);
      
      if (accountData?.membershipType === 'individual') {
        // Individual account - update directly
        await accountRef.update({
          status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          paymentId: paymentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Individual account status updated successfully for user:', userId);
        return;
      } else if (accountData?.membershipType === 'corporate') {
        // Corporate account - update directly
        await accountRef.update({
          status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          paymentId: paymentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Corporate account status updated successfully for user:', userId);
        return;
      } else if (accountData?.redirectToOrg && accountData?.organizationId) {
        // This is a redirect account - update the organization instead
        const orgRef = db.collection('accounts').doc(accountData.organizationId);
        await orgRef.update({
          status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          paymentId: paymentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Organization account status updated via redirect for user:', userId);
        return;
      }
    }
    
    // If not found as individual, search for user in organization members
    const accountsSnapshot = await db.collection('accounts')
      .where('membershipType', '==', 'corporate')
      .get();
    
    for (const orgDoc of accountsSnapshot.docs) {
      const membersSnapshot = await orgDoc.ref.collection('members')
        .where('firebaseUid', '==', userId)
        .get();
      
      if (!membersSnapshot.empty) {
        // Found user in this organization - update the organization status
        await orgDoc.ref.update({
          status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          paymentId: paymentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Organization account status updated for user:', userId, 'in org:', orgDoc.id);
        return;
      }
    }
    
    console.log('No account or organization membership found for user:', userId);
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
        console.log('=== WEBHOOK: No user_id found in session metadata ===');
        console.log('Session metadata:', session.metadata);
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