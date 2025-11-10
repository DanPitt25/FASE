'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import countries from 'i18n-iso-countries';

// Initialize country data for supported languages
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));
countries.registerLocale(require('i18n-iso-countries/langs/fr.json'));  
countries.registerLocale(require('i18n-iso-countries/langs/de.json'));
countries.registerLocale(require('i18n-iso-countries/langs/es.json'));
countries.registerLocale(require('i18n-iso-countries/langs/it.json'));
countries.registerLocale(require('i18n-iso-countries/langs/nl.json'));

interface SearchableCountrySelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  fieldKey: string;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (fieldKey: string) => void;
  europeanOnly?: boolean;
}

// European countries list for filtering
const europeanCountryCodes = [
  'AL', 'AD', 'AM', 'AT', 'AZ', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 
  'DK', 'EE', 'FO', 'FI', 'FR', 'GE', 'DE', 'GI', 'GR', 'GL', 'HU', 'IS', 
  'IE', 'IT', 'JE', 'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 
  'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 
  'SE', 'CH', 'TR', 'UA', 'GB'
];


export default function SearchableCountrySelect({
  label,
  value,
  onChange,
  required = false,
  className = "",
  fieldKey,
  touchedFields,
  attemptedNext,
  markFieldTouched,
  europeanOnly = false
}: SearchableCountrySelectProps) {
  const t = useTranslations('register_form.address');
  const locale = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get country list based on filter
  const getCountryList = () => {
    const allCountries = countries.getNames(locale);
    
    // Filter countries based on filter type
    const filteredCountries = europeanOnly 
      ? Object.fromEntries(
          Object.entries(allCountries).filter(([code]) => europeanCountryCodes.includes(code))
        )
      : allCountries;
    
    // All countries sorted alphabetically by name
    return Object.entries(filteredCountries)
      .map(([code, name]) => ({
        value: code,
        label: name
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  const countryList = getCountryList();
  const [selectedCountry, setSelectedCountry] = useState(
    countryList.find(c => c.value === value) || null
  );

  const filteredCountries = countryList.filter(country =>
    country.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isValid = value.trim() !== '';
  const shouldShowValidation = required && ((touchedFields[fieldKey] || attemptedNext) && !isValid);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedCountry(countryList.find(c => c.value === value) || null);
  }, [value, countryList]);

  const handleSelect = (country: { value: string; label: string }) => {
    setSelectedCountry(country);
    onChange(country.value);
    setIsOpen(false);
    setSearchTerm('');
    markFieldTouched(fieldKey);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-fase-navy mb-2">
          {label} {required && '*'}
        </label>
      )}
      
      <div className="relative" ref={containerRef}>
        <div
          className={`w-full px-3 py-2 border rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
            shouldShowValidation ? 'border-red-300' : 'border-fase-light-gold'
          } ${isOpen ? 'ring-2 ring-fase-navy border-transparent' : ''}`}
          onClick={() => {
            setIsOpen(!isOpen);
            markFieldTouched(fieldKey);
          }}
        >
          {selectedCountry ? (
            <span className="text-fase-black">{selectedCountry.label}</span>
          ) : (
            <span className="text-gray-400">{t('select_country_placeholder')}</span>
          )}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder={t('search_countries_placeholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                autoFocus
              />
            </div>
            
            <div className="max-h-48 overflow-y-auto">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    key={country.value}
                    type="button"
                    onClick={() => handleSelect(country)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                      selectedCountry?.value === country.value ? 'bg-fase-light-blue text-fase-navy font-medium' : 'text-gray-900'
                    }`}
                  >
                    {country.label}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500 text-center">
                  {t('no_countries_found')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {shouldShowValidation && (
        <p className="mt-1 text-sm text-red-600">{t('please_select_country')}</p>
      )}
    </div>
  );
}