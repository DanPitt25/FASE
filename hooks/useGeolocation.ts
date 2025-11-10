'use client';

import { useState, useEffect } from 'react';

type Locale = 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl';

interface GeolocationData {
  country?: string;
  countryCode?: string;
  detectedLanguage?: Locale;
}

// German-speaking countries
const GERMAN_SPEAKING_COUNTRIES = [
  'DE', // Germany
  'AT', // Austria
  'LI', // Liechtenstein
];

// French-speaking countries
const FRENCH_SPEAKING_COUNTRIES = [
  'FR', // France
  'BE', // Belgium
  'CA', // Canada
  'LU', // Luxembourg
  'MC', // Monaco
  'CH', // Switzerland (French-speaking regions)
  'BF', // Burkina Faso
  'BI', // Burundi
  'BJ', // Benin
  'CD', // Democratic Republic of Congo
  'CF', // Central African Republic
  'CG', // Republic of Congo
  'CI', // Côte d'Ivoire
  'CM', // Cameroon
  'DJ', // Djibouti
  'GA', // Gabon
  'GN', // Guinea
  'HT', // Haiti
  'KM', // Comoros
  'MG', // Madagascar
  'ML', // Mali
  'NE', // Niger
  'RW', // Rwanda
  'SN', // Senegal
  'TD', // Chad
  'TG', // Togo
  'VU', // Vanuatu
];

// Spanish-speaking countries
const SPANISH_SPEAKING_COUNTRIES = [
  'ES', // Spain
  'MX', // Mexico
  'AR', // Argentina
  'CO', // Colombia
  'PE', // Peru
  'VE', // Venezuela
  'CL', // Chile
  'EC', // Ecuador
  'GT', // Guatemala
  'CU', // Cuba
  'BO', // Bolivia
  'DO', // Dominican Republic
  'HN', // Honduras
  'PY', // Paraguay
  'SV', // El Salvador
  'NI', // Nicaragua
  'CR', // Costa Rica
  'PA', // Panama
  'UY', // Uruguay
  'PR', // Puerto Rico
  'GQ', // Equatorial Guinea
];

// Italian-speaking countries
const ITALIAN_SPEAKING_COUNTRIES = [
  'IT', // Italy
  'CH', // Switzerland (Italian-speaking regions)
  'SM', // San Marino
  'VA', // Vatican City
];

// Dutch-speaking countries
const DUTCH_SPEAKING_COUNTRIES = [
  'NL', // Netherlands
  'BE', // Belgium (Dutch-speaking regions)
  'SR', // Suriname
  'AW', // Aruba
  'CW', // Curaçao
  'SX', // Sint Maarten
];


export function useGeolocation(): GeolocationData {
  const [geolocationData, setGeolocationData] = useState<GeolocationData>({});

  useEffect(() => {
    const detectLocation = async () => {
      try {
        // Try multiple IP geolocation services for reliability
        const services = [
          'https://ipapi.co/json/',
          'https://ip-api.com/json/',
          'https://ipinfo.io/json',
        ];

        for (const service of services) {
          try {
            const response = await fetch(service, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });

            if (response.ok) {
              const data = await response.json();
              
              // Handle different API response formats
              let countryCode = data.country_code || data.countryCode || data.country;
              
              if (countryCode) {
                countryCode = countryCode.toUpperCase();
                let detectedLanguage: Locale = 'en';
                if (GERMAN_SPEAKING_COUNTRIES.includes(countryCode)) {
                  detectedLanguage = 'de';
                } else if (FRENCH_SPEAKING_COUNTRIES.includes(countryCode)) {
                  detectedLanguage = 'fr';
                } else if (SPANISH_SPEAKING_COUNTRIES.includes(countryCode)) {
                  detectedLanguage = 'es';
                } else if (ITALIAN_SPEAKING_COUNTRIES.includes(countryCode)) {
                  detectedLanguage = 'it';
                } else if (DUTCH_SPEAKING_COUNTRIES.includes(countryCode)) {
                  detectedLanguage = 'nl';
                }
                
                setGeolocationData({
                  country: data.country_name || data.country,
                  countryCode,
                  detectedLanguage,
                });
                
                return; // Successfully detected, break out of loop
              }
            }
          } catch (error) {
            console.warn(`Geolocation service failed: ${service}`, error);
            continue; // Try next service
          }
        }
        
        // Fallback to browser language detection
        const browserLang = navigator.language || navigator.languages?.[0];
        if (browserLang) {
          const germanRegions = ['de', 'de-DE', 'de-AT', 'de-CH'];
          const frenchRegions = ['fr', 'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr-LU', 'fr-MC'];
          const spanishRegions = ['es', 'es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-PE', 'es-VE', 'es-CL', 'es-UY', 'es-PY', 'es-BO', 'es-EC', 'es-CR', 'es-PA', 'es-GT', 'es-HN', 'es-NI', 'es-SV', 'es-DO', 'es-CU', 'es-PR'];
          const italianRegions = ['it', 'it-IT', 'it-CH', 'it-SM', 'it-VA'];
          const dutchRegions = ['nl', 'nl-NL', 'nl-BE'];
          
          let detectedLanguage: Locale = 'en';
          if (germanRegions.some(region => browserLang.toLowerCase().startsWith(region.toLowerCase()))) {
            detectedLanguage = 'de';
          } else if (frenchRegions.some(region => browserLang.toLowerCase().startsWith(region.toLowerCase()))) {
            detectedLanguage = 'fr';
          } else if (spanishRegions.some(region => browserLang.toLowerCase().startsWith(region.toLowerCase()))) {
            detectedLanguage = 'es';
          } else if (italianRegions.some(region => browserLang.toLowerCase().startsWith(region.toLowerCase()))) {
            detectedLanguage = 'it';
          } else if (dutchRegions.some(region => browserLang.toLowerCase().startsWith(region.toLowerCase()))) {
            detectedLanguage = 'nl';
          }
          
          setGeolocationData({ detectedLanguage });
        }
        
      } catch (error) {
        console.warn('Geolocation detection failed:', error);
        // Default to English if all detection methods fail
        setGeolocationData({ detectedLanguage: 'en' });
      }
    };

    // Only run detection on first visit (when no locale preference is saved)
    if (typeof window !== 'undefined' && !localStorage.getItem('fase-locale')) {
      detectLocation();
    }
  }, []);

  return geolocationData;
}