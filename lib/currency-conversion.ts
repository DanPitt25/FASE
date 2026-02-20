// Currency conversion utilities for FASE invoicing

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: 'EUR';
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  roundedAmount: number; // Rounded down to nearest 10
  displayText: string;
}

// Country to currency mapping for USD, GBP, EUR
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // USD countries
  'US': 'USD', 'USA': 'USD', 'United States': 'USD',
  'CA': 'USD', 'Canada': 'USD', // Often prefer USD for B2B
  'MX': 'USD', 'Mexico': 'USD',
  
  // GBP countries  
  'GB': 'GBP', 'UK': 'GBP', 'United Kingdom': 'GBP',
  'England': 'GBP', 'Scotland': 'GBP', 'Wales': 'GBP',
  'Northern Ireland': 'GBP', 'Britain': 'GBP',
  
  // EUR countries (Eurozone)
  'AT': 'EUR', 'Austria': 'EUR',
  'BE': 'EUR', 'Belgium': 'EUR', 
  'CY': 'EUR', 'Cyprus': 'EUR',
  'EE': 'EUR', 'Estonia': 'EUR',
  'FI': 'EUR', 'Finland': 'EUR',
  'FR': 'EUR', 'France': 'EUR',
  'DE': 'EUR', 'Germany': 'EUR',
  'GR': 'EUR', 'Greece': 'EUR',
  'IE': 'EUR', 'Ireland': 'EUR',
  'IT': 'EUR', 'Italy': 'EUR',
  'LV': 'EUR', 'Latvia': 'EUR',
  'LT': 'EUR', 'Lithuania': 'EUR',
  'LU': 'EUR', 'Luxembourg': 'EUR',
  'MT': 'EUR', 'Malta': 'EUR',
  'NL': 'EUR', 'Netherlands': 'EUR',
  'PT': 'EUR', 'Portugal': 'EUR',
  'SK': 'EUR', 'Slovakia': 'EUR',
  'SI': 'EUR', 'Slovenia': 'EUR',
  'ES': 'EUR', 'Spain': 'EUR',
  'HR': 'EUR', 'Croatia': 'EUR',
};

/**
 * Detect target currency based on country
 */
export function detectCurrency(country: string): string {
  if (!country) return 'EUR';
  
  // Try exact match first
  const currency = COUNTRY_CURRENCY_MAP[country];
  if (currency) return currency;
  
  // Try case-insensitive match
  const upperCountry = country.toUpperCase();
  for (const [key, value] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    if (key.toUpperCase() === upperCountry) {
      return value;
    }
  }
  
  // Try partial match for country codes like "United States" 
  for (const [key, value] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    if (upperCountry.includes(key.toUpperCase()) || key.toUpperCase().includes(upperCountry)) {
      return value;
    }
  }
  
  // Default to EUR if no match
  return 'EUR';
}

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£'
  };
  return symbols[currency] || currency;
}

/**
 * Get appropriate Wise bank details based on currency
 */
export function getWiseBankDetails(currency: string): {
  bic?: string;
  iban?: string;
  sortCode?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountType?: string;
  accountHolder: string;
  bankName: string;
  address: string[];
  reference: string;
} {
  const baseDetails = {
    accountHolder: 'FASE B.V.',
    reference: '560509'
  };
  
  switch (currency) {
    case 'USD':
      return {
        ...baseDetails,
        routingNumber: '101019628',
        accountNumber: '218936745391',
        accountType: 'Checking',
        bankName: 'Lead Bank',
        address: ['1801 Main St.', 'Kansas City MO 64108', 'United States']
      };
    case 'GBP':
      return {
        ...baseDetails,
        sortCode: '60-84-64',
        accountNumber: '34068846',
        iban: 'GB67 TRWI 6084 6434 0688 46',
        bankName: 'Wise Payments Limited',
        address: ['Worship Square, 65 Clifton Street', 'London', 'EC2A 4JE', 'United Kingdom']
      };
    case 'EUR':
    default:
      return {
        ...baseDetails,
        bic: 'TRWIBEB1XXX',
        iban: 'BE90 9057 9070 7732',
        bankName: 'Wise',
        address: ['Rue du Trône 100, 3rd floor', 'Brussels 1050', 'Belgium']
      };
  }
}

/**
 * Fetch live exchange rates from ExchangeRate-API
 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');

  if (!response.ok) {
    throw new Error(`Exchange rate API error: ${response.status}`);
  }

  const data = await response.json();
  return data.rates;
}

/**
 * Convert EUR amount to target currency
 */
export async function convertCurrency(
  eurAmount: number, 
  targetCountry: string,
  forceCurrency?: string
): Promise<ConversionResult> {
  const targetCurrency = forceCurrency || detectCurrency(targetCountry);
  
  // If already EUR, no conversion needed
  if (targetCurrency === 'EUR') {
    return {
      originalAmount: eurAmount,
      originalCurrency: 'EUR',
      convertedAmount: eurAmount,
      convertedCurrency: 'EUR',
      exchangeRate: 1,
      roundedAmount: Math.floor(eurAmount / 10) * 10,
      displayText: `€${eurAmount}`
    };
  }
  
  // Fetch exchange rates
  const rates = await fetchExchangeRates();
  const rate = rates[targetCurrency] || 1;
  
  // Convert and round down to nearest 10, with minimum floor of 1
  const convertedAmount = eurAmount * rate;
  const roundedAmount = Math.max(1, Math.floor(convertedAmount / 10) * 10);
  
  const symbol = getCurrencySymbol(targetCurrency);
  const displayText = `${symbol}${roundedAmount} (${targetCurrency} at inter-bank rate)`;
  
  return {
    originalAmount: eurAmount,
    originalCurrency: 'EUR',
    convertedAmount,
    convertedCurrency: targetCurrency,
    exchangeRate: rate,
    roundedAmount,
    displayText
  };
}

/**
 * Format currency amount with symbol
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount}`;
}