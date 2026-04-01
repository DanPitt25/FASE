// Lines of Business options for Capacity Matching questionnaire
export const LINES_OF_BUSINESS = [
  'Accident & Health',
  'Airline Hull',
  'Airline Liability',
  'Aviation War Risks',
  'Bloodstock',
  'Construction All Risks',
  'Cyber',
  'Decennial Liability',
  'Directors & Officers Liability',
  "Doctors' Medical Malpractice",
  'Employers Liability / Workers Compensation',
  'Employment Practices Liability',
  'Energy Downstream',
  'Energy Midstream',
  'Energy Upstream',
  'Energy, Renewables',
  'Event Cancellation',
  'Financial Guarantee',
  'Fine Art',
  'General Aviation Hull',
  'General Aviation Liability',
  'General Liability / Public Liability',
  'General Specie including Vault Risk',
  'High Net Worth Homeowners',
  'Homeowners',
  "Hospitals' Professional Liability",
  'Jewellers Block',
  'Kidnap & Ransom',
  'Legal Expenses',
  'Livestock',
  'Loss of Attraction',
  'Marine Hull',
  'Marine Legal Liability',
  'Marine War Risks',
  'Marine: Yacht / Pleasure Craft',
  'Mechanical Breakdown',
  'Medical Expenses',
  'Miscellaneous Pecuniary Loss',
  'Mortgage Indemnity',
  'Motor – Fleet / Commercial',
  'Motor – Private Car',
  'Nuclear Liability',
  'Nuclear Property Damage',
  'Nursing Homes / Long-Term Healthcare Risks',
  'Pet',
  'Physical Damage, Commercial Property',
  'Political Risk',
  'Professional Indemnity / E&O for Financial Institutions',
  'Professional Indemnity / E&O for non-Financial Institutions',
  'Surety',
  'Travel',
  'Warranty & Indemnity',
] as const;

// European Countries options for Capacity Matching questionnaire
export const EUROPEAN_COUNTRIES = [
  'Albania - AL',
  'Andorra - AD',
  'Austria - AT',
  'Belarus - BY',
  'Belgium - BE',
  'Bosnia and Herzegovina - BA',
  'Bulgaria - BG',
  'Croatia - HR',
  'Cyprus - CY',
  'Czechia (Czech Republic) - CZ',
  'Denmark - DK',
  'Estonia - EE',
  'Finland - FI',
  'France - FR',
  'Germany - DE',
  'Gibraltar - GI',
  'Greece - GR',
  'Hungary - HU',
  'Iceland - IS',
  'Ireland - IE',
  'Isle of Man - IM',
  'Italy - IT',
  'Jersey - JE',
  'Kosovo* - XK',
  'Latvia - LV',
  'Liechtenstein - LI',
  'Lithuania - LT',
  'Luxembourg - LU',
  'Malta - MT',
  'Moldova - MD',
  'Monaco - MC',
  'Montenegro - ME',
  'Netherlands - NL',
  'North Macedonia - MK',
  'Norway - NO',
  'Poland - PL',
  'Portugal - PT',
  'Romania - RO',
  'Russia - RU',
  'San Marino - SM',
  'Serbia - RS',
  'Slovakia - SK',
  'Slovenia - SI',
  'Spain - ES',
  'Svalbard & Jan Mayen - SJ',
  'Sweden - SE',
  'Switzerland - CH',
  'Ukraine - UA',
  'United Kingdom - GB',
  'Vatican City (Holy See) - VA',
] as const;

export type LineOfBusiness = typeof LINES_OF_BUSINESS[number];
export type EuropeanCountry = typeof EUROPEAN_COUNTRIES[number];

// TypeScript interfaces for Capacity Matching submissions
export interface CapacityMatchingEntry {
  lineOfBusiness: string;
  country: string;
  gwp2025: number;
  targetYear1: number;
  targetYear2: number;
  targetYear3: number;
  notes: string;
}

export interface CapacityMatchingSubmission {
  id: string;
  memberId: string;
  memberEmail: string;
  organizationId: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  entries: CapacityMatchingEntry[];
  createdAt: Date;
  updatedAt: Date;
}
