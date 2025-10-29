import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { safeDocExists, safeDocData } from '../../../lib/firebase-helpers';
import { logSecurityEvent } from '../../../lib/auth-security';

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
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
        }

        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
        throw new Error('Firebase credentials not configured properly');
      }
    }
  }
};

// Check for duplicate payments to prevent double-processing
const checkDuplicatePayment = async (db: any, paymentId: string, userId: string) => {
  const existingPayment = await db.collection('processed_payments').doc(paymentId).get();
  
  if (safeDocExists(existingPayment)) {
    const paymentData = safeDocData(existingPayment);
    
    // Log potential duplicate payment attempt
    await logSecurityEvent({
      type: 'suspicious_activity',
      userId,
      details: { 
        reason: 'duplicate_payment_attempt',
        paymentId,
        originalProcessedAt: paymentData?.processedAt,
        originalStatus: paymentData?.status
      },
      severity: 'high'
    });
    
    return true;
  }
  
  return false;
};

// Record processed payment to prevent duplicates
const recordProcessedPayment = async (db: any, paymentId: string, userId: string, amount?: number) => {
  await db.collection('processed_payments').doc(paymentId).set({
    userId,
    paymentId,
    amount,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'processed'
  });
};

// Enhanced payment status updater with security checks
const updateMemberStatus = async (userId: string, paymentStatus: string, paymentMethod: string, paymentId: string, amount?: number) => {
  try {
    await initializeServices();
    const db = admin.firestore();
    
    // Check for duplicate payment processing
    const isDuplicate = await checkDuplicatePayment(db, paymentId, userId);
    if (isDuplicate) {
      console.warn('Duplicate payment detected, skipping processing:', paymentId);
      return;
    }
    
    // Step 1: Direct lookup by Firebase Auth UID (post-migration standard)
    const accountRef = db.collection('accounts').doc(userId);
    const accountDoc = await accountRef.get();
    
    if (safeDocExists(accountDoc)) {
      const accountData = safeDocData(accountDoc);
      console.log('Found account for user:', userId, 'with membershipType:', accountData?.membershipType);
      
      // Check if already approved - potential duplicate payment
      if (accountData?.status === 'approved' && accountData?.paymentStatus === 'paid') {
        await logSecurityEvent({
          type: 'suspicious_activity',
          userId,
          details: { 
            reason: 'payment_to_already_approved_account',
            paymentId,
            currentStatus: accountData.status,
            currentPaymentId: accountData.paymentId,
            amount
          },
          severity: 'critical'
        });
        
        console.error('CRITICAL: Payment received for already approved account:', userId);
        // Still record the payment but don't update status
        await recordProcessedPayment(db, paymentId, userId, amount);
        return;
      }
      
      // Update account status (works for both individual and corporate accounts)
      await accountRef.update({
        status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        paymentId: paymentId,
        amount: amount || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Record successful payment processing
      await recordProcessedPayment(db, paymentId, userId, amount);
      
      // Log successful payment processing
      await logSecurityEvent({
        type: 'auth_success',
        userId,
        details: { 
          action: 'payment_processed',
          paymentId,
          amount,
          membershipType: accountData?.membershipType
        },
        severity: 'low'
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


// Expected payment amounts for validation (in cents)
const EXPECTED_AMOUNTS = {
  individual: 50000, // €500
  corporate_basic: 90000, // €900
  mga_10m: 90000,
  mga_10_20m: 150000,
  mga_20_50m: 200000,
  mga_50_100m: 280000,
  mga_100_500m: 420000,
  mga_500m_plus: 640000
};

export async function POST(request: NextRequest) {
  console.log('=== STRIPE WEBHOOK RECEIVED ===');
  
  await initializeServices();
  console.log('Services initialized, processing webhook...');
  
  const body = await request.text();
  const headersList = headers();
  const sig = headersList.get('stripe-signature');
  
  // Log webhook receipt for security monitoring
  await logSecurityEvent({
    type: 'auth_success',
    details: { 
      action: 'webhook_received',
      hasSignature: !!sig,
      bodyLength: body.length
    },
    severity: 'low'
  });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
    console.log('Webhook signature verified, event type:', event.type);
    
    // Log successful signature verification
    await logSecurityEvent({
      type: 'auth_success',
      details: { 
        action: 'webhook_signature_verified',
        eventType: event.type,
        eventId: event.id
      },
      severity: 'low'
    });
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    
    // Log failed signature verification - potential security threat
    await logSecurityEvent({
      type: 'suspicious_activity',
      details: { 
        reason: 'invalid_webhook_signature',
        error: err.message,
        hasSignature: !!sig
      },
      severity: 'critical'
    });
    
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  console.log('Processing event:', event.type);
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Payment successful (checkout completed):', session.id);
      
      // Validate payment amount against expected ranges
      const amount = session.amount_total;
      const isValidAmount = amount && Object.values(EXPECTED_AMOUNTS).some(expectedAmount => 
        Math.abs(amount - expectedAmount) <= 100 // Allow for small variations
      );
      
      if (!isValidAmount) {
        await logSecurityEvent({
          type: 'suspicious_activity',
          details: { 
            reason: 'unexpected_payment_amount',
            sessionId: session.id,
            amount: amount,
            expectedAmounts: EXPECTED_AMOUNTS
          },
          severity: 'high'
        });
        
        console.warn('WARNING: Unexpected payment amount:', amount);
      }
      
      if (session.metadata?.user_id) {
        try {
          console.log('=== WEBHOOK: Processing payment for user:', session.metadata.user_id, '===');
          await updateMemberStatus(
            session.metadata.user_id,
            'paid',
            'stripe',
            session.id,
            amount || undefined
          );
          console.log('=== WEBHOOK: Member application updated successfully ===');
        } catch (error) {
          console.error('=== WEBHOOK: Failed to update member application:', error, '===');
          
          await logSecurityEvent({
            type: 'suspicious_activity',
            userId: session.metadata.user_id,
            details: { 
              reason: 'payment_processing_failed',
              sessionId: session.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            severity: 'high'
          });
        }
      } else {
        console.error('=== WEBHOOK: No user_id found in session metadata ===');
        
        await logSecurityEvent({
          type: 'suspicious_activity',
          details: { 
            reason: 'payment_without_user_id',
            sessionId: session.id,
            metadata: session.metadata
          },
          severity: 'critical'
        });
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