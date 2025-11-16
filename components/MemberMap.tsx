'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getApprovedMembersForDirectory, getAllMembers } from '../lib/unified-member';
import type { UnifiedMember } from '../lib/unified-member';
// @ts-ignore - No types available for this package
import * as countryData from 'country-iso-to-coordinates';

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
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('business'); // 'all', 'business', 'markets'
  const [leafletLoaded, setLeafletLoaded] = useState(false);

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

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const approvedMembers = await getApprovedMembersForDirectory();
        
        // Count markets for debugging
        const totalMarkets = approvedMembers.reduce((count, member) => {
          return count + ((member as any).markets?.length || 0);
        }, 0);
        if (totalMarkets === 0) {
          console.log(`⚠️ No markets found across all approved members`);
        } else {
          console.log(`✅ Found ${totalMarkets} markets across approved members`);
        }
        
        setMembers(approvedMembers);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  // Filter and map members to their coordinates
  const mappedMembers = useMemo(() => {
    const results: (UnifiedMember & { coordinates: [number, number]; displayCountry: string; locationType: 'business' | 'market' })[] = [];
    
    members.forEach(member => {
      const memberData = member as any;
      const businessAddress = memberData.businessAddress;
      const markets = memberData.markets || [];
      
      // Filter by organization type if selected
      if (selectedType && member.organizationType !== selectedType) {
        return;
      }
      
      // Show ONLY business locations when business filter is selected
      if (selectedLocationFilter === 'business') {
        if (businessAddress?.country) {
          const coordinates = getCoordinatesForCountry(businessAddress.country);
          if (coordinates) {
            results.push({
              ...member,
              coordinates,
              displayCountry: businessAddress.country,
              locationType: 'business'
            });
          }
        }
      }
      
      // Show ONLY markets when markets filter is selected
      else if (selectedLocationFilter === 'markets') {
        if (markets && Array.isArray(markets)) {
          markets.forEach((market: string) => {
            const coordinates = getCoordinatesForCountry(market);
            if (coordinates) {
              results.push({
                ...member,
                coordinates,
                displayCountry: market,
                locationType: 'market'
              });
            }
          });
        }
      }
    });
    
    return results;
  }, [members, selectedType, selectedLocationFilter]);

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
              <option value="business">{translations.filters.business_locations}</option>
              <option value="markets">{translations.filters.market_locations}</option>
            </select>
          </div>
          <div className="text-sm text-fase-black">
            <p>{translations.member_count.replace('{{count}}', mappedMembers.length.toString())}</p>
          </div>
        </div>

        {mappedMembers.length === 0 ? (
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
                
                {mappedMembers.map((member, index) => {
                  // Create custom icon based on location type
                  const iconColor = member.locationType === 'business' ? '#3b82f6' : '#ea580c'; // blue for business, orange for market
                  
                  return (
                  <Marker
                    key={`${member.id}-${member.displayCountry}-${member.locationType}-${index}`}
                    position={member.coordinates}
                    icon={typeof window !== 'undefined' ? new (window as any).L.divIcon({
                      html: `<div style="background-color: ${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
                      className: 'custom-marker',
                      iconSize: [16, 16],
                      iconAnchor: [8, 8]
                    }) : undefined}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-semibold text-fase-navy mb-2">
                          {member.organizationName || member.personalName}
                        </h3>
                        
                        <div className="space-y-1 text-sm">
                          {member.organizationType && (
                            <div className="flex items-center">
                              <span className="font-medium text-gray-600 mr-2">
                                {translations.member_details.type}:
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                member.organizationType === 'MGA' ? 'bg-gray-100 text-gray-800' :
                                member.organizationType === 'carrier' ? 'bg-red-100 text-red-800' :
                                member.organizationType === 'provider' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {member.organizationType === 'MGA' ? translations.legend.mga :
                                 member.organizationType === 'carrier' ? translations.legend.carrier :
                                 member.organizationType === 'provider' ? translations.legend.provider :
                                 member.organizationType}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center">
                            <span className="font-medium text-gray-600 mr-2">
                              {member.locationType === 'business' ? 'Business Location:' : 'Market Location:'}
                            </span>
                            <span>{member.displayCountry}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <span className="font-medium text-gray-600 mr-2">
                              Location Type:
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              member.locationType === 'business' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {member.locationType === 'business' ? 'Business' : 'Market'}
                            </span>
                          </div>
                          
                          {member.email && (
                            <div className="flex items-center">
                              <span className="font-medium text-gray-600 mr-2">
                                {translations.member_details.contact}:
                              </span>
                              <a href={`mailto:${member.email}`} className="text-fase-blue hover:underline">
                                {member.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Legend */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-fase-navy mb-3">{translations.legend.title}</h3>
              
              {/* Organization Types */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2 text-sm">Organization Types</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-600 rounded-full mr-2"></div>
                    <span className="text-sm">{translations.legend.mga}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
                    <span className="text-sm">{translations.legend.carrier}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-600 rounded-full mr-2"></div>
                    <span className="text-sm">{translations.legend.provider}</span>
                  </div>
                </div>
              </div>
              
              {/* Location Types */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2 text-sm">Location Types</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
                    <span className="text-sm">Business Location</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-orange-600 rounded-full mr-2"></div>
                    <span className="text-sm">Market Location</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Helper text */}
            <p className="text-sm text-gray-600 text-center">
              {translations.click_marker}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}