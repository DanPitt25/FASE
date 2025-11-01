import { NextRequest, NextResponse } from 'next/server';

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

// Pricing mapping based on membership type and premium brackets
const getMembershipPrice = (membershipType: string, organizationType: string, grossWrittenPremiums?: string): number => {
  // Admin test mode
  if (grossWrittenPremiums && grossWrittenPremiums.includes('test')) {
    return 0.01; // 1 cent for testing
  }

  if (membershipType === 'individual') {
    return 500.00; // €500
  }

  if (membershipType === 'corporate' && organizationType === 'MGA' && grossWrittenPremiums) {
    const priceMap: { [key: string]: number } = {
      '<10m': 900.00,     // €900
      '10-20m': 1100.00,  // €1,100
      '20-50m': 1300.00,  // €1,300
      '50-100m': 1500.00, // €1,500
      '100-500m': 1700.00, // €1,700
      '500m+': 2000.00,   // €2,000
    };
    return priceMap[grossWrittenPremiums] || 900.00;
  }

  // Other corporate types (carrier, provider)
  return 900.00; // €900
};

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    const { 
      organizationName, 
      organizationType, 
      membershipType,
      grossWrittenPremiums, 
      userEmail,
      userId,
      testPayment = false
    } = requestData;

    // Get access token
    const accessToken = await getPayPalAccessToken();
    
    // Calculate price
    const basePrice = testPayment 
      ? 0.01 
      : getMembershipPrice(membershipType, organizationType, grossWrittenPremiums);

    // Get environment
    const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
    const base = environment === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'EUR',
          value: basePrice.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: 'EUR',
              value: basePrice.toFixed(2)
            }
          }
        },
        items: [{
          name: `FASE ${membershipType === 'individual' ? 'Individual' : `${organizationType} Corporate`} Membership`,
          description: `Annual FASE membership for ${organizationName}`,
          unit_amount: {
            currency_code: 'EUR',
            value: basePrice.toFixed(2)
          },
          quantity: '1',
          category: 'DIGITAL_GOODS'
        }],
        custom_id: userId,
        description: `FASE Annual Membership - ${organizationName}`,
        invoice_id: `FASE-${userId}-${Date.now()}`
      }],
      application_context: {
        brand_name: 'Federation of European MGAs (FASE)',
        locale: 'en-US',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com'}/payment-success?provider=paypal`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com'}/register?cancelled=true`
      }
    };

    const orderResponse = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `FASE-${userId}-${Date.now()}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error('PayPal API error:', orderResponse.status, errorData);
      throw new Error(`PayPal order creation failed: ${orderResponse.status}`);
    }

    const order = await orderResponse.json();
    
    // Find the approval URL
    const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href;
    
    if (!approvalUrl) {
      throw new Error('No approval URL received from PayPal');
    }

    return NextResponse.json({ 
      orderId: order.id,
      approvalUrl,
      amount: basePrice
    });

  } catch (error: any) {
    console.error('PayPal order creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}