/**
 * Shared pricing constants and calculations for FASE membership and MGA Rendezvous
 * This is the SINGLE SOURCE OF TRUTH for all pricing logic
 * Used by both client-side forms and server-side invoice generation
 */

// =============================================================================
// MEMBERSHIP PRICING
// =============================================================================

// MGA membership tiers based on GWP (Gross Written Premiums) in EUR
export const MGA_MEMBERSHIP_TIERS: Record<string, number> = {
  '<10m': 900,
  '10-20m': 1500,
  '20-50m': 2200,
  '50-100m': 2800,
  '100-500m': 4200,
  '500m+': 7000,
};

// Flat rates for other organization types
export const MEMBERSHIP_FLAT_RATES: Record<string, number> = {
  carrier: 4000,
  provider: 5000,
};

// Multi-association discount (20% off)
export const MULTI_ASSOCIATION_DISCOUNT = 0.20;

// =============================================================================
// MGA RENDEZVOUS PRICING
// =============================================================================

// Full prices (non-members)
export const RENDEZVOUS_FULL_PRICES: Record<string, number> = {
  mga: 800,
  MGA: 800,
  carrier: 1100,
  carrier_broker: 1100,
  provider: 1400,
  service_provider: 1400,
};

// Member prices (50% discount)
export const RENDEZVOUS_MEMBER_PRICES: Record<string, number> = {
  mga: 400,
  MGA: 400,
  carrier: 550,
  carrier_broker: 550,
  provider: 700,
  service_provider: 700,
};

// FASE member discount for rendezvous (50%)
export const RENDEZVOUS_MEMBER_DISCOUNT = 0.50;

// ASASE members get complimentary passes (100% discount)
export const RENDEZVOUS_ASASE_DISCOUNT = 1.0;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize organization type to canonical form
 */
export function normalizeOrgType(orgType: string): 'mga' | 'carrier' | 'provider' {
  const lower = orgType.toLowerCase();
  if (lower === 'mga') return 'mga';
  if (lower === 'carrier' || lower === 'carrier_broker') return 'carrier';
  if (lower === 'provider' || lower === 'service_provider') return 'provider';
  return 'mga'; // default
}

/**
 * Get GWP band from EUR value
 */
export function getGWPBand(eurValue: number): string {
  if (eurValue < 10_000_000) return '<10m';
  if (eurValue < 20_000_000) return '10-20m';
  if (eurValue < 50_000_000) return '20-50m';
  if (eurValue < 100_000_000) return '50-100m';
  if (eurValue < 500_000_000) return '100-500m';
  return '500m+';
}

/**
 * Calculate membership fee for an organization
 */
export function calculateMembershipFee(
  organizationType: string,
  gwpBand?: string,
  hasOtherAssociations: boolean = false
): number {
  const orgType = normalizeOrgType(organizationType);

  let baseFee: number;

  if (orgType === 'mga') {
    baseFee = MGA_MEMBERSHIP_TIERS[gwpBand || '<10m'] || MGA_MEMBERSHIP_TIERS['<10m'];
  } else {
    baseFee = MEMBERSHIP_FLAT_RATES[orgType] || 900;
  }

  // Apply multi-association discount
  if (hasOtherAssociations) {
    baseFee = Math.round(baseFee * (1 - MULTI_ASSOCIATION_DISCOUNT));
  }

  return baseFee;
}

/**
 * Calculate rendezvous pass price per ticket
 */
export function calculateRendezvousUnitPrice(
  organizationType: string,
  isFaseMember: boolean,
  isAsaseMember: boolean = false
): number {
  // ASASE members get complimentary passes
  if (isAsaseMember) {
    return 0;
  }

  const orgType = normalizeOrgType(organizationType);

  // FASE members get member pricing
  if (isFaseMember) {
    return RENDEZVOUS_MEMBER_PRICES[orgType] || RENDEZVOUS_MEMBER_PRICES['mga'];
  }

  // Non-members pay full price
  return RENDEZVOUS_FULL_PRICES[orgType] || RENDEZVOUS_FULL_PRICES['mga'];
}

/**
 * Calculate total rendezvous pass cost (no VAT - invoiced separately)
 */
export function calculateRendezvousTotal(
  organizationType: string,
  passCount: number,
  isFaseMember: boolean,
  isAsaseMember: boolean = false
): { unitPrice: number; subtotal: number; discount: number } {
  const unitPrice = calculateRendezvousUnitPrice(organizationType, isFaseMember, isAsaseMember);
  const subtotal = unitPrice * passCount;

  let discount = 0;
  if (isAsaseMember) {
    discount = 100;
  } else if (isFaseMember) {
    discount = 50;
  }

  return { unitPrice, subtotal, discount };
}

/**
 * Get display label for organization type
 */
export function getOrgTypeLabel(organizationType: string): string {
  const orgType = normalizeOrgType(organizationType);
  switch (orgType) {
    case 'mga': return 'MGA';
    case 'carrier': return 'Carrier/Broker';
    case 'provider': return 'Service Provider';
    default: return organizationType;
  }
}
