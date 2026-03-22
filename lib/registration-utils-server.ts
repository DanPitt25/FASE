// Server-side version of registration utils (no 'use client')

// Convert currency to EUR using live rates
export async function fetchExchangeRateToEUR(fromCurrency: string): Promise<number> {
  if (fromCurrency === 'EUR') return 1;

  const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.status}`);
  }
  const data = await response.json();
  const rate = data.rates[fromCurrency];
  if (!rate) {
    throw new Error(`No exchange rate found for currency: ${fromCurrency}`);
  }
  // rate is EUR->fromCurrency, we need fromCurrency->EUR
  return 1 / rate;
}

// Convert currency to EUR (async version with live rates)
export async function convertToEUR(amount: number, fromCurrency: string): Promise<number> {
  const rate = await fetchExchangeRateToEUR(fromCurrency);
  return amount * rate;
}

// Get GWP band for pricing
export const getGWPBand = (eurValue: number): '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+' => {
  if (eurValue < 10000000) return '<10m';
  if (eurValue < 20000000) return '10-20m';
  if (eurValue < 50000000) return '20-50m';
  if (eurValue < 100000000) return '50-100m';
  if (eurValue < 500000000) return '100-500m';
  return '500m+';
};

// Approximate rates for fee calculation (server-side sync version)
const approxRates: Record<string, number> = {
  'USD': 0.85,
  'GBP': 1.14,
  'EUR': 1.0
};

// Calculate membership fee (sync version for email notification)
export function calculateMembershipFee(
  organizationType: string,
  gwpValue: number,
  gwpCurrency: string,
  hasOtherAssociations: boolean
): number {
  let baseFee: number;

  if (organizationType === 'MGA') {
    const eurValue = gwpValue * (approxRates[gwpCurrency] || 1);
    if (eurValue < 10000000) baseFee = 900;
    else if (eurValue < 20000000) baseFee = 1500;
    else if (eurValue < 50000000) baseFee = 2200;
    else if (eurValue < 100000000) baseFee = 2800;
    else if (eurValue < 500000000) baseFee = 4200;
    else baseFee = 7000;
  } else if (organizationType === 'carrier') {
    baseFee = 4000;
  } else {
    baseFee = 5000; // provider
  }

  return hasOtherAssociations ? Math.round(baseFee * 0.8) : baseFee;
}