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

// Pricing calculation using the same logic as the registration form
const getMembershipPrice = (
  organizationType: string, 
  grossWrittenPremiums: string | undefined,
  hasOtherAssociations: boolean = false
): number => {
  // Admin test mode
  if (grossWrittenPremiums && grossWrittenPremiums.includes('test')) {
    return 0.50; // 50 cents for admin testing
  }

  // Use the same calculation logic as the registration form
  return calculateMembershipFee(
    organizationType as 'MGA' | 'carrier' | 'provider', 
    grossWrittenPremiums || '',
    'EUR', // Default currency for PayPal
    hasOtherAssociations
  );
};

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    const { 
      organizationName, 
      organizationType, 
      grossWrittenPremiums, 
      userEmail,
      userId,
      hasOtherAssociations = false,
      testPayment = false
    } = requestData;

    // Get access token
    const accessToken = await getPayPalAccessToken();
    
    // Calculate price (including any applicable discounts)
    const finalPrice = testPayment 
      ? 0.50 
      : getMembershipPrice(organizationType, grossWrittenPremiums, hasOtherAssociations);

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
          value: finalPrice.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: 'EUR',
              value: finalPrice.toFixed(2)
            }
          }
        },
        items: [{
          name: `FASE ${organizationType} Membership${hasOtherAssociations ? ' (20% Member Discount)' : ''}`,
          description: `Annual FASE membership for ${organizationName}${hasOtherAssociations ? ' - Discounted rate for MGA association member' : ''}`,
          unit_amount: {
            currency_code: 'EUR',
            value: finalPrice.toFixed(2)
          },
          quantity: '1',
          category: 'DIGITAL_GOODS'
        }],
        custom_id: userId,
        description: `FASE Annual Membership - ${organizationName}`,
        invoice_id: `FASE-${userId}-${Date.now()}`
      }],
      application_context: {
        brand_name: 'FASE',
        locale: 'en-US',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com'}/payment-succeeded`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com'}/payment-failed`
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
      amount: finalPrice
    });

  } catch (error: any) {
    console.error('PayPal order creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}