import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getOrCreateStripeProduct,
  createCustomPrice,
  getProductKey,
  getPriceForProductKey,
} from '../../../lib/stripe-products';

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
      invoiceId,
      accountId,
      amount,
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

    // Get the base URL for redirects
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    let productId: string;
    let priceId: string;
    let priceInCents: number;

    if (isTestPayment) {
      // For test payments, create a one-off product (don't pollute shared products)
      const testProduct = await stripeInstance.products.create({
        name: `[ADMIN TEST] FASE ${organizationType} Corporate Membership`,
        description: `ADMIN TEST PAYMENT - 50 cent test charge for ${organizationName}`,
        metadata: {
          organization_name: organizationName,
          organization_type: organizationType,
          test_payment: 'true',
        },
      });

      const testPrice = await stripeInstance.prices.create({
        currency: 'eur',
        product: testProduct.id,
        unit_amount: 50, // 50 cents
      });

      productId = testProduct.id;
      priceId = testPrice.id;
      priceInCents = 50;
    } else if (amount) {
      // Custom amount provided - create a custom price on the shared product
      const standardPrice = getPriceForProductKey(
        getProductKey(organizationType, grossWrittenPremiums)
      );
      const customAmountCents = Math.round(amount * 100);

      if (customAmountCents !== standardPrice) {
        // Non-standard amount - create custom price
        const customResult = await createCustomPrice(
          organizationType,
          customAmountCents,
          grossWrittenPremiums,
          true // recurring
        );
        productId = customResult.productId;
        priceId = customResult.priceId;
        priceInCents = customAmountCents;
      } else {
        // Standard amount - use shared product
        const sharedResult = await getOrCreateStripeProduct(
          organizationType,
          grossWrittenPremiums
        );
        productId = sharedResult.productId;
        priceId = sharedResult.priceId;
        priceInCents = sharedResult.priceEurCents;
      }
    } else {
      // Use shared product with standard pricing
      const sharedResult = await getOrCreateStripeProduct(
        organizationType,
        grossWrittenPremiums
      );
      productId = sharedResult.productId;
      priceId = sharedResult.priceId;
      priceInCents = sharedResult.priceEurCents;
    }

    // Create Payment Link (persistent, no expiration)
    const paymentLink = await stripeInstance.paymentLinks.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        organization_name: organizationName,
        organization_type: organizationType,
        user_id: userId || '',
        user_email: userEmail || '',
        account_id: accountId || '',
        test_payment: isTestPayment ? 'true' : 'false',
        invoice_number: invoiceNumber || '',
        invoice_id: invoiceId || '',
        ...(organizationType === 'MGA' && {
          gross_written_premiums: grossWrittenPremiums,
        }),
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${baseUrl}/member-portal?payment_link_success=true&payment_link_id={PAYMENT_LINK_ID}`,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({
      paymentLinkId: paymentLink.id,
      url: paymentLink.url,
      productId,
      priceId,
      amount: priceInCents,
      currency: 'eur',
      persistent: true,
      usedSharedProduct: !isTestPayment,
    });
  } catch (error: any) {
    console.error('Error creating payment link:', error);

    return NextResponse.json(
      {
        error: 'Failed to create payment link',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
