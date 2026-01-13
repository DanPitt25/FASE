import Stripe from 'stripe';

// Singleton Stripe instance
let stripeInstance: Stripe | null = null;

/**
 * Get or initialize Stripe instance
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    stripeInstance = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripeInstance;
}

/**
 * Create a Stripe Payment Link for membership payment
 */
export async function createMembershipPaymentLink(options: {
  amount: number;
  organizationName: string;
  organizationType: string;
  invoiceNumber: string;
  userId?: string;
  userEmail: string;
  baseUrl: string;
}): Promise<{ paymentLink: Stripe.PaymentLink; stripeLink: string }> {
  const stripe = getStripe();
  const { amount, organizationName, organizationType, invoiceNumber, userId, userEmail, baseUrl } = options;

  // Create product for Payment Link
  const product = await stripe.products.create({
    name: 'FASE Annual Membership',
    description: `Annual membership for ${organizationName}`,
    metadata: {
      invoice_number: invoiceNumber,
      organization_name: organizationName,
      organization_type: organizationType,
    }
  });

  // Create price for the product (annual subscription)
  const price = await stripe.prices.create({
    currency: 'eur',
    product: product.id,
    unit_amount: amount * 100, // Convert euros to cents
    recurring: {
      interval: 'year',
    }
  });

  // Create Payment Link
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price: price.id,
        quantity: 1,
      }
    ],
    metadata: {
      invoice_number: invoiceNumber,
      organization_name: organizationName,
      organization_type: organizationType,
      user_id: userId || '',
      user_email: userEmail,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `${baseUrl}/payment-succeeded?payment_link_id={PAYMENT_LINK_ID}&invoice=${invoiceNumber}`,
      }
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto'
  });

  return { paymentLink, stripeLink: paymentLink.url };
}
