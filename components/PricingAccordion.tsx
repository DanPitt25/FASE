'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function PricingAccordion() {
  const t = useTranslations('join.membership_pricing');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* MGA Membership */}
      <div className="border border-gray-200 rounded-lg">
        <div 
          className="cursor-pointer hover:bg-gray-50 rounded-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between p-6">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('mga.title')}</h3>
                <div className="text-right ml-4">
                  <span className="text-2xl font-bold text-fase-navy">{t('mga.tiered_label')}</span>
                </div>
              </div>
              <p className="text-fase-black mt-1">{t('mga.description')}</p>
            </div>
          </div>
          <div className="flex justify-center pb-4">
            <svg className={`w-5 h-5 text-fase-navy transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-6 pt-0 border-t border-gray-100">
            <div className="space-y-2">
              {t.raw('mga.tiers').map((tier: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-b-0">
                  <span className="text-sm font-medium text-fase-black">{tier.range}</span>
                  <span className="text-lg font-bold text-fase-navy">{tier.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Carrier Membership */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('carrier.title')}</h3>
            <p className="text-fase-black mt-1">{t('carrier.description')}</p>
          </div>
          <div className="text-right ml-4">
            <span className="text-2xl font-bold text-fase-navy">{t('carrier.price')}</span>
          </div>
        </div>
      </div>

      {/* Service Provider Membership */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('provider.title')}</h3>
            <p className="text-fase-black mt-1">{t('provider.description')}</p>
          </div>
          <div className="text-right ml-4">
            <span className="text-2xl font-bold text-fase-navy">{t('provider.price')}</span>
          </div>
        </div>
      </div>

      {/* Multi-Association Discount */}
      <div className="mt-8">
        <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
          <svg className="w-5 h-5 text-fase-navy mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="font-medium text-fase-navy">{t('discount.title')}</h4>
            <p className="text-sm text-fase-black mt-1">{t('discount.description')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}