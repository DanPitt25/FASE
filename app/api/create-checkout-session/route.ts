import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

let stripe: Stripe | null = null;

// Initialize Stripe at runtime
const initializeStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripe;
};

// Pricing mapping based on premium brackets
const getPriceForPremiumBracket = (bracket: string): number => {
  const priceMap: { [key: string]: number } = {
    '<10m': 90000, // €900 in cents
    '10-20m': 150000, // €1,500 in cents
    '20-50m': 200000, // €2,000 in cents
    '50-100m': 280000, // €2,800 in cents
    '100-500m': 420000, // €4,200 in cents
    '500m+': 640000, // €6,400 in cents
  };
  return priceMap[bracket] || 90000; // Default to €900
};

export async function POST(request: NextRequest) {
  console.log('=== Stripe Checkout Session - Force Fresh Deploy with Env Vars ===');
  console.log('- STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
  console.log('- STRIPE_SECRET_KEY prefix:', process.env.STRIPE_SECRET_KEY?.substring(0, 10));
  console.log('- Environment vars configured!');
  
  try {
    // Initialize Stripe at runtime
    const stripeInstance = initializeStripe();
    console.log('- Stripe instance created:', !!stripeInstance);
    
    // Check if Stripe is available
    if (!stripeInstance) {
      console.error('Stripe initialization failed - returning 503');
      console.error('Environment check:');
      console.error('- STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
      console.error('- All env keys:', Object.keys(process.env).filter(k => k.includes('STRIPE')));
      return NextResponse.json(
        { 
          error: 'Payment processing not available',
          debug: {
            hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
            keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10),
            allStripeKeys: Object.keys(process.env).filter(k => k.includes('STRIPE')),
            nodeEnv: process.env.NODE_ENV,
            isVercel: !!process.env.VERCEL
          }
        },
        { status: 503 }
      );
    }
    
    const requestData = await request.json();
    console.log('Request data received:', {
      organizationName: requestData.organizationName,
      organizationType: requestData.organizationType,
      membershipType: requestData.membershipType,
      userId: requestData.userId
    });
    
    const { 
      organizationName, 
      organizationType, 
      membershipType,
      grossWrittenPremiums, 
      userEmail,
      userId 
    } = requestData;

    // Validate required fields
    if (!organizationName) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // For corporate memberships, organizationType is required
    if (membershipType === 'corporate' && !organizationType) {
      return NextResponse.json(
        { error: 'Organization type is required for corporate memberships' },
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
    let priceInCents = 90000; // Default base price
    
    if (membershipType === 'individual') {
      priceInCents = 50000; // €500 for individual memberships
    } else if (organizationType === 'MGA') {
      priceInCents = getPriceForPremiumBracket(grossWrittenPremiums);
    }

    // Get the base URL for redirects
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    console.log('Creating checkout session with:', {
      organizationName,
      organizationType,
      grossWrittenPremiums,
      priceInCents,
      userEmail,
      userId
    });

    // Create Stripe checkout session
    const session = await stripeInstance.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `FASE ${membershipType === 'individual' ? 'Individual' : organizationType} Membership`,
              description: membershipType === 'individual' 
                ? `Annual individual membership for ${organizationName}`
                : organizationType === 'MGA' 
                  ? `Annual membership for ${organizationName} (${grossWrittenPremiums} premium bracket)`
                  : `Annual corporate membership for ${organizationName}`,
            },
            recurring: {
              interval: 'year',
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        organization_name: organizationName,
        organization_type: organizationType || 'individual',
        membership_type: membershipType,
        user_id: userId || '',
        user_email: userEmail || '',
        ...(membershipType === 'corporate' && organizationType === 'MGA' && { gross_written_premiums: grossWrittenPremiums })
      },
      success_url: `${baseUrl}/member-portal?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${baseUrl}/member-portal?canceled=true`,
      customer_email: userEmail || undefined,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });

  } catch (error: any) {
    console.error('=== Stripe Checkout Session Error ===');
    console.error('Error creating checkout session:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error.message || 'Unknown error',
        type: error.type || 'unknown',
        code: error.code || 'unknown'
      },
      { status: 500 }
    );
  }
}