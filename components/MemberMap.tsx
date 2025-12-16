'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getApprovedMembersForDirectory, getAllMembers } from '../lib/unified-member';
import type { UnifiedMember } from '../lib/unified-member';
// @ts-ignore - No types available for this package
import { feature } from 'topojson-client';
import countries from 'i18n-iso-countries';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { updateUserProfile, getUserProfile } from '../lib/firestore';

// Register multiple locales for country names
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
countries.registerLocale(require("i18n-iso-countries/langs/es.json"));
countries.registerLocale(require("i18n-iso-countries/langs/fr.json"));
countries.registerLocale(require("i18n-iso-countries/langs/de.json"));
countries.registerLocale(require("i18n-iso-countries/langs/it.json"));
countries.registerLocale(require("i18n-iso-countries/langs/pt.json"));

// Helper function to deduplicate members from business and market arrays
const deduplicateMembers = (businessMembers: UnifiedMember[], marketMembers: UnifiedMember[]): UnifiedMember[] => {
  const allMembersSet = new Set<UnifiedMember>();
  businessMembers.forEach(member => allMembersSet.add(member));
  marketMembers.forEach(member => allMembersSet.add(member));
  return Array.from(allMembersSet);
};

// CompanyDetails Component
function CompanyDetails({
  company,
  translations,
  onClose
}: {
  company: UnifiedMember;
  translations: any;
  onClose: () => void;
}) {
  const memberData = company as any;
  
  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-fase-navy text-lg">
          {company.organizationName || company.personalName}
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>
      
      {/* Company Type */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-1">Organization Type</div>
        <div className="text-fase-navy">
          {company.organizationType === 'MGA' ? translations.legend.mga :
           company.organizationType === 'carrier' ? translations.legend.carrier :
           company.organizationType === 'provider' ? translations.legend.provider :
           company.organizationType}
        </div>
      </div>

      {/* Business Location */}
      {memberData.businessAddress?.country && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-1">Business Location</div>
          <div className="text-gray-900">
            {memberData.businessAddress.city && `${memberData.businessAddress.city}, `}
            {(() => {
              const locale = translations.locale || 'en';
              return countries.getName(memberData.businessAddress.country, locale) || countries.getName(memberData.businessAddress.country, 'en') || memberData.businessAddress.country;
            })()}
          </div>
        </div>
      )}

      {/* Market Locations */}
      {memberData.markets && memberData.markets.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-1">Market Locations</div>
          <div className="text-gray-900">
            {memberData.markets.map((market: string, index: number) => {
              const locale = translations.locale || 'en';
              const countryName = countries.getName(market, locale) || countries.getName(market, 'en') || market;
              return (
                <span key={market}>
                  {countryName}
                  {index < memberData.markets.length - 1 && ', '}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Lines of Business */}
      {company.linesOfBusiness && company.linesOfBusiness.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-1">Lines of Business</div>
          <div className="text-gray-900">
            {company.linesOfBusiness.map((line: string, index: number) => (
              <span key={index}>
                {line.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {index < company.linesOfBusiness!.length - 1 && ', '}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact Info */}
      {company.email && (
        <div className="mt-auto pt-4 border-t border-gray-200">
          <a 
            href={`mailto:${company.email}`}
            className="inline-flex items-center px-4 py-2 bg-fase-navy text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors"
          >
            <span className="mr-2">✉</span>
            Contact
          </a>
        </div>
      )}
    </div>
  );
}

// CompanyCountryDetails Component
function CompanyCountryDetails({
  company,
  countryCode,
  translations,
  onClose
}: {
  company: UnifiedMember;
  countryCode: string;
  translations: any;
  onClose: () => void;
}) {
  const memberData = company as any;
  const locale = translations.locale || 'en';
  const countryName = countries.getName(countryCode, locale) || countries.getName(countryCode, 'en') || countryCode;
  
  // Use only real lines of business from Firestore
  const linesOfBusiness = company.linesOfBusiness || [];
  const isBusinessLocation = memberData.businessAddress?.country === countryCode;
  const isMarketLocation = memberData.markets?.includes(countryCode);
  
  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-fase-navy text-lg">
          {company.organizationName || company.personalName}
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>
      
      {/* Country Context */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="font-medium text-fase-navy mb-1">{countryName} Operations</div>
        <div className="text-sm text-gray-600">
          {isBusinessLocation && isMarketLocation && 'Business headquarters and market operations'}
          {isBusinessLocation && !isMarketLocation && 'Business headquarters'}
          {!isBusinessLocation && isMarketLocation && 'Market operations only'}
        </div>
      </div>

      {/* Lines of Business - only show if data exists */}
      {linesOfBusiness.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-700 mb-3">Lines of Business in {countryName}</div>
          <div className="space-y-2">
            {linesOfBusiness.map((line, index) => (
              <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                <span className="text-sm text-gray-900">{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Status */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Market Status</div>
        <div className="flex items-center space-x-4 text-sm">
          <div className={`flex items-center ${isBusinessLocation ? 'text-fase-navy' : 'text-gray-400'}`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${isBusinessLocation ? 'bg-fase-navy' : 'bg-gray-300'}`}></div>
            Business Location
          </div>
          <div className={`flex items-center ${isMarketLocation ? 'text-yellow-600' : 'text-gray-400'}`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${isMarketLocation ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
            Market Territory
          </div>
        </div>
      </div>

      {/* Contact Info */}
      {company.email && (
        <div className="mt-auto pt-4 border-t border-gray-200">
          <a 
            href={`mailto:${company.email}?subject=Inquiry about ${countryName} operations`}
            className="inline-flex items-center px-4 py-2 bg-fase-navy text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors"
          >
            <span className="mr-2">✉</span>
            Contact about {countryName}
          </a>
        </div>
      )}
    </div>
  );
}

// MemberCard Component
function MemberCard({ 
  member, 
  country, 
  translations, 
  onViewDetails 
}: { 
  member: UnifiedMember; 
  country: string; 
  translations: any; 
  onViewDetails: (member: UnifiedMember) => void; 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const memberData = member as any;
  const locale = translations.locale || 'en';
  const countryName = countries.getName(country, locale) || countries.getName(country, 'en') || country;
  
  const isBusinessLocation = memberData.businessAddress?.country === country;
  const isMarketLocation = memberData.markets?.includes(country);
  
  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden">
      {/* Header - Always Visible */}
      <div 
        className="p-3 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 text-sm truncate">
              {member.organizationName || member.personalName}
            </div>
            <div className="text-xs text-gray-500">
              {member.organizationType === 'MGA' ? translations.legend.mga :
               member.organizationType === 'carrier' ? translations.legend.carrier :
               member.organizationType === 'provider' ? translations.legend.provider :
               member.organizationType}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Status indicators */}
            <div className="flex space-x-1">
              {isBusinessLocation && (
                <div className="w-2 h-2 bg-fase-navy rounded-full" title="Business Location"></div>
              )}
              {isMarketLocation && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Market Territory"></div>
              )}
            </div>
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-200">
          <div className="space-y-2 mt-2">
            {/* Operation Type */}
            <div className="text-xs">
              <span className="text-gray-600">Operations in {countryName}: </span>
              <span className="text-gray-900">
                {isBusinessLocation && isMarketLocation && 'Headquarters & Market'}
                {isBusinessLocation && !isMarketLocation && 'Headquarters'}
                {!isBusinessLocation && isMarketLocation && 'Market Territory'}
              </span>
            </div>
            
            {/* Business Address City */}
            {isBusinessLocation && memberData.businessAddress?.city && (
              <div className="text-xs">
                <span className="text-gray-600">City: </span>
                <span className="text-gray-900">{memberData.businessAddress.city}</span>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(member);
                }}
                className="text-xs text-fase-navy hover:text-fase-navy font-medium underline"
              >
                View Details
              </button>
              {member.email && (
                <a 
                  href={`mailto:${member.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                >
                  <span className="mr-1">✉</span>
                  Contact
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// CountryDetails Component
function CountryDetails({ 
  country, 
  businessMembers, 
  marketMembers, 
  translations, 
  onClose,
  setSelectedCompany,
  setSelectedCountry
}: {
  country: string;
  businessMembers: UnifiedMember[];
  marketMembers: UnifiedMember[];
  translations: any;
  onClose: () => void;
  setSelectedCompany: (member: UnifiedMember) => void;
  setSelectedCountry: (country: string) => void;
}) {
  // Combine and deduplicate members
  const allMembers = deduplicateMembers(businessMembers, marketMembers);

  // Get country name from ISO2 code in current locale
  const locale = translations.locale || 'en';
  const countryName = countries.getName(country, locale) || countries.getName(country, 'en') || country;

  // All members are MGAs, so no filtering needed
  const filteredMembers = allMembers;

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
          {filteredMembers.length === 1 ? translations.legend.mga : translations.legend.mga_plural || translations.legend.mga}
        </div>
      </div>

      {/* Member List */}
      <div className="flex-1 overflow-hidden">
        <h4 className="font-medium text-gray-700 mb-2 text-sm">{translations.sidebar?.members || 'Members'}:</h4>
        <div className="h-full overflow-y-auto space-y-2">
          {filteredMembers.map((member, index) => (
            <MemberCard 
              key={index} 
              member={member} 
              country={country}
              translations={translations}
              onViewDetails={(selectedMember) => {
                // Close current sidebar and open company details
                onClose();
                // Set the selected company and open company details
                setSelectedCompany(selectedMember);
                setSelectedCountry('company-details');
              }}
            />
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
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
);



interface MemberMapProps {
  translations: {
    title: string;
    description: string;
    loading: string;
    member_count: string;
    no_members: string;
    no_members_desc: string;
    legend: {
      title: string;
      mga: string;
      mga_plural?: string;
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
    sidebar?: {
      total_members: string;
      all_types: string;
      members: string;
    };
    search?: {
      placeholder: string;
      showing: string;
      clear_filter: string;
      no_results: string;
    };
    my_company?: {
      show_button: string;
      title: string;
      edit_markets: string;
      add_market: string;
      remove_market: string;
      lines_of_business: string;
      select_lines: string;
      save_changes: string;
      saving: string;
      market_added: string;
      market_removed: string;
      changes_saved: string;
      error_saving: string;
    };
  };
}

// Lines of Business from registration component
const LINES_OF_BUSINESS = [
  'accident_health', 'aviation', 'bloodstock', 'casualty', 'construction',
  'cyber', 'energy', 'event_cancellation', 'fine_art_specie', 'legal_expenses',
  'life', 'livestock', 'marine', 'management_liability', 'motor_commercial',
  'motor_personal', 'pet', 'political_risk', 'professional_indemnity',
  'property_commercial', 'property_personal', 'surety', 'trade_credit',
  'travel', 'warranty_indemnity', 'other', 'other_2', 'other_3'
];

// MyCompanyView Component
function MyCompanyView({
  member,
  user,
  translations,
  editingMarkets,
  setEditingMarkets,
  markets,
  setMarkets,
  addMarket,
  removeMarket,
  onClose
}: {
  member: any;
  user: any;
  translations: any;
  editingMarkets: boolean;
  setEditingMarkets: (editing: boolean) => void;
  markets: string[];
  setMarkets: (markets: string[]) => void;
  addMarket: (countryCode: string) => void;
  removeMarket: (countryCode: string) => void;
  onClose: () => void;
}) {
  const [marketLinesOfBusiness, setMarketLinesOfBusiness] = useState<{[key: string]: string[]}>({});
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const locale = translations.locale || 'en';

  // Load existing data from user profile
  useEffect(() => {
    const loadExistingData = async () => {
      if (user?.uid) {
        try {
          const userProfile = await getUserProfile(user.uid);
          if (userProfile) {
            if (userProfile.markets) {
              setMarkets(userProfile.markets);
            }
            if (userProfile.marketLinesOfBusiness) {
              setMarketLinesOfBusiness(userProfile.marketLinesOfBusiness);
            }
          }
        } catch (error) {
          console.error('Error loading existing data:', error);
        }
      }
    };

    loadExistingData();
  }, [user?.uid]);

  // Save changes to database
  const handleSave = async () => {
    if (!user?.uid) {
      setMessage({ type: 'error', text: 'No user authentication found' });
      return;
    }

    setSaving(true);
    try {
      // Clean up empty lines of business before saving
      const cleanedMarketLinesOfBusiness = Object.fromEntries(
        Object.entries(marketLinesOfBusiness).map(([countryCode, lines]) => [
          countryCode,
          lines.filter(line => line !== '')
        ])
      );

      // Save to user's Account document
      await updateUserProfile(user.uid, {
        marketLinesOfBusiness: cleanedMarketLinesOfBusiness,
        markets // Also update the markets array
      });
      
      setMessage({ type: 'success', text: 'Changes saved successfully' });
      setEditingMarkets(false); // Exit edit mode after successful save
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: 'Error saving changes' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMarket = (countryCode: string) => {
    removeMarket(countryCode);
    // Remove lines of business for this market
    const newMarketLinesOfBusiness = { ...marketLinesOfBusiness };
    delete newMarketLinesOfBusiness[countryCode];
    setMarketLinesOfBusiness(newMarketLinesOfBusiness);
  };

  const updateMarketLinesOfBusiness = (countryCode: string, lines: string[]) => {
    setMarketLinesOfBusiness({
      ...marketLinesOfBusiness,
      [countryCode]: lines
    });
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-fase-navy">
          {member?.organizationName || member?.personalName}
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Markets Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Markets</h4>
          <button
            onClick={() => setEditingMarkets(!editingMarkets)}
            className="px-4 py-2 text-sm bg-fase-navy text-white rounded-lg hover:bg-opacity-90"
          >
            {editingMarkets ? 'Done' : 'Edit Markets'}
          </button>
        </div>

        {editingMarkets && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700">
              Click countries on the map to add or remove markets
            </div>
          </div>
        )}

        <div className="space-y-4">
          {markets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-base mb-2">No markets configured</div>
              <div className="text-sm">Click &quot;Edit Markets&quot; to add markets</div>
            </div>
          )}
          
          {markets.map(countryCode => (
            <div key={countryCode} className="border border-gray-300 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-semibold text-gray-900">
                  {countries.getName(countryCode, locale) || countryCode}
                </h5>
                {editingMarkets && (
                  <button
                    onClick={() => handleRemoveMarket(countryCode)}
                    className="px-3 py-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {editingMarkets ? (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Lines of Business
                    </label>
                    <button
                      onClick={() => {
                        const currentLines = marketLinesOfBusiness[countryCode] || [];
                        updateMarketLinesOfBusiness(countryCode, [...currentLines, '']);
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      + Add Line
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {(marketLinesOfBusiness[countryCode] || ['']).map((selectedLine, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <select
                          value={selectedLine}
                          onChange={(e) => {
                            const currentLines = marketLinesOfBusiness[countryCode] || [];
                            const newLines = [...currentLines];
                            newLines[index] = e.target.value;
                            // Remove empty strings except for the last one
                            const filteredLines = newLines.filter((line, i) => line !== '' || i === newLines.length - 1);
                            updateMarketLinesOfBusiness(countryCode, filteredLines);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        >
                          <option value="">Select a line of business...</option>
                          {LINES_OF_BUSINESS.map(line => (
                            <option key={line} value={line}>
                              {line.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                        {(marketLinesOfBusiness[countryCode] || []).length > 1 && (
                          <button
                            onClick={() => {
                              const currentLines = marketLinesOfBusiness[countryCode] || [];
                              const newLines = currentLines.filter((_, i) => i !== index);
                              updateMarketLinesOfBusiness(countryCode, newLines.length > 0 ? newLines : ['']);
                            }}
                            className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {marketLinesOfBusiness[countryCode] && marketLinesOfBusiness[countryCode].filter(line => line !== '').length > 0 ? (
                    <div className="text-sm text-gray-600">
                      {marketLinesOfBusiness[countryCode].filter(line => line !== '').map(line => 
                        line.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      ).join(', ')}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">No lines of business configured</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save Button - only show in edit mode */}
      {editingMarkets && (
        <div className="mt-auto pt-6 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              onClick={() => setEditingMarkets(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemberMap({ translations }: MemberMapProps) {
  const { user, member } = useUnifiedAuth();
  const [members, setMembers] = useState<UnifiedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all'); // 'all', 'business', 'markets'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredCompanies, setFilteredCompanies] = useState<UnifiedMember[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<UnifiedMember | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [countriesGeoJson, setCountriesGeoJson] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showMyCompany, setShowMyCompany] = useState(false);
  
  // Market editing state - shared between main component and MyCompanyView
  const [editingMarkets, setEditingMarkets] = useState(false);
  const [markets, setMarkets] = useState<string[]>([]);
  
  
  // Market management functions
  const addMarket = (countryCode: string) => {
    if (!markets.includes(countryCode)) {
      setMarkets([...markets, countryCode]);
    }
  };

  const removeMarket = (countryCode: string) => {
    setMarkets(markets.filter(m => m !== countryCode));
  };

  // Load user's markets when component mounts
  useEffect(() => {
    const loadUserMarkets = async () => {
      if (user?.uid) {
        try {
          const userProfile = await getUserProfile(user.uid);
          if (userProfile?.markets) {
            setMarkets(userProfile.markets);
          }
        } catch (error) {
          console.error('Error loading user markets:', error);
        }
      }
    };

    loadUserMarkets();
  }, [user?.uid]);

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
        
        // Filter to only include MGAs
        const mgaMembers = approvedMembers.filter(member => member.organizationType === 'MGA');
        
        // Count markets for debugging
        const totalMarkets = mgaMembers.reduce((count, member) => {
          return count + ((member as any).markets?.length || 0);
        }, 0);
        
        console.log(`🔍 Found ${mgaMembers.length} MGA members with ${totalMarkets} total markets`);
        
        setMembers(mgaMembers);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  // Efficient search filtering with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCompanies([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = members.filter(member => {
      const orgName = member.organizationName?.toLowerCase() || '';
      const personalName = member.personalName?.toLowerCase() || '';
      return orgName.includes(query) || personalName.includes(query);
    });

    setFilteredCompanies(filtered);
  }, [searchQuery, members]);

  // Handle company selection
  const handleCompanySelect = (member: UnifiedMember) => {
    setSelectedCompany(member);
    setSearchQuery('');
    setFilteredCompanies([]);
    setSelectedCountry('company-details'); // Use special indicator for company details
  };

  // Group members by country for business and markets separately
  const businessLocationsByCountry = useMemo(() => {
    const countryMap = new Map<string, UnifiedMember[]>();
    
    // Filter members based on company selection
    const membersToProcess = selectedCompany ? [selectedCompany] : members;
    
    membersToProcess.forEach(member => {
      const memberData = member as any;
      const businessAddress = memberData.businessAddress;
      
      if (businessAddress?.country) {
        const countryCode = businessAddress.country;
        if (!countryMap.has(countryCode)) {
          countryMap.set(countryCode, []);
        }
        countryMap.get(countryCode)!.push(member);
      }
    });
    
    return countryMap;
  }, [members, selectedCompany]);

  const marketLocationsByCountry = useMemo(() => {
    const countryMap = new Map<string, UnifiedMember[]>();
    
    // Filter members based on company selection
    const membersToProcess = selectedCompany ? [selectedCompany] : members;
    
    membersToProcess.forEach(member => {
      const memberData = member as any;
      const markets = memberData.markets || [];
      
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
  }, [members, selectedCompany]);

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

  // All countries that should be interactive (either have members OR we're in edit mode)
  const allInteractiveCountries = useMemo(() => {
    const allCountries = new Set<string>();
    
    // Add countries with members
    businessLocationsByCountry.forEach((_, country) => allCountries.add(country));
    marketLocationsByCountry.forEach((_, country) => allCountries.add(country));
    
    // In edit mode, add ALL world countries
    if (showMyCompany && editingMarkets) {
      const worldCountries = countries.getNames('en', {select: 'official'});
      if (worldCountries) {
        Object.keys(worldCountries).forEach(countryCode => {
          allCountries.add(countryCode);
        });
      }
    }
    
    return Array.from(allCountries);
  }, [businessLocationsByCountry, marketLocationsByCountry, showMyCompany, editingMarkets]);

  // Count unique members (not duplicated across countries)
  const filteredMembers = useMemo(() => {
    if (selectedCompany) {
      return [selectedCompany];
    }
    return members; // All members are already filtered to MGAs only
  }, [members, selectedCompany]);



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
        
        {/* Company Search */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder={translations.search?.placeholder || "Search for a company..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent text-base"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCompany(null);
                  setSelectedCountry(null);
                  setFilteredCompanies([]);
                  setShowMyCompany(false);
                  setEditingMarkets(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {filteredCompanies.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCompanies.map((member, index) => (
                  <button
                    key={index}
                    onClick={() => handleCompanySelect(member)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none"
                  >
                    <div className="font-medium text-gray-900">
                      {member.organizationName || member.personalName}
                    </div>
                    {member.organizationType && (
                      <div className="text-sm text-gray-500">
                        {member.organizationType === 'MGA' ? translations.legend.mga :
                         member.organizationType === 'carrier' ? translations.legend.carrier :
                         member.organizationType === 'provider' ? translations.legend.provider :
                         member.organizationType}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Filters and Stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
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
              <div className={`h-full transition-all duration-300 ${(selectedCountry || showMyCompany) ? 'w-2/3' : 'w-full'} relative`}>
                <style jsx global>{`
                  .leaflet-control-attribution {
                    display: none !important;
                  }
                `}</style>
                
                {/* Show My Company Button - Positioned within map */}
                {user && member?.organizationType === 'MGA' && (
                  <div className="absolute bottom-4 right-4" style={{ zIndex: 1000 }}>
                    <button
                      onClick={() => setShowMyCompany(true)}
                      className="bg-fase-navy text-white px-4 py-2 rounded-lg shadow-lg hover:bg-opacity-90 transition-colors font-medium text-sm"
                    >
                      {translations.my_company?.show_button || "Show My Company"}
                    </button>
                  </div>
                )}
                
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
                      key={`countries-${showMyCompany}-${editingMarkets}-${selectedLocationFilter}-${selectedCompany?.id || 'none'}`} // Force re-render when filter changes
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
                        
                        // Check if this is one of the current user's markets
                        const isUserMarket = showMyCompany && Array.from(businessLocationsByCountry.keys()).concat(Array.from(marketLocationsByCountry.keys())).some(iso2Code => {
                          try {
                            const numericCode = countries.alpha2ToNumeric(iso2Code);
                            if (numericCode && numericCode.toString() === numericId?.toString()) {
                              return markets.includes(iso2Code);
                            }
                            return false;
                          } catch (error) {
                            return false;
                          }
                        });

                        // Simplified: Only darker navy and gold
                        let fillColor = '#f8f9fa'; // Default light gray for no members
                        let borderColor = '#e5e7eb';
                        let fillOpacity = 0.05;
                        let weight = 1;
                        
                        if (isUserMarket) {
                          // User's own market - special purple color
                          fillColor = '#7c3aed';
                          borderColor = '#7c3aed';
                          fillOpacity = 0.5;
                          weight = 3;
                        } else if (hasBusinessLocation) {
                          // Any business location - darker navy
                          fillColor = '#1e3a8a';
                          borderColor = '#1e3a8a';
                          fillOpacity = 0.4;
                          weight = 2;
                        } else if (hasMarketLocation) {
                          // Market only (no business) - gold
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
                        // Try ALL world countries, not just those with members
                        let iso2Code = null;
                        
                        if (numericId) {
                          // Get ALL countries from i18n-iso-countries and try to match
                          const allWorldCountries = countries.getNames('en', {select: 'official'});
                          if (allWorldCountries) {
                            for (const [countryCode] of Object.entries(allWorldCountries)) {
                              try {
                                const numericCode = countries.alpha2ToNumeric(countryCode);
                                if (numericCode && numericCode.toString() === numericId.toString()) {
                                  iso2Code = countryCode;
                                  break;
                                }
                              } catch (error) {
                                // Skip invalid conversions
                                continue;
                              }
                            }
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
                        
                        // Pre-calculate and store the original style to avoid recalculation on mouseout
                        // IMPORTANT: This must use the SAME logic as the main style function to avoid inconsistencies
                        const originalStyle = (() => {
                          // Check if this country has business locations (using FILTERED data like main style function)
                          const hasBusinessLocation = (selectedLocationFilter === 'all' || selectedLocationFilter === 'business') && 
                            businessMembers.length > 0;
                          
                          // Check if this country has markets (using FILTERED data like main style function)
                          const hasMarketLocation = (selectedLocationFilter === 'all' || selectedLocationFilter === 'markets') &&
                            marketMembers.length > 0;
                          
                          // Check if this is one of the current user's markets
                          const isUserMarket = showMyCompany && iso2Code && markets.includes(iso2Code);

                          let fillColor = '#f8f9fa'; // Default light gray for no members
                          let borderColor = '#e5e7eb';
                          let fillOpacity = 0.05;
                          let weight = 1;
                          
                          if (isUserMarket) {
                            // User's own market - special purple color
                            fillColor = '#7c3aed';
                            borderColor = '#7c3aed';
                            fillOpacity = 0.5;
                            weight = 3;
                          } else if (hasBusinessLocation) {
                            // Any business location - darker navy
                            fillColor = '#1e3a8a';
                            borderColor = '#1e3a8a';
                            fillOpacity = 0.4;
                            weight = 2;
                          } else if (hasMarketLocation) {
                            // Market only (no business) - gold
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
                        })();
                        
                        // Combine and deduplicate members
                        const membersInCountry = deduplicateMembers(businessMembers, marketMembers);
                        
                        // Countries are only interactive if they should be colored in current filter
                        let shouldBeColored = false;
                        if (selectedLocationFilter === 'all') {
                          shouldBeColored = businessMembers.length > 0 || marketMembers.length > 0;
                        } else if (selectedLocationFilter === 'business') {
                          shouldBeColored = businessMembers.length > 0;
                        } else if (selectedLocationFilter === 'markets') {
                          shouldBeColored = marketMembers.length > 0;
                        }
                        
                        const isInteractive = (showMyCompany && editingMarkets && iso2Code) || shouldBeColored;
                        
                        // Handle click events for all interactive countries
                        if (isInteractive) {
                          layer.on('click', () => {
                            if (iso2Code && showMyCompany && editingMarkets) {
                              // Add/remove market when in editing mode
                              if (markets.includes(iso2Code)) {
                                removeMarket(iso2Code);
                              } else {
                                addMarket(iso2Code);
                              }
                            } else if (iso2Code && selectedCompany) {
                              // If a company is selected, show company details for this country
                              setSelectedCountry(`company-country-${iso2Code}`);
                            } else if (iso2Code && membersInCountry.length > 0) {
                              // Normal country view - only if there are members
                              setSelectedCountry(iso2Code);
                            }
                          });
                        }
                        
                        // Handle hover effects differently for edit mode vs normal mode
                        if (showMyCompany && editingMarkets && iso2Code) {
                          // Edit mode: ALL countries get hover effects
                          layer.on('mouseover', () => {
                            layer.setStyle({
                              fillOpacity: 0.6,
                              weight: 3,
                              color: markets.includes(iso2Code) ? '#dc2626' : '#16a34a',
                              fillColor: markets.includes(iso2Code) ? '#dc2626' : '#16a34a'
                            });
                          });
                          
                          layer.on('mouseout', () => {
                            layer.setStyle(originalStyle);
                          });
                        } else if (isInteractive) {
                          // Normal mode: only interactive countries get hover effects
                          layer.on('mouseover', () => {
                            const currentStyle = originalStyle;
                            layer.setStyle({
                              ...currentStyle,
                              fillOpacity: Math.min(currentStyle.fillOpacity + 0.2, 1),
                              weight: Math.max(currentStyle.weight + 1, 3)
                            });
                          });
                          
                          layer.on('mouseout', () => {
                            layer.setStyle(originalStyle);
                          });
                        }
                      }}
                    />
                  )}
                </MapContainer>
              </div>

              {/* Sidebar */}
              {(selectedCountry || showMyCompany) && (
                <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col">
                  {showMyCompany ? (
                    <MyCompanyView
                      member={member}
                      user={user}
                      translations={translations}
                      editingMarkets={editingMarkets}
                      setEditingMarkets={setEditingMarkets}
                      markets={markets}
                      setMarkets={setMarkets}
                      addMarket={addMarket}
                      removeMarket={removeMarket}
                      onClose={() => {
                        setShowMyCompany(false);
                        setEditingMarkets(false);
                        setSelectedCountry(null);
                        setSelectedCompany(null);
                        setSearchQuery('');
                        setFilteredCompanies([]);
                      }}
                    />
                  ) : selectedCountry === 'company-details' && selectedCompany ? (
                    <CompanyDetails 
                      company={selectedCompany}
                      translations={translations}
                      onClose={() => {
                        setSelectedCountry(null);
                        setSelectedCompany(null);
                        setSearchQuery('');
                        setFilteredCompanies([]);
                      }}
                    />
                  ) : selectedCountry && selectedCountry.startsWith('company-country-') && selectedCompany ? (
                    <CompanyCountryDetails 
                      company={selectedCompany}
                      countryCode={selectedCountry.replace('company-country-', '')}
                      translations={translations}
                      onClose={() => {
                        setSelectedCountry(null);
                        setSelectedCompany(null);
                        setSearchQuery('');
                        setFilteredCompanies([]);
                      }}
                    />
                  ) : selectedCountry ? (
                    <CountryDetails 
                      country={selectedCountry}
                      businessMembers={businessLocationsByCountry.get(selectedCountry) || []}
                      marketMembers={marketLocationsByCountry.get(selectedCountry) || []}
                      translations={translations}
                      onClose={() => {
                        setSelectedCountry(null);
                        setSelectedCompany(null);
                        setSearchQuery('');
                        setFilteredCompanies([]);
                      }}
                      setSelectedCompany={setSelectedCompany}
                      setSelectedCountry={setSelectedCountry}
                    />
                  ) : null}
                </div>
              )}
            </div>


          </div>
        )}
      </div>
    </div>
  );
}