'use client';

import { useEffect } from 'react';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { initializeAnalytics, initializeMarketingPixels } from '../lib/analytics';

export default function ConsentAwareAnalytics() {
  const { consent, isLoading } = useCookieConsent();

  useEffect(() => {
    if (isLoading || !consent) return;

    // Initialize analytics if user has given consent
    if (consent.preferences.analytics && process.env.NEXT_PUBLIC_GA_TRACKING_ID) {
      initializeAnalytics(process.env.NEXT_PUBLIC_GA_TRACKING_ID);
    }

    // Initialize marketing pixels if user has given consent
    if (consent.preferences.marketing) {
      initializeMarketingPixels();
    }
  }, [consent, isLoading]);

  // This component doesn't render anything visible
  return null;
}