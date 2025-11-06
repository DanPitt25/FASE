'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { getCountryCallingCode } from 'libphonenumber-js';
import countries from 'i18n-iso-countries';

// Initialize country data for our supported languages
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));
countries.registerLocale(require('i18n-iso-countries/langs/fr.json'));  
countries.registerLocale(require('i18n-iso-countries/langs/de.json'));
countries.registerLocale(require('i18n-iso-countries/langs/es.json'));
countries.registerLocale(require('i18n-iso-countries/langs/it.json'));

interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  fieldKey: string;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (fieldKey: string) => void;
  disabled?: boolean;
}

// Country code to flag emoji mapping
const getCountryFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};


export default function PhoneInput({
  label,
  value,
  onChange,
  required = false,
  className = "",
  fieldKey,
  touchedFields,
  attemptedNext,
  markFieldTouched,
  disabled = false
}: PhoneInputProps) {
  const t = useTranslations('register_form.team_members');
  const locale = useLocale();
  const [selectedCountry, setSelectedCountry] = useState('GB'); // Default to UK
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const lastValueRef = useRef(value);
  
  const isValid = !required || value.trim() !== '';
  const shouldShowValidation = required && ((touchedFields[fieldKey] || attemptedNext) && !isValid);

  // Initialize phone input from existing value
  useEffect(() => {
    if (value && !phoneNumber) {
      setPhoneNumber(value);
    }
  }, [value, phoneNumber]);

  // Get all countries in the current locale
  const getCountryList = () => {
    const allCountries = countries.getNames(locale);
    
    // Helper function to safely get calling code
    const getCallingCodeSafely = (code: string) => {
      try {
        return getCountryCallingCode(code as any);
      } catch (error) {
        return null; // Return null for countries without calling codes
      }
    };
    
    // All countries sorted alphabetically by name
    return Object.entries(allCountries)
      .map(([code, name]) => ({
        code,
        name,
        callingCode: getCallingCodeSafely(code)
      }))
      .filter(country => country.callingCode) // Only include countries with calling codes
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const countryList = getCountryList();
  const selectedCountryData = countryList.find(c => c.code === selectedCountry);
  
  // Filter countries based on search
  const filteredCountries = countryList.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    (country.callingCode && country.callingCode.includes(countrySearch.replace('+', ''))) ||
    country.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Get display text for country input
  const getCountryDisplayText = () => {
    if (selectedCountryData) {
      return `${selectedCountryData.name} +${selectedCountryData.callingCode}`;
    }
    return countrySearch;
  };

  // Update full phone number when country or number changes
  useEffect(() => {
    if (selectedCountryData && phoneNumber) {
      const fullNumber = `+${selectedCountryData.callingCode} ${phoneNumber}`;
      if (fullNumber !== lastValueRef.current) {
        lastValueRef.current = fullNumber;
        onChange(fullNumber);
      }
    } else if (phoneNumber && phoneNumber !== lastValueRef.current) {
      lastValueRef.current = phoneNumber;
      onChange(phoneNumber);
    }
  }, [selectedCountry, phoneNumber, selectedCountryData]);

  // Update ref when value changes externally
  useEffect(() => {
    lastValueRef.current = value;
  }, [value]);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-fase-navy mb-2">
          {label} {required && '*'}
        </label>
      )}
      
      <div className="flex space-x-2">
        {/* Country Selector */}
        <div className="relative" style={{ width: '200px' }}>
          <input
            type="text"
            value={showCountryDropdown ? countrySearch : getCountryDisplayText()}
            onChange={(e) => {
              setCountrySearch(e.target.value);
              setShowCountryDropdown(true);
              markFieldTouched(fieldKey);
            }}
            onFocus={() => {
              setShowCountryDropdown(true);
              setCountrySearch('');
            }}
            onBlur={() => {
              setTimeout(() => setShowCountryDropdown(false), 200);
            }}
            placeholder="Search country..."
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
              shouldShowValidation ? 'border-red-300' : 'border-fase-light-gold'
            }`}
          />
          
          {showCountryDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(country.code);
                      setShowCountryDropdown(false);
                      setCountrySearch('');
                      markFieldTouched(fieldKey);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                      selectedCountry === country.code ? 'bg-fase-light-blue text-fase-navy font-medium' : 'text-gray-900'
                    }`}
                  >
                    {country.name} +{country.callingCode}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500 text-center">
                  No countries found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => {
            setPhoneNumber(e.target.value);
            markFieldTouched(fieldKey);
          }}
          placeholder={t('phone_placeholder')}
          disabled={disabled}
          className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent min-w-0 ${
            shouldShowValidation ? 'border-red-300' : 'border-fase-light-gold'
          }`}
        />
      </div>
      
      {shouldShowValidation && (
        <p className="mt-1 text-sm text-red-600">{t('phone_required')}</p>
      )}
    </div>
  );
}