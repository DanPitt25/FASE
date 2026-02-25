/**
 * Stripe Shared Products Module
 * Manages reusable Stripe products instead of creating one per invoice
 */

import Stripe from 'stripe';
import { adminDb, FieldValue } from './firebase-admin';
import {
  MGA_MEMBERSHIP_TIERS,
  MEMBERSHIP_FLAT_RATES,
  normalizeOrgType,
} from './pricing';

// Stripe client singleton
let stripeClient: Stripe | null = null;

const getStripeClient = (): Stripe => {
  if (!stripeClient) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeClient = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripeClient;
};

// Product key format: FASE-MEMBERSHIP-{TYPE}-{TIER}
// Examples:
// - FASE-MEMBERSHIP-MGA-10-20m
// - FASE-MEMBERSHIP-CARRIER
// - FASE-MEMBERSHIP-PROVIDER

export interface StripeProductRecord {
  productKey: string;
  stripeProductId: string;
  stripePriceId: string;
  priceEurCents: number;
  recurring: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a product key based on organization type and tier
 */
export function getProductKey(
  organizationType: string,
  gwpBand?: string
): string {
  const orgType = normalizeOrgType(organizationType);

  if (orgType === 'mga' && gwpBand) {
    // Sanitize GWP band for use in key (replace special chars)
    const sanitizedBand = gwpBand.replace(/[<>]/g, '').replace(/\+/g, 'plus');
    return `FASE-MEMBERSHIP-MGA-${sanitizedBand}`;
  }

  return `FASE-MEMBERSHIP-${orgType.toUpperCase()}`;
}

/**
 * Get price in cents for a product key
 */
export function getPriceForProductKey(productKey: string): number {
  // Parse the product key
  const parts = productKey.split('-');

  if (parts[2] === 'MGA' && parts.length > 3) {
    // MGA tier - reconstruct the band
    const bandPart = parts.slice(3).join('-');
    // Convert back from sanitized format
    let band = bandPart;
    if (band === '10m') band = '<10m';
    else if (band.endsWith('plus')) band = band.replace('plus', '+');

    return (MGA_MEMBERSHIP_TIERS[band] || MGA_MEMBERSHIP_TIERS['<10m']) * 100;
  }

  // Carrier or Provider
  const orgType = parts[2]?.toLowerCase();
  if (orgType === 'carrier') {
    return MEMBERSHIP_FLAT_RATES.carrier * 100;
  }
  if (orgType === 'provider') {
    return MEMBERSHIP_FLAT_RATES.provider * 100;
  }

  // Default to lowest MGA tier
  return MGA_MEMBERSHIP_TIERS['<10m'] * 100;
}

/**
 * Get human-readable product name
 */
export function getProductName(productKey: string): string {
  const parts = productKey.split('-');

  if (parts[2] === 'MGA' && parts.length > 3) {
    const bandPart = parts.slice(3).join('-');
    let band = bandPart;
    if (band === '10m') band = '<€10m';
    else if (band.endsWith('plus')) band = band.replace('plus', '+');
    else band = `€${band}`;

    return `FASE MGA Corporate Membership (${band} GWP)`;
  }

  if (parts[2] === 'CARRIER') {
    return 'FASE Carrier/Broker Corporate Membership';
  }

  if (parts[2] === 'PROVIDER') {
    return 'FASE Service Provider Corporate Membership';
  }

  return 'FASE Corporate Membership';
}

/**
 * Get or create a Stripe product for the given organization type/tier
 * Returns the product and price IDs
 */
export async function getOrCreateStripeProduct(
  organizationType: string,
  gwpBand?: string
): Promise<{
  productId: string;
  priceId: string;
  priceEurCents: number;
  isNew: boolean;
}> {
  const productKey = getProductKey(organizationType, gwpBand);
  const priceEurCents = getPriceForProductKey(productKey);

  // Check Firestore for existing product
  const productsRef = adminDb.collection('stripe_products');
  const existingDoc = await productsRef.doc(productKey).get();

  if (existingDoc.exists) {
    const data = existingDoc.data() as StripeProductRecord;

    // Verify the product still exists in Stripe
    try {
      const stripe = getStripeClient();
      await stripe.products.retrieve(data.stripeProductId);
      await stripe.prices.retrieve(data.stripePriceId);

      // Product exists, return it
      return {
        productId: data.stripeProductId,
        priceId: data.stripePriceId,
        priceEurCents: data.priceEurCents,
        isNew: false,
      };
    } catch (err) {
      // Product was deleted in Stripe, remove from Firestore and recreate
      console.log(`Product ${productKey} not found in Stripe, recreating...`);
      await productsRef.doc(productKey).delete();
    }
  }

  // Create new product in Stripe
  const stripe = getStripeClient();
  const productName = getProductName(productKey);

  const product = await stripe.products.create({
    name: productName,
    description: `Annual corporate membership fee`,
    metadata: {
      product_key: productKey,
      organization_type: normalizeOrgType(organizationType),
      gwp_band: gwpBand || '',
    },
  });

  // Create recurring price for the product
  const price = await stripe.prices.create({
    currency: 'eur',
    product: product.id,
    unit_amount: priceEurCents,
    recurring: {
      interval: 'year',
    },
  });

  // Store in Firestore
  await productsRef.doc(productKey).set({
    productKey,
    stripeProductId: product.id,
    stripePriceId: price.id,
    priceEurCents,
    recurring: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`Created new Stripe product: ${productKey} (${product.id})`);

  return {
    productId: product.id,
    priceId: price.id,
    priceEurCents,
    isNew: true,
  };
}

/**
 * Create a one-time price for a custom amount (e.g., discounted invoices)
 * Uses an existing product but creates a new one-time price
 */
export async function createCustomPrice(
  organizationType: string,
  amountEurCents: number,
  gwpBand?: string,
  recurring: boolean = true
): Promise<{
  productId: string;
  priceId: string;
  priceEurCents: number;
}> {
  // Get or create the base product
  const { productId } = await getOrCreateStripeProduct(organizationType, gwpBand);

  // Create a custom price for this specific amount
  const stripe = getStripeClient();

  const price = await stripe.prices.create({
    currency: 'eur',
    product: productId,
    unit_amount: amountEurCents,
    ...(recurring
      ? {
          recurring: {
            interval: 'year',
          },
        }
      : {}),
  });

  return {
    productId,
    priceId: price.id,
    priceEurCents: amountEurCents,
  };
}

/**
 * List all shared products from Firestore
 */
export async function listSharedProducts(): Promise<StripeProductRecord[]> {
  const snapshot = await adminDb.collection('stripe_products').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      productKey: data.productKey,
      stripeProductId: data.stripeProductId,
      stripePriceId: data.stripePriceId,
      priceEurCents: data.priceEurCents,
      recurring: data.recurring,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  });
}

