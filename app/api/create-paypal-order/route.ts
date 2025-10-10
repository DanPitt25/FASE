import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_BASE_URL = process.env.PAYPAL_ENVIRONMENT === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Pricing mapping based on premium brackets
const getPriceForPremiumBracket = (bracket: string): number => {
  const priceMap: { [key: string]: number } = {
    '<10m': 900, // €900
    '10-20m': 1500, // €1,500
    '20-50m': 2000, // €2,000
    '50-100m': 2800, // €2,800
    '100-500m': 4200, // €4,200
    '500m+': 6400, // €6,400
  };
  return priceMap[bracket] || 900; // Default to €900
};

// Get PayPal access token
async function getAccessToken() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured');
  }

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    console.log('PayPal order request data:', requestData);
    
    const { 
      organizationName, 
      organizationType, 
      membershipType,
      grossWrittenPremiums, 
      userEmail,
      userId 
    } = requestData;

    // Validate required fields
    if (!organizationName || !organizationType) {
      return NextResponse.json(
        { error: 'Organization name and type are required' },
        { status: 400 }
      );
    }

    if (membershipType === 'corporate' && organizationType === 'MGA' && !grossWrittenPremiums) {
      return NextResponse.json(
        { error: 'Gross written premiums required for MGA subscriptions' },
        { status: 400 }
      );
    }

    // Calculate price based on membership type and premium bracket
    let priceInEuros = 900; // Default base price
    
    if (membershipType === 'individual') {
      priceInEuros = 500; // €500 for individual memberships
    } else if (organizationType === 'MGA') {
      priceInEuros = getPriceForPremiumBracket(grossWrittenPremiums);
    }

    // Get the base URL for redirects
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    const accessToken = await getAccessToken();

    // Create PayPal order
    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: `FASE_${userId || 'GUEST'}_${Date.now()}`,
            description: membershipType === 'individual' 
              ? `FASE Individual Membership - ${organizationName}`
              : organizationType === 'MGA' 
                ? `FASE MGA Membership - ${organizationName} (${grossWrittenPremiums} bracket)`
                : `FASE Corporate Membership - ${organizationName}`,
            amount: {
              currency_code: 'EUR',
              value: priceInEuros.toString(),
            },
            custom_id: JSON.stringify({
              organization_name: organizationName,
              organization_type: organizationType,
              membership_type: membershipType,
              user_id: userId || '',
              user_email: userEmail || '',
              gross_written_premiums: grossWrittenPremiums || '',
            }),
          },
        ],
        application_context: {
          brand_name: 'FASE - Federation of European MGAs',
          locale: 'en-US',
          landing_page: 'BILLING',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: `${baseUrl}/api/paypal-success`,
          cancel_url: `${baseUrl}/member-portal/apply?canceled=true`,
        },
      }),
    });

    const orderData = await orderResponse.json();
    
    if (!orderResponse.ok) {
      console.error('PayPal order creation failed:', orderData);
      return NextResponse.json(
        { error: 'Failed to create PayPal order', details: orderData },
        { status: 500 }
      );
    }

    // Find approval URL
    const approvalUrl = orderData.links?.find((link: any) => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      return NextResponse.json(
        { error: 'No approval URL found in PayPal response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      id: orderData.id, 
      approval_url: approvalUrl 
    });

  } catch (error: any) {
    console.error('Error creating PayPal order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create PayPal order',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}