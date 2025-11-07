'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';

export type Locale = 'en' | 'fr' | 'de' | 'es' | 'it';

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
    // German-speaking regions
    const germanRegions = ['de', 'de-DE', 'de-AT', 'de-CH'];
    if (germanRegions.some(region => browserLang.toLowerCase().startsWith(region.toLowerCase()))) {
      return 'de';
    }
    
    // French-speaking regions
    const frenchRegions = ['fr', 'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr-LU', 'fr-MC'];
    if (frenchRegions.some(region => browserLang.toLowerCase().startsWith(region.toLowerCase()))) {
      return 'fr';
    }
    
    // Spanish-speaking regions
    const spanishRegions = ['es', 'es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-PE', 'es-VE', 'es-CL', 'es-EC', 'es-GT', 'es-UY', 'es-PY', 'es-BO', 'es-DO', 'es-HN', 'es-NI', 'es-CR', 'es-PA', 'es-SV', 'es-US'];
    if (spanishRegions.some(region => browserLang.toLowerCase().startsWith(region.toLowerCase()))) {
      return 'es';
    }
    
    // Italian-speaking regions
    const italianRegions = ['it', 'it-IT', 'it-CH', 'it-SM', 'it-VA'];
    if (italianRegions.some(region => browserLang.toLowerCase().startsWith(region.toLowerCase()))) {
      return 'it';
    }
  }
  
  return 'en'; // Default to English
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Always start with 'en' to avoid hydration mismatch
  const [locale, setLocale] = useState<Locale>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  const geolocationData = useGeolocation();

  // Initialize locale from localStorage/browser after hydration
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const savedLocale = localStorage.getItem('fase-locale') as Locale | null;
      if (savedLocale && (savedLocale === 'en' || savedLocale === 'fr' || savedLocale === 'de' || savedLocale === 'es' || savedLocale === 'it')) {
        setLocale(savedLocale);
      } else {
        // If no saved preference, detect based on browser language
        const browserLocale = detectBrowserLanguage();
        setLocale(browserLocale);
      }
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Update locale based on geolocation detection (only for first-time visitors)
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
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
  }, [geolocationData, locale, isInitialized]);

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