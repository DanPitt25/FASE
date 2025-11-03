'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { signOut } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import LanguageToggle from '../../../components/LanguageToggle';

export default function ThankYouPage() {
  const [applicationNumber, setApplicationNumber] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState<string | null>(null);
  const t = useTranslations('thank_you');

  useEffect(() => {
    // Get application data from sessionStorage
    const submissionData = sessionStorage.getItem('applicationSubmission');
    if (submissionData) {
      try {
        const { applicationNumber: appNum, applicantName: name } = JSON.parse(submissionData);
        setApplicationNumber(appNum);
        setApplicantName(name);
        // Clear the data after use
        sessionStorage.removeItem('applicationSubmission');
      } catch (error) {
        console.error('Error parsing application submission data:', error);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-fase-navy py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl border border-fase-light-gold overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-6 py-8 text-center relative">
            {/* Language Toggle */}
            <div className="absolute top-4 right-4">
              <LanguageToggle />
            </div>
            
            <Image 
              src="/fase-logo-rgb.png" 
              alt="FASE Logo" 
              width={120}
              height={48}
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="bg-white px-6 py-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg 
              className="w-8 h-8 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>

          {/* Header */}
          <h1 className="text-3xl font-noto-serif font-bold text-fase-navy mb-4">
            {t('title')}
          </h1>

          {/* Main message */}
          <p className="text-lg text-fase-black mb-6">
            {t('application_submitted')}
          </p>

          {/* Application number */}
          {applicationNumber && (
            <div className="bg-fase-cream border border-fase-light-gold rounded-lg p-4 mb-6">
              <p className="text-sm text-fase-navy font-medium mb-1">{t('application_reference')}</p>
              <p className="text-lg font-mono text-fase-navy font-bold">{applicationNumber}</p>
            </div>
          )}

          {/* Next steps */}
          <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-fase-navy mb-3">{t('what_happens_next.title')}</h3>
            <ul className="space-y-2 text-fase-black">
              <li className="flex items-start">
                <span className="text-fase-navy mr-2">•</span>
                <span>{t('what_happens_next.step1')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-fase-navy mr-2">•</span>
                <span>{t('what_happens_next.step2')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-fase-navy mr-2">•</span>
                <span>{t('what_happens_next.step3')}</span>
              </li>
            </ul>
          </div>

          {/* Contact information */}
          <div className="text-center mb-8">
            <p className="text-fase-black mb-2">
              {t('contact.question')}
            </p>
            <p className="text-fase-black">
              {t('contact.email_text')}{' '}
              <a 
                href="mailto:help@fasemga.com" 
                className="text-fase-navy hover:text-fase-gold font-medium transition-colors"
              >
                help@fasemga.com
              </a>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={async () => {
                try {
                  await signOut(auth);
                } catch (error) {
                  console.error('Error signing out:', error);
                }
                window.location.href = '/';
              }}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-fase-navy hover:bg-fase-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fase-navy transition-colors"
            >
              {t('return_home')}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}