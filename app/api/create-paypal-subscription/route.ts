import { NextRequest, NextResponse } from 'next/server';
import { calculateMembershipFee } from '../../register/registration-utils';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

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
    const errorText = await response.text();
    console.error('PayPal OAuth error:', response.status, errorText);
    throw new Error(`Failed to get PayPal access token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Create product first, then plan
async function createProductAndPlan(accessToken: string, amount: number, planName: string) {
  const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
  const base = environment === 'sandbox' 
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  const productId = `FASE_MEMBERSHIP_${amount.toString().replace('.', '_')}`;

  // Step 1: Create Product
  const productData = {
    name: planName,
    description: `Annual FASE membership - ${planName}`,
    type: 'SERVICE',
    category: 'SOFTWARE'
  };

  const productResponse = await fetch(`${base}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(productData),
  });

  let product;
  if (productResponse.ok) {
    product = await productResponse.json();
    console.log('Created new product:', product.id);
  } else {
    const errorData = await productResponse.text();
    console.error('PayPal product creation error:', productResponse.status, errorData);
    throw new Error(`PayPal product creation failed: ${productResponse.status}`);
  }

  // Step 2: Create Plan
  const planData = {
    product_id: product.id,
    name: planName,
    description: `Annual FASE membership - ${planName}`,
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: {
          interval_unit: 'YEAR',
          interval_count: 1
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0, // Infinite
        pricing_scheme: {
          fixed_price: {
            value: amount.toFixed(2),
            currency_code: 'EUR'
          }
        }
      }
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3
    }
  };

  const planResponse = await fetch(`${base}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(planData),
  });

  if (!planResponse.ok) {
    const errorData = await planResponse.text();
    console.error('PayPal plan creation error:', planResponse.status, errorData);
    throw new Error(`PayPal plan creation failed: ${planResponse.status}`);
  }

  return await planResponse.json();
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    const { 
      organizationName, 
      organizationType, 
      membershipType,
      userEmail,
      userId,
      hasOtherAssociations = false,
      exactTotalAmount,
      testPayment = false
    } = requestData;

    // Get access token
    const accessToken = await getPayPalAccessToken();
    
    // Use exact amount from frontend or test payment
    let finalPrice;
    if (testPayment) {
      finalPrice = 0.50; // 50 cents for testing
    } else if (exactTotalAmount) {
      finalPrice = exactTotalAmount; // Use exact amount from admin
    } else {
      throw new Error('exactTotalAmount is required');
    }

    // Create product and billing plan
    const planName = `FASE ${membershipType === 'individual' ? 'Individual' : `${organizationType} Corporate`} Membership${hasOtherAssociations && membershipType === 'corporate' ? ' (Discounted)' : ''}`;
    const plan = await createProductAndPlan(accessToken, finalPrice, planName);

    // Get environment
    const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
    const base = environment === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    // Create subscription
    const subscriptionData = {
      plan_id: plan.id,
      start_time: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
      subscriber: {
        name: {
          given_name: organizationName.split(' ')[0] || 'Member',
          surname: organizationName.split(' ').slice(1).join(' ') || 'User'
        },
        email_address: userEmail
      },
      application_context: {
        brand_name: 'Federation of European MGAs (FASE)',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com'}/payment-succeeded`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com'}/payment-failed`
      },
      custom_id: userId.substring(0, 127) // PayPal custom_id has 127 char limit
    };

    const subscriptionResponse = await fetch(`${base}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.text();
      console.error('❌ PayPal subscription creation failed!');
      console.error('Status:', subscriptionResponse.status);
      console.error('Response:', errorData);
      console.error('Request data sent:', JSON.stringify(subscriptionData, null, 2));
      throw new Error(`PayPal subscription creation failed: ${subscriptionResponse.status} - ${errorData}`);
    }

    const subscription = await subscriptionResponse.json();
    
    // Find the approval URL
    const approvalUrl = subscription.links?.find((link: any) => link.rel === 'approve')?.href;
    
    if (!approvalUrl) {
      throw new Error('No approval URL received from PayPal');
    }

    return NextResponse.json({ 
      subscriptionId: subscription.id,
      planId: plan.id,
      approvalUrl,
      amount: finalPrice
    });

  } catch (error: any) {
    console.error('PayPal subscription creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create PayPal subscription' },
      { status: 500 }
    );
  }
}