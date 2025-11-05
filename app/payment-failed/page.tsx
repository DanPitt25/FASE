'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import LanguageToggle from '../../components/LanguageToggle';

export default function PaymentFailedPage() {
  const [applicationNumber, setApplicationNumber] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState<string | null>(null);
  const t = useTranslations('payment_failed');

  useEffect(() => {
    // Get payment data from URL params or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const sessionData = sessionStorage.getItem('paymentFailed');
    
    if (sessionData) {
      try {
        const { applicationNumber: appNum, applicantName: name } = JSON.parse(sessionData);
        setApplicationNumber(appNum);
        setApplicantName(name);
        // Clear the data after use
        sessionStorage.removeItem('paymentFailed');
      } catch (error) {
        console.error('Error parsing payment failed data:', error);
      }
    }
  }, []);

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="relative z-10 max-w-4xl mx-auto">
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
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg 
              className="w-8 h-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </div>

          {/* Header */}
          <h1 className="text-3xl font-noto-serif font-bold text-fase-navy mb-4">
            {t('title')}
          </h1>

          {/* Main message */}
          <p className="text-lg text-fase-black mb-6">
            {t('message')}
          </p>

          {/* Next steps */}
          <div className="text-left bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-fase-navy mb-3">{t('what_you_can_do.title')}</h3>
            <ul className="space-y-2 text-fase-black">
              <li className="flex items-start">
                <span className="text-fase-navy mr-2">•</span>
                <span>{t('what_you_can_do.step1')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-fase-navy mr-2">•</span>
                <span>{t('what_you_can_do.step2')}</span>
              </li>
              <li className="flex items-start">
                <span className="text-fase-navy mr-2">•</span>
                <span>{t('what_you_can_do.step3')}</span>
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
                href="mailto:admin@fasemga.com" 
                className="text-fase-navy hover:text-fase-gold font-medium transition-colors"
              >
                admin@fasemga.com
              </a>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                window.location.href = '/register';
              }}
              className="inline-flex items-center justify-center px-6 py-3 border border-fase-navy text-base font-medium rounded-md text-fase-navy bg-white hover:bg-fase-navy hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fase-navy transition-colors"
            >
              {t('try_again')}
            </button>
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