'use client';

// APPROXIMATE conversion rates for CLIENT-SIDE DISPLAY ONLY
// These are used to show estimated fees in the registration form.
// Actual invoices use live exchange rates fetched at invoice generation time.
// WARNING: Keep these reasonably current - they affect which fee band is displayed.
// Last updated: 20 Feb 2026
const exchangeRates = {
  'USD': 0.85,  // 1 USD = 0.85 EUR (1 EUR = 1.18 USD)
  'GBP': 1.14,  // 1 GBP = 1.14 EUR (1 EUR = 0.874 GBP)
  'EUR': 1.0
};

// Convert currency to EUR (approximate, for display only)
export const convertToEUR = (amount: number, fromCurrency: string): number => {
  const rate = exchangeRates[fromCurrency as keyof typeof exchangeRates] || 1;
  return amount * rate;
};

// Calculate total GWP from magnitude inputs (returns total value in base currency)
export const calculateTotalGWP = (gwpBillions: string, gwpMillions: string, gwpThousands: string): number => {
  const billions = parseFloat(gwpBillions) || 0;
  const millions = parseFloat(gwpMillions) || 0;
  const thousands = parseFloat(gwpThousands) || 0;
  
  // Return total in base currency units
  return (billions * 1000000000) + (millions * 1000000) + (thousands * 1000);
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

// Calculate membership fee
export const calculateMembershipFee = (
  organizationType: 'MGA' | 'carrier' | 'provider',
  grossWrittenPremiums: string,
  gwpCurrency: string,
  hasOtherAssociations?: boolean
) => {
  // All memberships are corporate
  
  if (organizationType === 'MGA') {
    const gwpValue = parseFloat(grossWrittenPremiums) || 0;
    if (gwpValue === 0) return 900; // Default if no GWP input
    
    // Convert to EUR for band calculation
    const eurValue = convertToEUR(gwpValue, gwpCurrency);
    const band = getGWPBand(eurValue);
    
    switch (band) {
      case '<10m': return 900;
      case '10-20m': return 1500;
      case '20-50m': return 2200;
      case '50-100m': return 2800;
      case '100-500m': return 4200;
      case '500m+': return 7000;
      default: return 900;
    }
  } else if (organizationType === 'carrier') {
    return 4000; // Flat rate for carriers
  } else if (organizationType === 'provider') {
    return 5000; // Flat rate for service providers
  } else {
    return 900; // Default corporate rate
  }
};

// Get discounted fee
export const getDiscountedFee = (
  organizationType: 'MGA' | 'carrier' | 'provider',
  grossWrittenPremiums: string,
  gwpCurrency: string,
  hasOtherAssociations?: boolean
) => {
  const baseFee = calculateMembershipFee(organizationType, grossWrittenPremiums, gwpCurrency, hasOtherAssociations);
  // Apply discount to corporate memberships (all memberships are corporate)
  if (hasOtherAssociations) {
    return Math.round(baseFee * 0.8); // 20% discount
  }
  return baseFee;
};



// Service provider categories (restored from git history)
export const serviceProviderCategories = [
  'Actuarial Services',
  'Back-office/Underwriting Outsourcing',
  'Business Consulting/Marketing',
  'Capital/Financial Provider',
  'Claims Management',
  'Client/Policy Management Technology',
  'Data Solutions',
  'Financial Services',
  'M&A Advisory',
  'Program/Product Development',
  'Rating and Issuing Technology',
  'Regulatory Compliance/Licensing',
  'Reinsurance Intermediary',
  'Risk Management/Risk Control',
  'Talent/Staffing/Personnel',
  'Technology - Other'
];

// Fronting options (restored from git history)
export const frontingOptions = [
  'None',
  'Pure',
  'Hybrid',
  'Both'
];

// AM Best ratings (restored from git history)
export const amBestRatings = [
  'A++',
  'A+',
  'A',
  'A-',
  'B++',
  'B+',
  'B',
  'B-',
  'C++',
  'C',
  'C-',
  'D'
];

