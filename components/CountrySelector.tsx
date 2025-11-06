'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import countries from 'i18n-iso-countries';

// Initialize country data for supported languages
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));
countries.registerLocale(require('i18n-iso-countries/langs/fr.json'));  
countries.registerLocale(require('i18n-iso-countries/langs/de.json'));
countries.registerLocale(require('i18n-iso-countries/langs/es.json'));
countries.registerLocale(require('i18n-iso-countries/langs/it.json'));

interface CountrySelectorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
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


export default function CountrySelector({
  label,
  value,
  onChange,
  required = false,
  className = "",
  placeholder = "",
  countriesFilter = 'all',
  disabled = false
}: CountrySelectorProps) {
  const locale = useLocale();
  const [countrySearch, setCountrySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCountryName, setSelectedCountryName] = useState('');
  
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
  
  // Update selected country name when value changes
  useEffect(() => {
    if (value) {
      const countryName = countries.getName(value, locale);
      setSelectedCountryName(countryName || value);
    } else {
      setSelectedCountryName('');
    }
  }, [value, locale]);
  
  // Filter countries based on search
  const filteredCountries = countryList.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Get display text for country input
  const getDisplayText = () => {
    if (showDropdown) {
      return countrySearch;
    }
    return selectedCountryName;
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-fase-navy mb-2">
          {label} {required && '*'}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={getDisplayText()}
          onChange={(e) => {
            setCountrySearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            setShowDropdown(true);
            setCountrySearch('');
          }}
          onBlur={() => {
            setTimeout(() => setShowDropdown(false), 200);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-fase-light-gold'
          }`}
        />
        
        {showDropdown && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onChange(country.code);
                    setShowDropdown(false);
                    setCountrySearch('');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                    value === country.code ? 'bg-fase-light-blue text-fase-navy font-medium' : 'text-gray-900'
                  }`}
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