'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import countries from 'i18n-iso-countries';

// Initialize country data for supported languages
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));
countries.registerLocale(require('i18n-iso-countries/langs/fr.json'));  
countries.registerLocale(require('i18n-iso-countries/langs/de.json'));

interface CountryMultiSelectorProps {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  countriesFilter?: 'all' | 'european';
  disabled?: boolean;
}

// European countries list for filtering
const europeanCountryCodes = [
  'AL', 'AD', 'AM', 'AT', 'AZ', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 
  'DK', 'EE', 'FO', 'FI', 'FR', 'GE', 'DE', 'GI', 'GR', 'GL', 'HU', 'IS', 
  'IE', 'IT', 'JE', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 
  'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 
  'SE', 'CH', 'TR', 'UA', 'GB'
];


export default function CountryMultiSelector({
  label,
  value,
  onChange,
  required = false,
  className = "",
  placeholder = "",
  countriesFilter = 'all',
  disabled = false
}: CountryMultiSelectorProps) {
  const locale = useLocale();
  const [countrySearch, setCountrySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Get country list based on filter
  const getCountryList = () => {
    const allCountries = countries.getNames(locale);
    
    // Filter countries based on filter type
    const filteredCountries = countriesFilter === 'european' 
      ? Object.fromEntries(
          Object.entries(allCountries).filter(([code]) => europeanCountryCodes.includes(code))
        )
      : allCountries;
    
    // All countries sorted alphabetically by name
    return Object.entries(filteredCountries)
      .map(([code, name]) => ({
        code,
        name
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const countryList = getCountryList();
  
  // Filter countries based on search and exclude already selected
  const filteredCountries = countryList.filter(country =>
    !value.includes(country.code) &&
    (country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
     country.code.toLowerCase().includes(countrySearch.toLowerCase()))
  );

  // Get country name for display
  const getCountryName = (countryCode: string) => {
    return countries.getName(countryCode, locale) || countryCode;
  };

  // Add country to selection
  const addCountry = (countryCode: string) => {
    onChange([...value, countryCode]);
    setCountrySearch('');
  };

  // Remove country from selection
  const removeCountry = (countryCode: string) => {
    onChange(value.filter(code => code !== countryCode));
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-fase-navy mb-2">
          {label} {required && '*'}
        </label>
      )}
      
      {/* Selected Countries (Tokens) */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((countryCode) => (
            <span
              key={countryCode}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-fase-light-blue text-fase-navy"
            >
              {getCountryName(countryCode)}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCountry(countryCode)}
                  className="ml-2 text-fase-navy hover:text-red-600 focus:outline-none"
                  aria-label={`Remove ${getCountryName(countryCode)}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={countrySearch}
          onChange={(e) => {
            setCountrySearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => {
            setTimeout(() => setShowDropdown(false), 200);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-fase-light-gold'
          }`}
        />
        
        {showDropdown && !disabled && countrySearch && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => addCountry(country.code)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-gray-900"
                >
                  {country.name}
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
    </div>
  );
}