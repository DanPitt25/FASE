'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useUnifiedAuth } from '../../../contexts/UnifiedAuthContext';
import CapacityMatchingForm from '../../../components/CapacityMatchingForm';
import LanguageToggle from '../../../components/LanguageToggle';
import { usePortalTranslations } from '../hooks/usePortalTranslations';

export default function CapacityMatchingPage() {
  const { member, loading } = useUnifiedAuth();
  const { translations, locale } = usePortalTranslations();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state
  if (!mounted || loading) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 w-full max-w-md sm:max-w-2xl lg:max-w-4xl bg-white rounded-lg shadow-xl border-4 border-fase-gold overflow-hidden flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy"></div>
          <p className="mt-4 text-fase-navy">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!member) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl border-4 border-fase-gold overflow-hidden flex flex-col items-center justify-center py-16 px-8 text-center">
          <h2 className="text-xl font-semibold text-fase-navy mb-4">Member Access Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access the Capacity Matching questionnaire.</p>
          <Link
            href="/member-portal"
            className="inline-flex items-center justify-center px-6 py-3 bg-fase-navy text-white rounded-lg hover:bg-fase-dark-navy transition-colors"
          >
            Go to Member Portal
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is MGA or Admin
  const isMGAorAdmin = member.organizationType === 'MGA' || member.status === 'admin';
  if (!isMGAorAdmin) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl border-4 border-fase-gold overflow-hidden flex flex-col items-center justify-center py-16 px-8 text-center">
          <h2 className="text-xl font-semibold text-fase-navy mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-6">The Capacity Matching questionnaire is only available to MGA members.</p>
          <Link
            href="/member-portal"
            className="inline-flex items-center justify-center px-6 py-3 bg-fase-navy text-white rounded-lg hover:bg-fase-dark-navy transition-colors"
          >
            Back to Member Portal
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = translations?.capacity_matching?.title || 'Capacity Matching';
  const backText = translations?.capacity_matching?.back_to_portal || 'Back to Member Portal';

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="relative z-10 w-full max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-8rem)] bg-white rounded-lg shadow-xl border-4 border-fase-gold overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-6 py-8 text-center relative flex-shrink-0">
          {/* Language Toggle */}
          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>

          {/* Back Link */}
          <div className="absolute top-4 left-4">
            <Link
              href="/member-portal"
              className="inline-flex items-center text-sm text-fase-navy hover:text-fase-gold transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {backText}
            </Link>
          </div>

          <Link href="/">
            <Image
              src="/fase-logo-rgb.png"
              alt="FASE Logo"
              width={120}
              height={48}
              className="h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
          <h1 className="text-2xl font-noto-serif font-semibold text-fase-navy">{pageTitle}</h1>
        </div>

        {/* Form Content */}
        <div className="bg-white px-6 py-8 flex-1 overflow-y-auto">
          <CapacityMatchingForm translations={translations?.capacity_matching || {}} />
        </div>
      </div>
    </div>
  );
}
