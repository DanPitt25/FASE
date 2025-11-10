import glossaryData from '../messages/glossary.json';

/**
 * Get a glossary term in the specified locale
 */
export function getGlossaryTerm(key: string, locale: 'en' | 'fr' | 'es' | 'de' | 'it' | 'nl'): string {
  return glossaryData[locale][key as keyof typeof glossaryData['en']] || key;
}

/**
 * Translation key validation - ensures keys exist in both locales
 */
export function validateTranslationKey(key: string, namespace: string = ''): boolean {
  // This would be expanded to check actual message files
  // For now, return true as a placeholder
  return true;
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): Array<{ code: 'en' | 'fr' | 'es' | 'de' | 'it' | 'nl', label: string, nativeLabel: string }> {
  return [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'fr', label: 'French', nativeLabel: 'Français' },
    { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
    { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
    { code: 'it', label: 'Italian', nativeLabel: 'Italiano' },
    { code: 'nl', label: 'Dutch', nativeLabel: 'Nederlands' }
  ];
}

/**
 * Format locale display name
 */
export function formatLocaleDisplayName(locale: 'en' | 'fr' | 'es' | 'de' | 'it' | 'nl'): string {
  const localeMap = {
    'en': 'English',
    'fr': 'Français',
    'es': 'Español',
    'de': 'Deutsch',
    'it': 'Italiano',
    'nl': 'Nederlands'
  };
  return localeMap[locale];
}

/**
 * Translation helpers for common patterns
 */
export const translationHelpers = {
  /**
   * Get MGA term in appropriate locale
   */
  getMGATerm: (locale: 'en' | 'fr' | 'es' | 'de' | 'it' | 'nl') => getGlossaryTerm('mga', locale),
  
  /**
   * Get full MGA term in appropriate locale
   */
  getMGAFullTerm: (locale: 'en' | 'fr' | 'es' | 'de' | 'it' | 'nl') => getGlossaryTerm('mga_full', locale),
  
  /**
   * Get federation term in appropriate locale
   */
  getFederationTerm: (locale: 'en' | 'fr' | 'es' | 'de' | 'it' | 'nl') => getGlossaryTerm('federation', locale)
};