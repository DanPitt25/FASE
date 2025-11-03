'use client';

import { europeanCountries } from '../../lib/countries';
import { frontingOptions, amBestRatings, serviceProviderCategories } from './registration-utils';

// Carrier Information Component
export const CarrierInformationSection = ({
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
  return (
    <div className="space-y-6">
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Carrier Information</h4>
      
      {/* Delegating Authority */}
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-3">
          Is your company currently writing delegated authority business through MGAs in Europe? (Continental Europe and/or the UK and/or Ireland) *
        </label>
        <div className="text-xs text-fase-black mb-3 italic">
          This is not a qualification for membership. Carriers that are planning to delegate authority to MGAs in Europe are also eligible for FASE membership.
        </div>
        <div className="space-y-2">
          {['Yes', 'No'].map((option) => (
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

        {isDelegatingInEurope === 'Yes' && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-3">
                How many MGAs do you currently work with in Europe? *
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
                In which European countries are you currently delegating underwriting authority to MGAs? *
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
          Do you offer fronting options? *
        </label>
        <div className="space-y-2">
          {frontingOptions.map((option) => (
            <label key={option} className="flex items-center">
              <input
                type="radio"
                name="frontingOptions"
                value={option}
                checked={selectedFrontingOptions === option}
                onChange={(e) => setFrontingOptions(e.target.value)}
                className="mr-3 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300"
              />
              <span className="text-sm text-fase-black">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Startup MGAs */}
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-3">
          Do you consider startup MGAs? *
        </label>
        <div className="space-y-2">
          {['Yes', 'No'].map((option) => (
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
            AM Best rating (if rated)
          </label>
          <select
            value={amBestRating}
            onChange={(e) => setAmBestRating(e.target.value)}
            className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="">Select rating</option>
            {amBestRatings.map((rating) => (
              <option key={rating} value={rating}>{rating}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-2">
            Additional / Other rating (Please specify)
          </label>
          <input
            type="text"
            value={otherRating}
            onChange={(e) => setOtherRating(e.target.value)}
            placeholder="Please specify other rating if applicable"
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
  return (
    <div className="space-y-6">
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Service Provider Information</h4>
      
      <div>
        <label className="block text-sm font-medium text-fase-navy mb-3">
          Which of the following services do you provide? *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {serviceProviderCategories.map((service) => (
            <label key={service} className="flex items-center">
              <input
                type="checkbox"
                checked={servicesProvided.includes(service)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setServicesProvided([...servicesProvided, service]);
                  } else {
                    setServicesProvided(servicesProvided.filter(s => s !== service));
                  }
                }}
                className="mr-3 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
              />
              <span className="text-sm text-fase-black">{service}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};