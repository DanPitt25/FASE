/**
 * Payment Matching Utility
 *
 * Analyzes payment amounts and suggests what they might correspond to:
 * - FASE Membership dues (based on org type, GWP tier, discounts)
 * - MGA Rendezvous tickets (based on ticket type and count)
 */

import {
  MGA_MEMBERSHIP_TIERS,
  MEMBERSHIP_FLAT_RATES,
  MULTI_ASSOCIATION_DISCOUNT,
  INSURTECH_UK_DISCOUNT,
  RENDEZVOUS_FULL_PRICES,
  RENDEZVOUS_MEMBER_PRICES,
} from './pricing';

// =============================================================================
// TYPES
// =============================================================================

export interface PaymentSuggestion {
  type: 'membership' | 'rendezvous';
  description: string;
  amount: number;
  details?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface PaymentMatch {
  confidence: 'exact' | 'likely' | 'unknown';
  suggestions: PaymentSuggestion[];
}

// =============================================================================
// PRE-COMPUTED PRICE TABLES
// =============================================================================

interface MembershipPrice {
  amount: number;
  orgType: string;
  gwpBand?: string;
  discount: number;
  discountType: string;
}

interface RendezvousPrice {
  unitPrice: number;
  orgType: string;
  isMember: boolean;
}

// Generate all possible membership prices
function generateMembershipPrices(): MembershipPrice[] {
  const prices: MembershipPrice[] = [];
  const discountVariants = [
    { discount: 0, type: 'No discount' },
    { discount: MULTI_ASSOCIATION_DISCOUNT, type: '20% multi-association discount' },
    { discount: MULTI_ASSOCIATION_DISCOUNT + INSURTECH_UK_DISCOUNT, type: '30% combined discount' },
  ];

  // MGA tiers
  for (const [band, basePrice] of Object.entries(MGA_MEMBERSHIP_TIERS)) {
    for (const { discount, type } of discountVariants) {
      const amount = Math.round(basePrice * (1 - discount));
      prices.push({
        amount,
        orgType: 'MGA',
        gwpBand: band,
        discount,
        discountType: type,
      });
    }
  }

  // Carrier/Broker and Service Provider
  const orgTypes: Array<{ key: string; label: string }> = [
    { key: 'carrier', label: 'Carrier/Broker' },
    { key: 'provider', label: 'Service Provider' },
  ];

  for (const { key, label } of orgTypes) {
    const basePrice = MEMBERSHIP_FLAT_RATES[key];
    for (const { discount, type } of discountVariants) {
      const amount = Math.round(basePrice * (1 - discount));
      prices.push({
        amount,
        orgType: label,
        discount,
        discountType: type,
      });
    }
  }

  return prices;
}

// Generate rendezvous unit prices
function generateRendezvousPrices(): RendezvousPrice[] {
  const prices: RendezvousPrice[] = [];
  const orgTypes: Array<{ key: string; label: string }> = [
    { key: 'mga', label: 'MGA' },
    { key: 'carrier', label: 'Carrier/Broker' },
    { key: 'provider', label: 'Service Provider' },
  ];

  for (const { key, label } of orgTypes) {
    // Non-member price
    prices.push({
      unitPrice: RENDEZVOUS_FULL_PRICES[key],
      orgType: label,
      isMember: false,
    });
    // Member price
    prices.push({
      unitPrice: RENDEZVOUS_MEMBER_PRICES[key],
      orgType: label,
      isMember: true,
    });
  }

  return prices;
}

// Pre-compute on module load
const MEMBERSHIP_PRICES = generateMembershipPrices();
const RENDEZVOUS_PRICES = generateRendezvousPrices();

// Create a map of amount -> membership descriptions for fast lookup
const MEMBERSHIP_AMOUNT_MAP = new Map<number, MembershipPrice[]>();
for (const price of MEMBERSHIP_PRICES) {
  const existing = MEMBERSHIP_AMOUNT_MAP.get(price.amount) || [];
  existing.push(price);
  MEMBERSHIP_AMOUNT_MAP.set(price.amount, existing);
}

// =============================================================================
// MATCHING LOGIC
// =============================================================================

/**
 * Match a payment amount to possible FASE products
 *
 * @param amountEur - Payment amount in EUR
 * @returns Match result with suggestions
 */
export function matchPayment(amountEur: number): PaymentMatch {
  const suggestions: PaymentSuggestion[] = [];

  // Round to handle floating point issues
  const amount = Math.round(amountEur * 100) / 100;

  // 1. Check exact membership matches
  const membershipMatches = MEMBERSHIP_AMOUNT_MAP.get(amount);
  if (membershipMatches) {
    for (const match of membershipMatches) {
      const gwpLabel = match.gwpBand ? ` (${match.gwpBand} GWP)` : '';
      suggestions.push({
        type: 'membership',
        description: `${match.orgType} Membership${gwpLabel}`,
        amount: match.amount,
        details: match.discount > 0 ? match.discountType : undefined,
        lineItems: [{
          description: `FASE Annual Membership - ${match.orgType}${gwpLabel}`,
          quantity: 1,
          unitPrice: match.amount,
        }],
      });
    }
  }

  // 2. Check rendezvous ticket multiples
  for (const rdv of RENDEZVOUS_PRICES) {
    if (amount >= rdv.unitPrice && amount % rdv.unitPrice === 0) {
      const ticketCount = amount / rdv.unitPrice;
      // Reasonable ticket count (1-50)
      if (ticketCount >= 1 && ticketCount <= 50 && Number.isInteger(ticketCount)) {
        const memberLabel = rdv.isMember ? 'FASE member' : 'non-member';
        suggestions.push({
          type: 'rendezvous',
          description: `${ticketCount}× MGA Rendezvous (${rdv.orgType}, ${memberLabel})`,
          amount,
          details: `€${rdv.unitPrice} per ticket`,
          lineItems: [{
            description: `MGA Rendezvous 2026 - ${rdv.orgType} Pass`,
            quantity: ticketCount,
            unitPrice: rdv.unitPrice,
          }],
        });
      }
    }
  }

  // 3. Determine confidence level
  if (suggestions.length > 0) {
    return {
      confidence: 'exact',
      suggestions,
    };
  }

  // 4. Check for "likely" matches (within 5% of a known price)
  const likelySuggestions: PaymentSuggestion[] = [];
  const tolerance = 0.05; // 5%

  for (const [knownAmount, matches] of MEMBERSHIP_AMOUNT_MAP.entries()) {
    const diff = Math.abs(amount - knownAmount) / knownAmount;
    if (diff <= tolerance && diff > 0) {
      const match = matches[0]; // Just use first match for likely
      const gwpLabel = match.gwpBand ? ` (${match.gwpBand} GWP)` : '';
      likelySuggestions.push({
        type: 'membership',
        description: `${match.orgType} Membership${gwpLabel}`,
        amount: knownAmount,
        details: `Expected €${knownAmount.toLocaleString()}, received €${amount.toLocaleString()}`,
      });
    }
  }

  if (likelySuggestions.length > 0) {
    return {
      confidence: 'likely',
      suggestions: likelySuggestions,
    };
  }

  // 5. No match found
  return {
    confidence: 'unknown',
    suggestions: [],
  };
}

/**
 * Get all possible membership amounts (for reference/debugging)
 */
export function getAllMembershipAmounts(): number[] {
  return Array.from(new Set(MEMBERSHIP_PRICES.map(p => p.amount))).sort((a, b) => a - b);
}

/**
 * Get all rendezvous unit prices (for reference/debugging)
 */
export function getAllRendezvousUnitPrices(): number[] {
  return Array.from(new Set(RENDEZVOUS_PRICES.map(p => p.unitPrice))).sort((a, b) => a - b);
}

/**
 * Format a payment match for display
 */
export function formatMatchSummary(match: PaymentMatch): string {
  if (match.confidence === 'unknown') {
    return 'Unknown payment type';
  }

  const types = match.suggestions.map(s => s.type);
  const hasMembership = types.includes('membership');
  const hasRendezvous = types.includes('rendezvous');

  if (hasMembership && hasRendezvous) {
    return 'Membership or Rendezvous';
  } else if (hasMembership) {
    return 'Membership';
  } else if (hasRendezvous) {
    return 'Rendezvous';
  }

  return 'Unknown';
}
