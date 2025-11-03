'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';

type Locale = 'en' | 'fr';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Function to detect user's preferred language based on browser language (immediate fallback)
const detectBrowserLanguage = (): Locale => {
  if (typeof window === 'undefined') return 'en';
  
  const browserLang = navigator.language || navigator.languages?.[0];
  if (browserLang) {
    // French-speaking regions
    const frenchRegions = ['fr', 'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr-LU', 'fr-MC'];
    if (frenchRegions.some(region => browserLang.toLowerCase().startsWith(region.toLowerCase()))) {
      return 'fr';
    }
  }
  
  return 'en'; // Default to English
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    // Priority order: localStorage > browser language > default
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('fase-locale') as Locale | null;
      if (savedLocale && (savedLocale === 'en' || savedLocale === 'fr')) {
        return savedLocale;
      }
      
      // If no saved preference, detect based on browser language immediately
      return detectBrowserLanguage();
    }
    return 'en';
  });

  const geolocationData = useGeolocation();

  // Update locale based on geolocation detection (only for first-time visitors)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('fase-locale') as Locale | null;
      
      // Only apply geolocation detection if:
      // 1. No saved preference exists
      // 2. Geolocation detected a language different from current
      // 3. Current locale is still the browser-detected default
      if (!savedLocale && geolocationData.detectedLanguage && 
          geolocationData.detectedLanguage !== locale) {
        setLocale(geolocationData.detectedLanguage);
        console.log(`Auto-detected language: ${geolocationData.detectedLanguage} based on location: ${geolocationData.country || 'unknown'}`);
      }
    }
  }, [geolocationData, locale]);

  // Save locale to localStorage when it changes
  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('fase-locale', newLocale);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale: handleSetLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}