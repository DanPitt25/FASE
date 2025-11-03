'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Button from './Button';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export default function CookieBanner() {
  const t = useTranslations('cookie_banner');
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('fase-cookie-consent');
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true
    };
    saveCookiePreferences(allAccepted);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false
    };
    saveCookiePreferences(onlyNecessary);
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    saveCookiePreferences(preferences);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const saveCookiePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('fase-cookie-consent', JSON.stringify({
      preferences: prefs,
      timestamp: Date.now()
    }));

    // Initialize analytics based on consent
    if (prefs.analytics) {
      // Initialize Google Analytics or other analytics
      console.log('Analytics cookies accepted');
    }

    if (prefs.marketing) {
      // Initialize marketing pixels
      console.log('Marketing cookies accepted');
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-fase-light-gold shadow-2xl z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {!showPreferences ? (
          // Main banner
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-noto-serif font-medium text-fase-navy mb-2">
                {t('title')}
              </h3>
              <p className="text-fase-black text-sm leading-relaxed">
                {t('description')}{' '}
                <button 
                  onClick={() => setShowPreferences(true)}
                  className="text-fase-navy underline hover:text-fase-gold transition-colors ml-1"
                >
                  {t('customize_settings')}
                </button>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 min-w-max">
              <Button
                onClick={handleRejectAll}
                variant="secondary"
                size="medium"
                className="whitespace-nowrap"
              >
                {t('reject_all')}
              </Button>
              <Button
                onClick={handleAcceptAll}
                variant="primary"
                size="medium"
                className="whitespace-nowrap"
              >
                {t('accept_all')}
              </Button>
            </div>
          </div>
        ) : (
          // Preferences panel
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-noto-serif font-medium text-fase-navy">
                {t('preferences_title')}
              </h3>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-fase-navy hover:text-fase-gold transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4">
              {/* Necessary Cookies */}
              <div className="flex items-start justify-between p-4 bg-fase-cream/30 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-fase-navy mb-1">{t('necessary.title')}</h4>
                  <p className="text-sm text-fase-black">
                    {t('necessary.description')}
                  </p>
                </div>
                <div className="ml-4">
                  <div className="relative inline-block">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled={true}
                      className="sr-only"
                    />
                    <div className="w-12 h-6 bg-fase-navy rounded-full shadow-inner">
                      <div className="w-5 h-5 bg-white rounded-full shadow translate-x-6 transition-transform"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between p-4 bg-white border border-fase-light-gold rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-fase-navy mb-1">{t('analytics.title')}</h4>
                  <p className="text-sm text-fase-black">
                    {t('analytics.description')}
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => setPreferences(prev => ({ ...prev, analytics: !prev.analytics }))}
                    className="relative inline-block"
                  >
                    <div className={`w-12 h-6 rounded-full shadow-inner transition-colors ${
                      preferences.analytics ? 'bg-fase-navy' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        preferences.analytics ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between p-4 bg-white border border-fase-light-gold rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-fase-navy mb-1">{t('marketing.title')}</h4>
                  <p className="text-sm text-fase-black">
                    {t('marketing.description')}
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => setPreferences(prev => ({ ...prev, marketing: !prev.marketing }))}
                    className="relative inline-block"
                  >
                    <div className={`w-12 h-6 rounded-full shadow-inner transition-colors ${
                      preferences.marketing ? 'bg-fase-navy' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        preferences.marketing ? 'translate-x-6' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleRejectAll}
                variant="secondary"
                size="medium"
                className="flex-1 sm:flex-none"
              >
                {t('reject_all')}
              </Button>
              <Button
                onClick={handleSavePreferences}
                variant="primary"
                size="medium"
                className="flex-1 sm:flex-none"
              >
                {t('save_preferences')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}