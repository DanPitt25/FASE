'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CapacityMatchingForm from '../../components/CapacityMatchingForm';
import {
  SupportedLanguage,
  capacityMatchingPageTranslations,
  CapacityMatchingPageTranslations,
} from '../../lib/capacity-matching-email-translations';

interface TokenValidation {
  valid: boolean;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  language?: SupportedLanguage;
  error?: string;
}

// Convert page translations to CapacityMatchingForm translations format
function toFormTranslations(t: CapacityMatchingPageTranslations) {
  return {
    intro: t.intro,
    contact_info: t.contactInfo,
    company_name: t.companyName,
    contact_name: t.contactName,
    contact_email: t.contactEmail,
    growth_targets: t.growthTargets,
    add_row: t.addRow,
    entry: t.entry,
    remove: t.remove,
    line_of_business: t.lineOfBusiness,
    country: t.country,
    select: t.select,
    gwp_2025: t.gwp2025,
    gwp_placeholder: t.gwpPlaceholder,
    target_year_1: t.targetYear1,
    target_year_2: t.targetYear2,
    target_year_3: t.targetYear3,
    notes: t.notes,
    notes_placeholder: t.notesPlaceholder,
    submit: t.submit,
    submitting: t.submitting,
    success_title: t.successTitle,
    success_message: t.successMessage,
    submit_another: t.submitAnother,
    errors: {
      contact_name_required: t.contactNameRequired,
      contact_email_required: t.contactEmailRequired,
      line_of_business_required: t.lineOfBusinessRequired,
      country_required: t.countryRequired,
    },
  };
}

function LoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl border-4 border-fase-gold overflow-hidden flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy"></div>
        <p className="mt-4 text-fase-navy">{text}</p>
      </div>
    </div>
  );
}

function CapacityMatchingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [validation, setValidation] = useState<TokenValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Get language from validation result, fallback to English
  const language: SupportedLanguage = validation?.language || 'en';
  const t = capacityMatchingPageTranslations[language];

  useEffect(() => {
    async function validateToken() {
      if (!token || !email) {
        setValidation({ valid: false, error: 'Invalid link' });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/capacity-matching/validate?token=${token}&email=${encodeURIComponent(email)}`);
        const result = await response.json();

        if (result.valid) {
          setValidation({
            valid: true,
            companyName: result.companyName,
            contactName: result.contactName || '',
            contactEmail: result.contactEmail,
            language: result.language || 'en',
          });
        } else {
          setValidation({ valid: false, error: result.error || 'Invalid or expired link' });
        }
      } catch (error) {
        setValidation({ valid: false, error: 'Failed to validate link' });
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token, email]);

  const handleSubmit = async (data: {
    contactName: string;
    contactEmail: string;
    entries: any[];
  }) => {
    setSubmitError(null);

    const response = await fetch('/api/capacity-matching/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        email,
        ...data,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit');
    }
  };

  // Loading state
  if (loading) {
    return <LoadingState text={t.validatingLink} />;
  }

  // Invalid/expired link
  if (!validation?.valid) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl border-4 border-fase-gold overflow-hidden flex flex-col items-center justify-center py-16 px-8 text-center">
          <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-fase-navy mb-4">{t.linkInvalidTitle}</h2>
          <p className="text-gray-600 mb-6">{validation?.error || t.linkInvalid}</p>
          <Link
            href="/capacity-matching/request"
            className="inline-flex items-center justify-center px-6 py-3 bg-fase-navy text-white rounded-lg hover:bg-fase-dark-navy transition-colors"
          >
            {t.requestNewLink}
          </Link>
        </div>
      </div>
    );
  }

  // Valid token - show form
  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="relative z-10 w-full max-w-md sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-8rem)] bg-white rounded-lg shadow-xl border-4 border-fase-gold overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-6 py-8 text-center relative flex-shrink-0">
          <Link href="/">
            <Image
              src="/fase-logo-rgb.png"
              alt="FASE Logo"
              width={120}
              height={48}
              className="h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
          <h1 className="text-2xl font-noto-serif font-semibold text-fase-navy">{t.capacityMatching}</h1>
          <p className="text-sm text-gray-500">{t.questionnaireFor} {validation.companyName}</p>
        </div>

        {/* Form Content */}
        <div className="bg-white px-6 py-8 flex-1 overflow-y-auto">
          {submitError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {submitError}
            </div>
          )}
          <CapacityMatchingForm
            magicLinkMode={true}
            lockedCompanyName={validation.companyName}
            initialContactName={validation.contactName || ''}
            initialContactEmail={validation.contactEmail || ''}
            magicLinkToken={token || ''}
            onSubmit={handleSubmit}
            translations={toFormTranslations(t)}
          />
        </div>
      </div>
    </div>
  );
}

export default function CapacityMatchingMagicLinkPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CapacityMatchingContent />
    </Suspense>
  );
}
