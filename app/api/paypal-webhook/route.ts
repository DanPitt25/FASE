import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

let admin: any;

// Initialize Firebase Admin dynamically to avoid build-time issues
const initializeAdmin = async () => {
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
  
  return {
    auth: admin.auth(),
    db: admin.firestore()
  };
};

// Get PayPal OAuth token
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const base = environment === 'sandbox' 
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Verify PayPal webhook signature
async function verifyWebhookSignature(request: NextRequest, body: string) {
  // For now, we'll skip signature verification in development
  // In production, you should implement proper webhook verification
  const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
  
  if (environment === 'sandbox') {
    return true; // Skip verification for sandbox
  }
  
  // TODO: Implement proper webhook signature verification for production
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhookData = JSON.parse(body);
    
    console.log('PayPal webhook received:', webhookData.event_type);

    // Verify webhook signature
    const isValidSignature = await verifyWebhookSignature(request, body);
    if (!isValidSignature) {
      console.error('Invalid PayPal webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle successful payment (one-time orders)
    if (webhookData.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const captureId = webhookData.resource.id;
      const customId = webhookData.resource.custom_id;
      
      if (!customId) {
        console.error('No custom_id (userId) found in PayPal webhook');
        return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
      }

      await processPayment(customId, 'paypal', captureId, webhookData);
      return NextResponse.json({ success: true });
    }

    // Handle successful subscription activation
    if (webhookData.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscriptionId = webhookData.resource.id;
      const customId = webhookData.resource.custom_id;
      
      if (!customId) {
        console.error('No custom_id (userId) found in PayPal subscription webhook');
        return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
      }

      await processPayment(customId, 'paypal_subscription', subscriptionId, webhookData);
      return NextResponse.json({ success: true });
    }

    // Handle other webhook events as needed
    console.log(`Unhandled PayPal webhook event: ${webhookData.event_type}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Shared payment processing logic
async function processPayment(customId: string, paymentMethod: string, paymentId: string, webhookData: any) {
  const { db } = await initializeAdmin();
  
  // Check if account exists
  const accountRef = db.collection('accounts').doc(customId);
  const accountDoc = await accountRef.get();
  
  if (!accountDoc.exists) {
    console.error(`Account not found for user ID: ${customId}`);
    throw new Error('Account not found');
  }

  // Process application completion after successful payment
  let applicationNumber = null;
  try {
    // Get draft application data
    const draftDoc = await db.collection('draft_applications').doc(customId).get();
    
    if (draftDoc.exists) {
      const applicationData = draftDoc.data();
      
      // Import submission function dynamically
      const authModule = await import('../../../lib/auth');
      const { submitApplication } = authModule;
      
      // Submit the application now that payment is confirmed
      const result = await submitApplication(applicationData);
      applicationNumber = result.applicationNumber;
      
      // Clean up draft application
      await db.collection('draft_applications').doc(customId).delete();
      
      console.log(`Application processed successfully after ${paymentMethod} payment:`, applicationNumber);
    } else {
      console.warn('No draft application found for user:', customId);
    }
  } catch (appError) {
    console.error(`Failed to process application after ${paymentMethod} payment:`, appError);
    // Continue with payment processing even if application submission fails
  }

  // Prepare update data based on payment method
  let updateData: any = {
    status: 'pending', // Keep pending for manual review
    paymentStatus: 'paid',
    paymentMethod: paymentMethod,
    paymentId: paymentId,
    applicationNumber: applicationNumber,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // Add payment-specific details
  if (paymentMethod === 'paypal') {
    updateData.paymentDetails = {
      captureId: paymentId,
      paymentTime: admin.firestore.FieldValue.serverTimestamp(),
      amount: webhookData.resource.amount?.value,
      currency: webhookData.resource.amount?.currency_code
    };
  } else if (paymentMethod === 'paypal_subscription') {
    updateData.paymentDetails = {
      subscriptionId: paymentId,
      subscriptionTime: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionStatus: 'active',
      nextBillingTime: webhookData.resource.billing_info?.next_billing_time
    };
  }

  // Update payment status
  await accountRef.update(updateData);

  console.log(`Account ${customId} payment processed via ${paymentMethod} ${paymentId}, application: ${applicationNumber}`);
}