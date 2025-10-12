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
    const membersRef = db.collection('members');
    const snapshot = await membersRef.where('uid', '==', userId).limit(1).get();
    
    if (snapshot.empty) {
      console.log('No member found with uid:', userId);
      return;
    }
    
    const doc = snapshot.docs[0];
    await doc.ref.update({
      status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
      paymentStatus: paymentStatus,
      paymentMethod: paymentMethod,
      paymentId: paymentId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Member status updated successfully for user:', userId);
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
          console.log('Attempting to update member for user:', session.metadata.user_id);
          await updateMemberStatus(
            session.metadata.user_id,
            'paid',
            'stripe',
            session.id
          );
          console.log('Member application updated for user:', session.metadata.user_id);
        } catch (error) {
          console.error('Failed to update member application:', error);
        }
      } else {
        console.log('No user_id found in session metadata');
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