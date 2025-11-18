'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getApprovedMembersForDirectory, getAllMembers } from '../lib/unified-member';
import type { UnifiedMember } from '../lib/unified-member';
// @ts-ignore - No types available for this package
import * as countryData from 'country-iso-to-coordinates';
// @ts-ignore - No types available for this package
import { feature } from 'topojson-client';
import countries from 'i18n-iso-countries';

// Register multiple locales for country names
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
countries.registerLocale(require("i18n-iso-countries/langs/es.json"));
countries.registerLocale(require("i18n-iso-countries/langs/fr.json"));
countries.registerLocale(require("i18n-iso-countries/langs/de.json"));
countries.registerLocale(require("i18n-iso-countries/langs/it.json"));
countries.registerLocale(require("i18n-iso-countries/langs/pt.json"));

// CountryDetails Component
function CountryDetails({ 
  country, 
  businessMembers, 
  marketMembers, 
  translations, 
  onClose 
}: {
  country: string;
  businessMembers: UnifiedMember[];
  marketMembers: UnifiedMember[];
  translations: any;
  onClose: () => void;
}) {
  const [selectedOrgType, setSelectedOrgType] = useState<string>('');

  // Combine and deduplicate members
  const allMembersSet = new Set<UnifiedMember>();
  businessMembers.forEach(member => allMembersSet.add(member));
  marketMembers.forEach(member => allMembersSet.add(member));
  const allMembers = Array.from(allMembersSet);

  // Get country name from ISO2 code in current locale
  const locale = translations.locale || 'en';
  const countryName = countries.getName(country, locale) || countries.getName(country, 'en') || country;

  // Filter members by organization type
  const filteredMembers = selectedOrgType 
    ? allMembers.filter(member => member.organizationType === selectedOrgType)
    : allMembers;

  // Get available organization types
  const availableOrgTypes = Array.from(new Set(allMembers.map(m => m.organizationType).filter(Boolean)));

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-fase-navy text-lg">{countryName}</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>
      
      {/* Stats */}
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-fase-navy">{filteredMembers.length}</div>
        <div className="text-sm text-gray-600">
          {selectedOrgType 
            ? (selectedOrgType === 'MGA' ? translations.legend.mga :
               selectedOrgType === 'carrier' ? translations.legend.carrier :
               selectedOrgType === 'provider' ? translations.legend.provider :
               selectedOrgType)
            : translations.sidebar?.total_members || 'Total Members'}
        </div>
      </div>

      {/* Organization Type Filter */}
      {availableOrgTypes.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedOrgType}
            onChange={(e) => setSelectedOrgType(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-fase-blue focus:border-transparent"
          >
            <option value="">{translations.sidebar?.all_types || 'All Types'}</option>
            {availableOrgTypes.map(type => (
              <option key={type} value={type}>
                {type === 'MGA' ? translations.legend.mga :
                 type === 'carrier' ? translations.legend.carrier :
                 type === 'provider' ? translations.legend.provider : type}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Member List */}
      <div className="flex-1 overflow-hidden">
        <h4 className="font-medium text-gray-700 mb-2 text-sm">{translations.sidebar?.members || 'Members'}:</h4>
        <div className="h-full overflow-y-auto space-y-1">
          {filteredMembers.map((member, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded">
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {member.organizationName || member.personalName}
                  </div>
                </div>
                {member.email && (
                  <a 
                    href={`mailto:${member.email}`}
                    className="text-blue-600 hover:text-blue-800 text-sm ml-2 flex-shrink-0"
                  >
                    ✉
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
);

// Helper function to get coordinates for a country code
const getCoordinatesForCountry = (countryCode: string): [number, number] | null => {
  try {
    const country = (countryData as any)[countryCode.toUpperCase()];
    if (country && country.coordinate && country.coordinate.length === 2) {
      const lat = parseFloat(country.coordinate[0]);
      const lon = parseFloat(country.coordinate[1]);
      if (!isNaN(lat) && !isNaN(lon)) {
        return [lat, lon];
      }
    }
  } catch (error) {
    console.warn(`Could not find coordinates for country code: ${countryCode}`, error);
  }
  return null;
};

// Custom marker colors for different organization types
const getMarkerColor = (type?: string) => {
  switch (type) {
    case 'MGA':
      return '#1f2937'; // navy
    case 'carrier':
      return '#dc2626'; // red
    case 'provider':
      return '#059669'; // green
    default:
      return '#6b7280'; // gray
  }
};

interface MemberMapProps {
  translations: {
    title: string;
    description: string;
    loading: string;
    member_count: string;
    click_marker: string;
    no_members: string;
    no_members_desc: string;
    member_details: {
      organization: string;
      type: string;
      location: string;
      contact: string;
      visit_profile: string;
    };
    legend: {
      title: string;
      mga: string;
      carrier: string;
      provider: string;
    };
    filters: {
      all_types: string;
      show_type: string;
      all_locations: string;
      business_locations: string;
      market_locations: string;
    };
  };
}

export default function MemberMap({ translations }: MemberMapProps) {
  const [members, setMembers] = useState<UnifiedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all'); // 'all', 'business', 'markets'
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Load Leaflet CSS and library
  useEffect(() => {
    const loadLeaflet = async () => {
      // Import Leaflet CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Import Leaflet library and set default icon
      const L = await import('leaflet');
      
      // Fix for default markers in webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      setLeafletLoaded(true);
    };

    loadLeaflet();
  }, []);

  // Load country boundaries
  useEffect(() => {
    const loadCountries = async () => {
      try {
        // Fetch the TopoJSON file
        const response = await fetch('/countries-50m.json');
        if (!response.ok) {
          throw new Error('Failed to load countries data');
        }
        const topology = await response.json();
        
        // Convert TopoJSON to GeoJSON
        const countries = feature(topology, topology.objects.countries as any);
        
        // Debug: log basic structure
        console.log('🌍 Loaded countries data with', countries.features?.length, 'countries');
        
        setCountriesGeoJson(countries);
      } catch (error) {
        console.error('Error loading countries:', error);
        // Fallback: try alternative CDN
        try {
          const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
          const topology = await response.json();
          const countries = feature(topology, topology.objects.countries as any);
          setCountriesGeoJson(countries);
        } catch (fallbackError) {
          console.error('Error loading countries from CDN:', fallbackError);
        }
      }
    };

    loadCountries();
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const approvedMembers = await getApprovedMembersForDirectory();
        
        // Count markets for debugging
        const totalMarkets = approvedMembers.reduce((count, member) => {
          return count + ((member as any).markets?.length || 0);
        }, 0);
        
        console.log(`🔍 Found ${approvedMembers.length} approved members with ${totalMarkets} total markets`);
        
        setMembers(approvedMembers);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  // Group members by country for business and markets separately
  const businessLocationsByCountry = useMemo(() => {
    const countryMap = new Map<string, UnifiedMember[]>();
    
    members.forEach(member => {
      const memberData = member as any;
      const businessAddress = memberData.businessAddress;
      
      // Filter by organization type if selected
      if (selectedType && member.organizationType !== selectedType) {
        return;
      }
      
      if (businessAddress?.country) {
        const countryCode = businessAddress.country;
        if (!countryMap.has(countryCode)) {
          countryMap.set(countryCode, []);
        }
        countryMap.get(countryCode)!.push(member);
      }
    });
    
    return countryMap;
  }, [members, selectedType]);

  const marketLocationsByCountry = useMemo(() => {
    const countryMap = new Map<string, UnifiedMember[]>();
    
    members.forEach(member => {
      const memberData = member as any;
      const markets = memberData.markets || [];
      
      // Filter by organization type if selected
      if (selectedType && member.organizationType !== selectedType) {
        return;
      }
      
      if (markets && Array.isArray(markets)) {
        markets.forEach(countryCode => {
          if (!countryMap.has(countryCode)) {
            countryMap.set(countryCode, []);
          }
          countryMap.get(countryCode)!.push(member);
        });
      }
    });
    
    return countryMap;
  }, [members, selectedType]);

  // Filtered countries based on location filter
  const visibleCountriesWithMembers = useMemo(() => {
    const allCountries = new Set<string>();
    
    if (selectedLocationFilter === 'all' || selectedLocationFilter === 'business') {
      businessLocationsByCountry.forEach((_, country) => allCountries.add(country));
    }
    if (selectedLocationFilter === 'all' || selectedLocationFilter === 'markets') {
      marketLocationsByCountry.forEach((_, country) => allCountries.add(country));
    }
    
    return Array.from(allCountries);
  }, [businessLocationsByCountry, marketLocationsByCountry, selectedLocationFilter]);

  // All countries for counting (unfiltered)
  const allCountriesWithMembers = useMemo(() => {
    const allCountries = new Set<string>();
    businessLocationsByCountry.forEach((_, country) => allCountries.add(country));
    marketLocationsByCountry.forEach((_, country) => allCountries.add(country));
    return Array.from(allCountries);
  }, [businessLocationsByCountry, marketLocationsByCountry]);

  // Count unique members (not duplicated across countries)
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      if (selectedType && member.organizationType !== selectedType) {
        return false;
      }
      return true;
    });
  }, [members, selectedType]);


  const availableTypes = Array.from(new Set(
    members.map(member => member.organizationType).filter(Boolean)
  )).sort();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-fase-light-gold rounded-lg p-6">
          <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">
            {translations.title}
          </h2>
          <p className="text-fase-black mb-6">{translations.description}</p>
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto mb-4"></div>
              <p className="text-fase-black">{translations.loading}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!leafletLoaded) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-fase-light-gold rounded-lg p-6">
          <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">
            {translations.title}
          </h2>
          <p className="text-fase-black mb-6">{translations.description}</p>
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto mb-4"></div>
              <p className="text-fase-black">Loading map...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-fase-light-gold rounded-lg p-6">
        <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">
          {translations.title}
        </h2>
        <p className="text-fase-black mb-6">{translations.description}</p>
        
        {/* Filters and Stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Organization Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-blue focus:border-transparent"
            >
              <option value="">{translations.filters.all_types}</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'MGA' ? translations.legend.mga :
                   type === 'carrier' ? translations.legend.carrier :
                   type === 'provider' ? translations.legend.provider : type}
                </option>
              ))}
            </select>
            
            {/* Location Type Filter */}
            <select
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-blue focus:border-transparent"
            >
              <option value="all">{translations.filters.all_locations}</option>
              <option value="business">{translations.filters.business_locations}</option>
              <option value="markets">{translations.filters.market_locations}</option>
            </select>
          </div>
          <div className="text-sm text-fase-black">
            <p>{translations.member_count.replace('{{count}}', filteredMembers.length.toString())}</p>
            <p className="text-xs text-gray-500">{visibleCountriesWithMembers.length} countries</p>
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3v10" />
            </svg>
            <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">
              {translations.no_members}
            </h3>
            <p className="text-fase-black">{translations.no_members_desc}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Map and Sidebar Container */}
            <div className="flex h-[500px] w-full rounded-lg overflow-hidden border border-gray-200 relative">
              {/* Map */}
              <div className={`h-full transition-all duration-300 ${selectedCountry ? 'w-2/3' : 'w-full'}`}>
                <style jsx global>{`
                  .leaflet-control-attribution {
                    display: none !important;
                  }
                `}</style>
                <MapContainer
                  center={[50.1109, 8.6821]} // Center on Frankfurt
                  zoom={4}
                  style={{ height: '100%', width: '100%' }}
                  maxZoom={10}
                  minZoom={3}
                >
                  <TileLayer
                    attribution=''
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                  />
                  
                  {/* Country boundaries */}
                  {countriesGeoJson && (
                    <GeoJSON
                      data={countriesGeoJson}
                      style={(feature: any) => {
                        const numericId = feature?.id;
                        
                        // Check if this country has business locations
                        const hasBusinessLocation = (selectedLocationFilter === 'all' || selectedLocationFilter === 'business') && 
                          Array.from(businessLocationsByCountry.keys()).some(iso2Code => {
                            try {
                              const numericCode = countries.alpha2ToNumeric(iso2Code);
                              return numericCode && numericCode.toString() === numericId?.toString();
                            } catch (error) {
                              return false;
                            }
                          });
                        
                        // Check if this country has markets
                        const hasMarketLocation = (selectedLocationFilter === 'all' || selectedLocationFilter === 'markets') &&
                          Array.from(marketLocationsByCountry.keys()).some(iso2Code => {
                            try {
                              const numericCode = countries.alpha2ToNumeric(iso2Code);
                              return numericCode && numericCode.toString() === numericId?.toString();
                            } catch (error) {
                              return false;
                            }
                          });
                        
                        // Color priority: Business (blue) > Market (green) > Both (purple) > None (gray)
                        let fillColor = '#f8f9fa'; // Default gray
                        let borderColor = '#d1d5db';
                        let fillOpacity = 0.1;
                        let weight = 1;
                        
                        if (hasBusinessLocation && hasMarketLocation && selectedLocationFilter === 'all') {
                          // Both business and market - darker navy
                          fillColor = '#1e3a8a';
                          borderColor = '#1e3a8a';
                          fillOpacity = 0.4;
                          weight = 2;
                        } else if (hasBusinessLocation) {
                          // Business location only - FASE navy
                          fillColor = '#1f2937';
                          borderColor = '#1f2937';
                          fillOpacity = 0.3;
                          weight = 2;
                        } else if (hasMarketLocation) {
                          // Market location only - FASE gold
                          fillColor = '#d4af37';
                          borderColor = '#b8941f';
                          fillOpacity = 0.3;
                          weight = 2;
                        }
                        
                        return {
                          fillColor,
                          fillOpacity,
                          color: borderColor,
                          weight,
                          opacity: 0.8
                        };
                      }}
                      onEachFeature={(feature: any, layer: any) => {
                        // Convert numeric ID back to ISO2 code to match our member data
                        const numericId = feature?.id;
                        
                        // Find ISO2 code that matches this numeric ID
                        let iso2Code = null;
                        for (const memberCountryCode of visibleCountriesWithMembers) {
                          try {
                            const numericCode = countries.alpha2ToNumeric(memberCountryCode);
                            if (numericCode && numericCode.toString() === numericId?.toString()) {
                              iso2Code = memberCountryCode;
                              break;
                            }
                          } catch (error) {
                            // Skip invalid conversions
                          }
                        }
                        
                        // Get members from both business and market locations based on filter
                        let businessMembers: UnifiedMember[] = [];
                        let marketMembers: UnifiedMember[] = [];
                        
                        if (iso2Code) {
                          if (selectedLocationFilter === 'all' || selectedLocationFilter === 'business') {
                            businessMembers = businessLocationsByCountry.get(iso2Code) || [];
                          }
                          if (selectedLocationFilter === 'all' || selectedLocationFilter === 'markets') {
                            marketMembers = marketLocationsByCountry.get(iso2Code) || [];
                          }
                        }
                        
                        // Combine and deduplicate members
                        const allMembersSet = new Set<UnifiedMember>();
                        businessMembers.forEach(member => allMembersSet.add(member));
                        marketMembers.forEach(member => allMembersSet.add(member));
                        const membersInCountry = Array.from(allMembersSet);
                        
                        if (membersInCountry.length > 0) {
                          layer.on('click', () => {
                            setSelectedCountry(iso2Code);
                          });
                          
                          // Add hover effect
                          layer.on('mouseover', () => {
                            layer.setStyle({
                              fillOpacity: 0.5,
                              weight: 3
                            });
                          });
                          
                          layer.on('mouseout', () => {
                            layer.setStyle({
                              fillOpacity: 0.3,
                              weight: 2
                            });
                          });
                        }
                      }}
                    />
                  )}
                </MapContainer>
              </div>

              {/* Sidebar */}
              {selectedCountry && (
                <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col">
                  <CountryDetails 
                    country={selectedCountry}
                    businessMembers={businessLocationsByCountry.get(selectedCountry) || []}
                    marketMembers={marketLocationsByCountry.get(selectedCountry) || []}
                    translations={translations}
                    onClose={() => setSelectedCountry(null)}
                  />
                </div>
              )}
            </div>


          </div>
        )}
      </div>
    </div>
  );
}