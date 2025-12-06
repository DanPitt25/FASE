import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { safeDocExists, safeDocData } from '../../../lib/firebase-helpers';

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
      try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
          : undefined;

        admin.initializeApp({
          credential: serviceAccount 
            ? admin.credential.cert(serviceAccount)
            : admin.credential.applicationDefault(),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
        throw new Error('Firebase credentials not configured properly');
      }
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
      // Update account status (works for both individual and corporate accounts)
      await accountRef.update({
        status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        paymentId: paymentId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
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
        
        return;
      }
    }
    
    console.error('No account found for user:', userId);
  } catch (error) {
    console.error('Error updating member status:', error);
  }
};


export async function POST(request: NextRequest) {
  await initializeServices();
  
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