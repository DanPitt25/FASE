'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
  europeanOnly = false
}: SearchableCountrySelectProps) {
  const t = useTranslations('register');
  const locale = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get country list (all countries, no filtering)
  const countryList = useMemo(() => {
    const allCountries = countries.getNames(locale);
    
    // All countries sorted alphabetically by name
    return Object.entries(allCountries)
      .map(([code, name]) => ({
        value: code,
        label: name
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [locale]);
  
  const [selectedCountry, setSelectedCountry] = useState<{ value: string; label: string } | null>(null);

  const filteredCountries = countryList.filter(country =>
    country.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && '*'}
        </label>
      )}
      
      <div className="relative" ref={containerRef}>
        <div
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent bg-white ${
            isOpen ? 'ring-2 ring-fase-navy border-transparent' : ''
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedCountry ? (
            <span className="text-gray-900">{selectedCountry.label}</span>
          ) : (
            <span className="text-gray-400">{t('countries.select')}</span>
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
                placeholder={t('form.search_countries')}
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
                      selectedCountry?.value === country.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                    }`}
                  >
                    {country.label}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500 text-center">
                  {t('form.no_countries_found')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}