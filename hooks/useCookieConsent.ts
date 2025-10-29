'use client';

import { useState, useEffect } from 'react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsent {
  preferences: CookiePreferences;
  timestamp: number;
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing consent
    const stored = localStorage.getItem('fase-cookie-consent');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookieConsent;
        setConsent(parsed);
      } catch (error) {
        console.error('Error parsing cookie consent:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const hasConsent = (type: keyof CookiePreferences): boolean => {
    if (!consent) return false;
    return consent.preferences[type];
  };

  const updateConsent = (preferences: CookiePreferences) => {
    const newConsent: CookieConsent = {
      preferences,
      timestamp: Date.now()
    };
    
    localStorage.setItem('fase-cookie-consent', JSON.stringify(newConsent));
    setConsent(newConsent);
  };

  const clearConsent = () => {
    localStorage.removeItem('fase-cookie-consent');
    setConsent(null);
  };

  return {
    consent,
    isLoading,
    hasConsent,
    updateConsent,
    clearConsent,
    hasAnalyticsConsent: hasConsent('analytics'),
    hasMarketingConsent: hasConsent('marketing')
  };
}