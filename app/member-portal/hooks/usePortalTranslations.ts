'use client';

import { useLocale } from 'next-intl';
import { useState, useEffect } from 'react';
import type { Locale } from '../../../contexts/LocaleContext';

interface PortalTranslations {
  portal: any;
  sections: any;
  overview: any;
  messages: any;
  alerts: any;
  map: any;
  profile: any;
  manage_profile: any;
}

const translationsCache = new Map<Locale, PortalTranslations>();

export function usePortalTranslations() {
  const locale = useLocale() as Locale;
  const [translations, setTranslations] = useState<PortalTranslations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTranslations = async () => {
      // Check cache first
      if (translationsCache.has(locale)) {
        setTranslations(translationsCache.get(locale)!);
        setLoading(false);
        return;
      }

      try {
        const translationModule = await import(`../translations/${locale}.json`);
        const portalTranslations = translationModule.default as PortalTranslations;
        
        // Cache the translations
        translationsCache.set(locale, portalTranslations);
        setTranslations(portalTranslations);
      } catch (error) {
        console.error(`Failed to load translations for locale: ${locale}`, error);
        // Fallback to English
        try {
          const fallbackModule = await import('../translations/en.json');
          const fallbackTranslations = fallbackModule.default as PortalTranslations;
          setTranslations(fallbackTranslations);
        } catch (fallbackError) {
          console.error('Failed to load fallback translations', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTranslations();
  }, [locale]);

  // Helper function to get nested translation with interpolation
  const t = (key: string, interpolations?: Record<string, string>) => {
    if (!translations) return key;
    
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if not found
      }
    }
    
    if (typeof value !== 'string') return key;
    
    // Handle interpolations like {{name}}
    if (interpolations) {
      return value.replace(/\{\{(\w+)\}\}/g, (match: string, placeholder: string) => {
        return interpolations[placeholder] || match;
      });
    }
    
    return value;
  };

  return { t, loading, locale, translations };
}