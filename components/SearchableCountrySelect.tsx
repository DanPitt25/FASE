'use client';

import { useState, useRef, useEffect } from 'react';
import { countries, europeanCountries } from '../lib/countries';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const countryList = europeanOnly ? europeanCountries : countries;
  const [selectedCountry, setSelectedCountry] = useState(
    countryList.find(c => c.value === value) || null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCountries = countryList.filter(country =>
    country.label.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSelect = (country: typeof countries[0]) => {
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
            <span className="text-gray-400">Select a country...</span>
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
                placeholder="Search countries..."
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
                  No countries found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {shouldShowValidation && (
        <p className="mt-1 text-sm text-red-600">Please select a country</p>
      )}
    </div>
  );
}