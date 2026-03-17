// Custom "Other" lines of business translations
// Maps the raw value (normalized to lowercase) to translations in all 6 languages

export interface CustomLOBTranslations {
  en: string;
  de: string;
  fr: string;
  es: string;
  it: string;
  nl: string;
}

// Key is the raw value normalized to lowercase
// Value contains all translations
export const CUSTOM_LOB_TRANSLATIONS: Record<string, CustomLOBTranslations> = {
  // OneAdvent - "PA" means Personal Accident
  'pa': {
    en: 'Personal Accident',
    de: 'Persönliche Unfallversicherung',
    fr: 'Accident individuel',
    es: 'Accidentes personales',
    it: 'Infortuni personali',
    nl: 'Persoonlijke ongevallen',
  },

  // Solertia MGA Ltd
  'tax indemnity': {
    en: 'Tax Indemnity',
    de: 'Steuerentschädigung',
    fr: 'Indemnité fiscale',
    es: 'Indemnización fiscal',
    it: 'Indennità fiscale',
    nl: 'Belastingvrijwaring',
  },

  // AYAX - Spanish "concursos públicos" = Public Tenders/Procurement
  'concursos públicos': {
    en: 'Public Tenders',
    de: 'Öffentliche Ausschreibungen',
    fr: 'Appels d\'offres publics',
    es: 'Concursos públicos',
    it: 'Gare d\'appalto pubbliche',
    nl: 'Openbare aanbestedingen',
  },

  // NAMMERT
  'boat & yacht insurance': {
    en: 'Boat & Yacht Insurance',
    de: 'Boots- & Yachtversicherung',
    fr: 'Assurance bateau et yacht',
    es: 'Seguro de barcos y yates',
    it: 'Assicurazione barche e yacht',
    nl: 'Boot- & jachtverzekering',
  },

  // NGN Autoprotect Hellas - typo "MIscelenous" fixed
  'miscellaneous financial losses': {
    en: 'Miscellaneous Financial Losses',
    de: 'Sonstige finanzielle Verluste',
    fr: 'Pertes financières diverses',
    es: 'Pérdidas financieras diversas',
    it: 'Perdite finanziarie varie',
    nl: 'Diverse financiële verliezen',
  },
  'miscelenous financial losses': {
    en: 'Miscellaneous Financial Losses',
    de: 'Sonstige finanzielle Verluste',
    fr: 'Pertes financières diverses',
    es: 'Pérdidas financieras diversas',
    it: 'Perdite finanziarie varie',
    nl: 'Diverse financiële verliezen',
  },

  // Fidelis Partnership
  'space/aerospace': {
    en: 'Space/Aerospace',
    de: 'Raumfahrt/Luft- und Raumfahrt',
    fr: 'Espace/Aérospatiale',
    es: 'Espacio/Aeroespacial',
    it: 'Spazio/Aerospaziale',
    nl: 'Ruimtevaart/Lucht- en ruimtevaart',
  },
  'asset backed finance': {
    en: 'Asset Backed Finance',
    de: 'Vermögensbesicherte Finanzierung',
    fr: 'Financement adossé à des actifs',
    es: 'Financiación respaldada por activos',
    it: 'Finanziamento garantito da attività',
    nl: 'Door activa gedekte financiering',
  },

  // SYNERGY - Spanish "Caución y Decenal" = Surety and Decennial
  'caución y decenal': {
    en: 'Surety & Decennial',
    de: 'Bürgschaft & Zehnjahresversicherung',
    fr: 'Caution et décennale',
    es: 'Caución y decenal',
    it: 'Fideiussione e decennale',
    nl: 'Borgstelling & tienjarig',
  },

  // NOVACOVER - French "Dommages aux biens" = Property Damage
  'dommages aux biens': {
    en: 'Property Damage',
    de: 'Sachschäden',
    fr: 'Dommages aux biens',
    es: 'Daños a la propiedad',
    it: 'Danni alla proprietà',
    nl: 'Zaakschade',
  },

  // assecco.com - German "technische Versicherung" = Technical Insurance
  'technische versicherung': {
    en: 'Technical Insurance',
    de: 'Technische Versicherung',
    fr: 'Assurance technique',
    es: 'Seguro técnico',
    it: 'Assicurazione tecnica',
    nl: 'Technische verzekering',
  },

  // Victor Insurance - typo "Land Bases" fixed to "Land Based"
  'land bases equipment': {
    en: 'Land Based Equipment',
    de: 'Landbasierte Ausrüstung',
    fr: 'Équipement terrestre',
    es: 'Equipamiento terrestre',
    it: 'Attrezzature terrestri',
    nl: 'Landgebonden apparatuur',
  },
  'land based equipment': {
    en: 'Land Based Equipment',
    de: 'Landbasierte Ausrüstung',
    fr: 'Équipement terrestre',
    es: 'Equipamiento terrestre',
    it: 'Attrezzature terrestri',
    nl: 'Landgebonden apparatuur',
  },
  'transport cargo': {
    en: 'Transport Cargo',
    de: 'Transportfracht',
    fr: 'Fret de transport',
    es: 'Carga de transporte',
    it: 'Carico di trasporto',
    nl: 'Transportvracht',
  },

  // INTERCAUCION - redundant Spanish+English, normalize to Surety Bonds
  'seguros de caucion- surety bonds': {
    en: 'Surety Bonds',
    de: 'Bürgschaften',
    fr: 'Cautionnements',
    es: 'Seguros de caución',
    it: 'Fideiussioni',
    nl: 'Borgstellingen',
  },

  // Brookfield Underwriting
  'high net worth home and contents': {
    en: 'High Net Worth Home & Contents',
    de: 'Haus und Hausrat für vermögende Kunden',
    fr: 'Habitation et contenu haut de gamme',
    es: 'Hogar y contenido de alto patrimonio',
    it: 'Casa e contenuti di alto valore',
    nl: 'Huis en inboedel voor vermogende particulieren',
  },
};

// Get the translated value for a custom LOB
export function getCustomLOBTranslation(value: string, locale: string): string {
  if (!value) return value;

  const normalizedKey = value.toLowerCase().trim();
  const translations = CUSTOM_LOB_TRANSLATIONS[normalizedKey];

  if (translations) {
    return translations[locale as keyof CustomLOBTranslations] || translations.en || value;
  }

  // No translation found, return original value
  return value;
}

// Check if a custom LOB has translations
export function hasCustomLOBTranslation(value: string): boolean {
  if (!value) return false;
  const normalizedKey = value.toLowerCase().trim();
  return normalizedKey in CUSTOM_LOB_TRANSLATIONS;
}
