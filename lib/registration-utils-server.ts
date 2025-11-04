// Server-side version of registration utils (no 'use client')

// Currency conversion rates (base: EUR)
const exchangeRates = {
  'USD': 0.92,
  'GBP': 1.17,
  'EUR': 1.0
};

// Convert currency to EUR
export const convertToEUR = (amount: number, fromCurrency: string): number => {
  const rate = exchangeRates[fromCurrency as keyof typeof exchangeRates] || 1;
  return amount * rate;
};

// Get GWP band for pricing
export const getGWPBand = (eurValue: number): '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+' => {
  if (eurValue < 10000000) return '<10m';
  if (eurValue < 20000000) return '10-20m';
  if (eurValue < 50000000) return '20-50m';
  if (eurValue < 100000000) return '50-100m';
  if (eurValue < 500000000) return '100-500m';
  return '500m+';
};