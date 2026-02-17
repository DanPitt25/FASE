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

  // Send application notification to applications@fasemga.com
  let applicationNumber = `FASE-APP-${Date.now()}`;
  try {
    const accountData = accountDoc.data();
    
    // Send application notification
    const applicationEmailData = {
      email: 'applications@fasemga.com',
      invoiceHTML: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #2D5574;">New FASE Membership Application</h2>
          
          <p><strong>Organization:</strong> ${accountData.organizationName || accountData.displayName}</p>
          <p><strong>Type:</strong> ${accountData.organizationType} Corporate</p>
          <p><strong>Contact:</strong> ${accountData.accountAdministrator?.name}</p>
          <p><strong>Email:</strong> ${accountData.accountAdministrator?.email}</p>
          <p><strong>Phone:</strong> ${accountData.accountAdministrator?.phone}</p>
          <p><strong>Country:</strong> ${accountData.businessAddress?.country}</p>
          ${accountData.portfolio?.grossWrittenPremiums ? `<p><strong>GWP Band:</strong> ${accountData.portfolio.grossWrittenPremiums}</p>` : ''}
          <p><strong>Payment Method:</strong> PayPal</p>
          <p><strong>Payment ID:</strong> ${paymentId}</p>
          <p><strong>User ID:</strong> ${customId}</p>
          
          <p style="margin-top: 20px;"><em>Application submitted via PayPal payment method.</em></p>
        </div>
      `,
      invoiceNumber: `APP-${applicationNumber}`,
      organizationName: `New Application: ${accountData.organizationName || accountData.displayName}`,
      totalAmount: webhookData.resource.amount?.value || 0
    };

    const notificationResponse = await fetch(`https://us-central1-fase-site.cloudfunctions.net/sendInvoiceEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: applicationEmailData
      }),
    });

    if (notificationResponse.ok) {
      console.log('✅ Application notification sent to applications@fasemga.com');
    } else {
      console.error('❌ Failed to send application notification:', notificationResponse.status);
    }
    
  } catch (appError) {
    console.error(`Failed to send application notification after ${paymentMethod} payment:`, appError);
    // Continue with payment processing even if notification fails
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