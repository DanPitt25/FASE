import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Initialize Firebase Admin if not already initialized
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
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

    // Handle successful payment
    if (webhookData.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = webhookData.resource.id;
      const customId = webhookData.resource.purchase_units[0]?.custom_id;
      
      if (!customId) {
        console.error('No custom_id (userId) found in PayPal webhook');
        return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
      }

      // Get access token and capture the order
      const accessToken = await getPayPalAccessToken();
      const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
      const base = environment === 'sandbox' 
        ? 'https://api-m.sandbox.paypal.com'
        : 'https://api-m.paypal.com';

      // Capture the payment
      const captureResponse = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!captureResponse.ok) {
        console.error('Failed to capture PayPal payment:', await captureResponse.text());
        return NextResponse.json({ error: 'Failed to capture payment' }, { status: 500 });
      }

      const captureData = await captureResponse.json();
      
      // Update Firebase account status
      const { db } = await initializeAdmin();
      
      // Find and update the account
      const accountRef = db.collection('accounts').doc(customId);
      const accountDoc = await accountRef.get();
      
      if (!accountDoc.exists) {
        console.error(`Account not found for user ID: ${customId}`);
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      // Update account status to active
      await accountRef.update({
        status: 'active',
        paymentProvider: 'paypal',
        paymentDetails: {
          orderId: orderId,
          captureId: captureData.id,
          paymentTime: admin.firestore.FieldValue.serverTimestamp(),
          amount: captureData.purchase_units[0]?.payments?.captures[0]?.amount?.value,
          currency: captureData.purchase_units[0]?.payments?.captures[0]?.amount?.currency_code
        },
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Account ${customId} activated via PayPal payment ${orderId}`);
      
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