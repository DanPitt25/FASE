'use client';

import { useTranslations } from 'next-intl';
import { europeanCountries } from '../../lib/countries';
import { amBestRatings } from './registration-utils';

// Carrier Information Component
export const CarrierInformationSection = ({
  carrierOrganizationType,
  setCarrierOrganizationType,
  isDelegatingInEurope,
  setIsDelegatingInEurope,
  numberOfMGAs,
  setNumberOfMGAs,
  delegatingCountries,
  setDelegatingCountries,
  frontingOptions: selectedFrontingOptions,
  setFrontingOptions,
  considerStartupMGAs,
  setConsiderStartupMGAs,
  amBestRating,
  setAmBestRating,
  otherRating,
  setOtherRating
}: {
  carrierOrganizationType: string;
  setCarrierOrganizationType: (value: string) => void;
  isDelegatingInEurope: string;
  setIsDelegatingInEurope: (value: string) => void;
  numberOfMGAs: string;
  setNumberOfMGAs: (value: string) => void;
  delegatingCountries: string[];
  setDelegatingCountries: (countries: string[]) => void;
  frontingOptions: string;
  setFrontingOptions: (value: string) => void;
  considerStartupMGAs: string;
  setConsiderStartupMGAs: (value: string) => void;
  amBestRating: string;
  setAmBestRating: (value: string) => void;
  otherRating: string;
  setOtherRating: (value: string) => void;
}) => {
  const t = useTranslations('register_form.carrier');
  const tCommon = useTranslations('common');
  
  return (
    <div className="space-y-6">
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">{t('title')}</h4>
      
      {/* Organization Type */}
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-3">
          {t('organization_type_question')} *
        </label>
        <select
          value={carrierOrganizationType}
          onChange={(e) => setCarrierOrganizationType(e.target.value)}
          className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
        >
          <option value="">{tCommon('select')}</option>
          <option value="insurance_company">{t('organization_types.insurance_company')}</option>
          <option value="reinsurance_company">{t('organization_types.reinsurance_company')}</option>
          <option value="lloyds_managing_agency">{t('organization_types.lloyds_managing_agency')}</option>
          <option value="insurance_broker">{t('organization_types.insurance_broker')}</option>
          <option value="reinsurance_broker">{t('organization_types.reinsurance_broker')}</option>
        </select>
      </div>
      
      {/* Delegating Authority */}
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-3">
          {t('delegating_question')} *
        </label>
        <div className="text-xs text-fase-black mb-3 italic">
          {t('delegating_note')}
        </div>
        <div className="space-y-2">
          {[tCommon('yes'), tCommon('no')].map((option) => (
            <label key={option} className="flex items-center">
              <input
                type="radio"
                name="isDelegatingInEurope"
                value={option}
                checked={isDelegatingInEurope === option}
                onChange={(e) => setIsDelegatingInEurope(e.target.value)}
                className="mr-3 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300"
              />
              <span className="text-sm text-fase-black">{option}</span>
            </label>
          ))}
        </div>

        {isDelegatingInEurope === tCommon('yes') && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-3">
                {t('mga_count_question')} *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {['1', '2-5', '6-10', '11-25', '25+'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setNumberOfMGAs(option)}
                    className={`p-3 border-2 rounded-lg transition-colors text-center ${
                      numberOfMGAs === option 
                        ? 'border-fase-navy bg-fase-cream' 
                        : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
                    }`}
                  >
                    <span className="text-sm font-medium text-fase-navy">{option}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-3">
                {t('countries_question')} *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {europeanCountries.map((country) => (
                  <label key={country.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={delegatingCountries.includes(country.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDelegatingCountries([...delegatingCountries, country.value]);
                        } else {
                          setDelegatingCountries(delegatingCountries.filter(c => c !== country.value));
                        }
                      }}
                      className="mr-3 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                    />
                    <span className="text-sm text-fase-black">{country.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fronting Options */}
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-3">
          {t('fronting_question')} *
        </label>
        <div className="space-y-2">
          {Object.entries(t.raw('fronting_options') as Record<string, string>).map(([key, label]) => (
            <label key={key} className="flex items-center">
              <input
                type="radio"
                name="frontingOptions"
                value={key}
                checked={selectedFrontingOptions === key}
                onChange={(e) => setFrontingOptions(e.target.value)}
                className="mr-3 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300"
              />
              <span className="text-sm text-fase-black">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Startup MGAs */}
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-3">
          {t('startup_question')} *
        </label>
        <div className="space-y-2">
          {[tCommon('yes'), tCommon('no')].map((option) => (
            <label key={option} className="flex items-center">
              <input
                type="radio"
                name="considerStartupMGAs"
                value={option}
                checked={considerStartupMGAs === option}
                onChange={(e) => setConsiderStartupMGAs(e.target.value)}
                className="mr-3 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300"
              />
              <span className="text-sm text-fase-black">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Ratings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-2">
            {t('am_best_rating')}
          </label>
          <select
            value={amBestRating}
            onChange={(e) => setAmBestRating(e.target.value)}
            className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="">{t('select_rating')}</option>
            {amBestRatings.map((rating) => (
              <option key={rating} value={rating}>{rating}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-2">
            {t('other_rating')}
          </label>
          <input
            type="text"
            value={otherRating}
            onChange={(e) => setOtherRating(e.target.value)}
            placeholder={t('other_rating_placeholder')}
            className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

// Service Provider Information Component
export const ServiceProviderSection = ({
  servicesProvided,
  setServicesProvided
}: {
  servicesProvided: string[];
  setServicesProvided: (services: string[]) => void;
}) => {
  const t = useTranslations('register_form.service_provider');
  
  return (
    <div className="space-y-6">
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">{t('title')}</h4>
      
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-3">
          {t('services_question')} *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(t.raw('categories') as Record<string, string>).map(([key, label]) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={servicesProvided.includes(key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setServicesProvided([...servicesProvided, key]);
                  } else {
                    setServicesProvided(servicesProvided.filter(s => s !== key));
                  }
                }}
                className="mr-3 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
              />
              <span className="text-sm text-fase-black">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};