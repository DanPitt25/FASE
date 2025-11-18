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

  // Combined map for country highlighting
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
            
          </div>
          <div className="text-sm text-fase-black">
            <p>{translations.member_count.replace('{{count}}', filteredMembers.length.toString())}</p>
            <p className="text-xs text-gray-500">{allCountriesWithMembers.length} countries</p>
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
            {/* Map */}
            <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-200">
              <style jsx global>{`
                .leaflet-control-attribution {
                  display: none !important;
                }
              `}</style>
              <MapContainer
                center={[54.5260, 15.2551]} // Center on Europe
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
                      const hasBusinessLocation = Array.from(businessLocationsByCountry.keys()).some(iso2Code => {
                        try {
                          const numericCode = countries.alpha2ToNumeric(iso2Code);
                          return numericCode && numericCode.toString() === numericId?.toString();
                        } catch (error) {
                          return false;
                        }
                      });
                      
                      // Check if this country has markets
                      const hasMarketLocation = Array.from(marketLocationsByCountry.keys()).some(iso2Code => {
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
                      
                      if (hasBusinessLocation && hasMarketLocation) {
                        // Both business and market - purple
                        fillColor = '#8b5cf6';
                        borderColor = '#7c3aed';
                        fillOpacity = 0.4;
                        weight = 2;
                      } else if (hasBusinessLocation) {
                        // Business location only - blue
                        fillColor = '#3b82f6';
                        borderColor = '#1e40af';
                        fillOpacity = 0.3;
                        weight = 2;
                      } else if (hasMarketLocation) {
                        // Market location only - green
                        fillColor = '#10b981';
                        borderColor = '#059669';
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
                      const countryName = feature?.properties?.name;
                      
                      // Find ISO2 code that matches this numeric ID
                      let iso2Code = null;
                      for (const memberCountryCode of allCountriesWithMembers) {
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
                      
                      // Get members from both business and market locations
                      const businessMembers = iso2Code ? businessLocationsByCountry.get(iso2Code) || [] : [];
                      const marketMembers = iso2Code ? marketLocationsByCountry.get(iso2Code) || [] : [];
                      
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
                        
                        // Bind popup with member list showing business vs market distinction
                        const popupContent = `
                          <div style="padding: 8px; min-width: 250px;">
                            <h3 style="font-weight: bold; color: #1e3a8a; margin-bottom: 8px; font-size: 16px;">
                              ${countryName} (${membersInCountry.length} member${membersInCountry.length > 1 ? 's' : ''})
                            </h3>
                            <div style="max-height: 200px; overflow-y: auto;">
                              ${membersInCountry.map(member => {
                                const isBusinessLocation = businessMembers.includes(member);
                                const isMarketLocation = marketMembers.includes(member);
                                let locationTypes = [];
                                if (isBusinessLocation) locationTypes.push('<span style="background: #3b82f6; color: white; padding: 1px 4px; border-radius: 2px; font-size: 10px;">BUSINESS</span>');
                                if (isMarketLocation) locationTypes.push('<span style="background: #10b981; color: white; padding: 1px 4px; border-radius: 2px; font-size: 10px;">MARKET</span>');
                                
                                return `
                                  <div style="margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
                                    <div style="font-weight: 600; color: #1e3a8a; margin-bottom: 4px;">
                                      ${member.organizationName || member.personalName}
                                    </div>
                                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">
                                      Type: <span style="background: #e5e7eb; padding: 2px 6px; border-radius: 2px;">
                                        ${member.organizationType === 'MGA' ? translations.legend.mga :
                                          member.organizationType === 'carrier' ? translations.legend.carrier :
                                          member.organizationType === 'provider' ? translations.legend.provider :
                                          member.organizationType}
                                      </span>
                                    </div>
                                    <div style="font-size: 11px; margin-bottom: 4px;">
                                      ${locationTypes.join(' ')}
                                    </div>
                                    ${member.email ? `
                                      <div style="font-size: 12px; color: #6b7280;">
                                        Contact: <a href="mailto:${member.email}" style="color: #3b82f6; text-decoration: underline;">
                                          ${member.email}
                                        </a>
                                      </div>
                                    ` : ''}
                                  </div>
                                `;
                              }).join('')}
                            </div>
                          </div>
                        `;
                        
                        layer.bindPopup(popupContent);
                      }
                    }}
                  />
                )}
              </MapContainer>
            </div>

            {/* Legend */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-fase-navy mb-3">{translations.legend.title}</h3>
              
              {/* Location Types */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2 text-sm">Location Types</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 opacity-30 border border-blue-700 mr-2"></div>
                    <span className="text-sm">Business locations</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 opacity-30 border border-green-700 mr-2"></div>
                    <span className="text-sm">Market locations</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 opacity-40 border border-purple-700 mr-2"></div>
                    <span className="text-sm">Business + Market</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 opacity-50 border border-gray-400 mr-2"></div>
                    <span className="text-sm">Other countries</span>
                  </div>
                </div>
              </div>
              
              {/* Organization Types */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2 text-sm">Organization Types</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-600 rounded mr-2"></div>
                    <span className="text-sm">{translations.legend.mga}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-600 rounded mr-2"></div>
                    <span className="text-sm">{translations.legend.carrier}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-600 rounded mr-2"></div>
                    <span className="text-sm">{translations.legend.provider}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Helper text */}
            <p className="text-sm text-gray-600 text-center">
              Click on any colored country to see FASE members. Blue = business locations, Green = markets, Purple = both.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}