import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

let stripe: Stripe | null = null;

// Initialize Stripe at runtime
const initializeStripe = () => {
  if (!stripe) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    stripe = new Stripe(stripeKey, {
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
  try {
    // Initialize Stripe at runtime
    const stripeInstance = initializeStripe();
    
    const requestData = await request.json();
    
    const { 
      organizationName, 
      organizationType, 
      grossWrittenPremiums, 
      userEmail,
      userId,
      invoiceNumber,
      amount
    } = requestData;

    // Validate required fields
    if (!organizationName) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    // OrganizationType is required for all memberships
    if (!organizationType) {
      return NextResponse.json(
        { error: 'Organization type is required' },
        { status: 400 }
      );
    }

    if (organizationType === 'MGA' && !grossWrittenPremiums) {
      return NextResponse.json(
        { error: 'Gross written premiums required for MGA subscriptions' },
        { status: 400 }
      );
    }

    // Admin test payment override
    const isTestPayment = requestData.testPayment === true;
    
    // Calculate price based on membership type and premium bracket
    let priceInCents = 90000; // Default base price
    
    if (isTestPayment) {
      priceInCents = 50; // 50 cents for admin testing
    } else if (organizationType === 'MGA') {
      priceInCents = getPriceForPremiumBracket(grossWrittenPremiums);
    }

    // Override with custom amount if provided
    if (amount && !isTestPayment) {
      priceInCents = Math.round(amount * 100); // Convert to cents
    }

    // Get the base URL for redirects
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Create product first (required for Payment Links)
    const product = await stripeInstance.products.create({
      name: isTestPayment 
        ? `[ADMIN TEST] FASE ${organizationType} Corporate Membership`
        : `FASE ${organizationType} Corporate Membership`,
      description: isTestPayment
        ? `ADMIN TEST PAYMENT - 50 cent test charge for ${organizationName}`
        : organizationType === 'MGA' 
            ? `Annual membership for ${organizationName} (${grossWrittenPremiums} premium bracket)`
            : `Annual corporate membership for ${organizationName}`,
      metadata: {
        organization_name: organizationName,
        organization_type: organizationType,
        invoice_number: invoiceNumber || '',
        ...(organizationType === 'MGA' && { gross_written_premiums: grossWrittenPremiums })
      }
    });

    // Create price for the product
    const price = await stripeInstance.prices.create({
      currency: 'eur',
      product: product.id,
      unit_amount: priceInCents,
      ...(isTestPayment ? {} : {
        recurring: {
          interval: 'year',
        }
      })
    });

    // Create Payment Link (persistent, no expiration)
    const paymentLink = await stripeInstance.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        }
      ],
      metadata: {
        organization_name: organizationName,
        organization_type: organizationType,
        user_id: userId || '',
        user_email: userEmail || '',
        test_payment: isTestPayment ? 'true' : 'false',
        invoice_number: invoiceNumber || '',
        ...(organizationType === 'MGA' && { gross_written_premiums: grossWrittenPremiums })
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${baseUrl}/member-portal?payment_link_success=true&payment_link_id={PAYMENT_LINK_ID}`,
        }
      },
      // Payment Links don't expire by default - they remain active indefinitely
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      ...(userEmail && {
        custom_fields: [
          {
            key: 'customer_email',
            label: { type: 'builtin', builtin: 'order.email' },
            type: 'text'
          }
        ]
      })
    });

    return NextResponse.json({ 
      paymentLinkId: paymentLink.id, 
      url: paymentLink.url,
      productId: product.id,
      priceId: price.id,
      amount: priceInCents,
      currency: 'eur',
      persistent: true // Flag to indicate this link doesn't expire
    });

  } catch (error: any) {
    console.error('Error creating payment link:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create payment link',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}