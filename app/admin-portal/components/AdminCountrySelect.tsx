'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import countries from 'i18n-iso-countries';

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

interface AdminCountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function AdminCountrySelect({
  value,
  onChange,
  disabled = false
}: AdminCountrySelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const countryList = useMemo(() => {
    const allCountries = countries.getNames('en');
    return Object.entries(allCountries)
      .map(([code, name]) => ({
        value: name,
        code: code
      }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, []);

  const filteredCountries = countryList.filter(country =>
    country.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSelect = (country: { value: string; code: string }) => {
    onChange(country.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`w-full px-3 py-2 border border-gray-300 rounded cursor-pointer bg-white ${
          isOpen ? 'ring-2 ring-fase-navy border-transparent' : ''
        } ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {value ? (
          <span className="text-gray-900">{value}</span>
        ) : (
          <span className="text-gray-400">Select country...</span>
        )}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search countries..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleSelect(country)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                    value === country.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                  }`}
                >
                  {country.value}
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
  );
}