/**
 * Check if shared products are set up
 */
export async function hasSharedProducts(): Promise<boolean> {
  const snapshot = await adminDb
    .collection('stripe_products')
    .limit(1)
    .get();
  return !snapshot.empty;
}

/**
 * Initialize all standard membership products
 * Call this once to pre-create all products
 */
export async function initializeAllProducts(): Promise<{
  created: string[];
  existing: string[];
}> {
  const created: string[] = [];
  const existing: string[] = [];

  // MGA tiers
  const mgaTiers = Object.keys(MGA_MEMBERSHIP_TIERS);
  for (const tier of mgaTiers) {
    const result = await getOrCreateStripeProduct('mga', tier);
    const key = getProductKey('mga', tier);
    if (result.isNew) {
      created.push(key);
    } else {
      existing.push(key);
    }
  }

  // Carrier
  const carrierResult = await getOrCreateStripeProduct('carrier');
  const carrierKey = getProductKey('carrier');
  if (carrierResult.isNew) {
    created.push(carrierKey);
  } else {
    existing.push(carrierKey);
  }

  // Provider
  const providerResult = await getOrCreateStripeProduct('provider');
  const providerKey = getProductKey('provider');
  if (providerResult.isNew) {
    created.push(providerKey);
  } else {
    existing.push(providerKey);
  }

  return { created, existing };
}
