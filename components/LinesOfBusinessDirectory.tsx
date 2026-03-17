'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { getApprovedMembersWithSubcollections } from '../lib/unified-member';
import type { UnifiedMember } from '../lib/unified-member';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { getLineOfBusinessDisplay } from '../lib/lines-of-business';

// All available lines of business keys
const ALL_LINES_OF_BUSINESS = [
  'accident_health', 'aviation', 'bloodstock', 'casualty', 'construction',
  'cyber', 'energy', 'event_cancellation', 'fine_art_specie', 'legal_expenses',
  'life', 'livestock', 'marine', 'management_liability', 'motor_commercial',
  'motor_personal', 'pet', 'political_risk', 'professional_indemnity',
  'property_commercial', 'property_personal', 'surety', 'trade_credit',
  'travel', 'warranty_indemnity'
];

// Helper function to get display organization type
const getDisplayOrganizationType = (member: UnifiedMember): string => {
  if (member.organizationType === 'MGA') return 'MGA';
  if (member.organizationType === 'provider') return 'Service Provider';
  if (member.organizationType === 'carrier') {
    const carrierInfo = (member as any).carrierInfo;
    if (carrierInfo?.organizationType === 'insurance_broker' || carrierInfo?.organizationType === 'reinsurance_broker') {
      return 'Broker';
    }
    return 'Carrier';
  }
  return member.organizationType || 'Other';
};

// Helper to get lines of business from either direct field or portfolio
const getLinesOfBusiness = (member: UnifiedMember): string[] => {
  return member.linesOfBusiness || (member as any).portfolio?.linesOfBusiness || [];
};

// Helper to get localized company bio
const getLocalizedBio = (member: UnifiedMember, locale: string): string | null => {
  const summary = member.companySummary;
  if (!summary || summary.status !== 'approved' || !summary.text) return null;

  // Try to get translated version first (for non-English locales)
  if (locale !== 'en' && summary.translations?.[locale]) {
    return summary.translations[locale];
  }

  // Fall back to English
  return summary.text;
};

// Component for logo with error handling
function CompanyLogo({ organization }: { organization: UnifiedMember }) {
  const [imageError, setImageError] = useState(false);

  if (!organization.logoURL || imageError) {
    return (
      <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-400 text-xs font-medium">
          {(organization.organizationName || organization.personalName) ?
            (organization.organizationName || organization.personalName)!.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase()
            : 'N/A'
          }
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-12 h-12 overflow-hidden rounded-lg border border-gray-200">
      <Image
        src={organization.logoURL}
        alt={`${organization.organizationName} logo`}
        fill
        className="object-contain"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

interface LinesOfBusinessDirectoryProps {
  translations: {
    title?: string;
    description?: string;
    loading?: string;
    no_results?: string;
    no_results_desc?: string;
    select_lines?: string;
    clear_all?: string;
    lines_selected?: string;
    organizations_found?: string;
    locale?: string;
  };
}

export default function LinesOfBusinessDirectory({ translations }: LinesOfBusinessDirectoryProps) {
  const { user } = useUnifiedAuth();
  const [organizations, setOrganizations] = useState<UnifiedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<UnifiedMember[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<UnifiedMember | null>(null);
  const locale = translations.locale || 'en';

  // Load organizations on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const { organizations: orgs, allMembers: members } = await getApprovedMembersWithSubcollections();

        // Create a map of organization ID to members
        const membersByOrg = new Map<string, number>();
        members.forEach(member => {
          membersByOrg.set(member.companyId, (membersByOrg.get(member.companyId) || 0) + 1);
        });

        // Filter organizations that have members and lines of business
        const orgsWithLOB = orgs.filter(org => {
          const hasMembers = membersByOrg.has(org.id) && membersByOrg.get(org.id)! > 0;
          const hasLOB = getLinesOfBusiness(org).length > 0;
          return hasMembers && hasLOB;
        });

        setOrganizations(orgsWithLOB);
      } catch (error) {
        console.error('Error loading organizations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter organizations when selection changes
  useEffect(() => {
    if (selectedLines.length === 0) {
      setFilteredOrganizations([]);
    } else {
      const filtered = organizations.filter(org => {
        const orgLines = getLinesOfBusiness(org);
        return selectedLines.some(line => orgLines.includes(line));
      });
      setFilteredOrganizations(filtered);
    }
  }, [selectedLines, organizations]);

  // Sort lines alphabetically by display name
  const sortedLines = [...ALL_LINES_OF_BUSINESS].sort((a, b) =>
    getLineOfBusinessDisplay(a, locale).localeCompare(getLineOfBusinessDisplay(b, locale))
  );

  const handleToggleLine = (line: string) => {
    if (selectedLines.includes(line)) {
      setSelectedLines(selectedLines.filter(l => l !== line));
    } else {
      setSelectedLines([...selectedLines, line]);
    }
  };

  const handleClearAll = () => {
    setSelectedLines([]);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">{translations.loading || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-fase-navy">
          {translations.title || 'Lines of Business'}
        </h4>
        {selectedLines.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm text-fase-navy hover:text-fase-orange font-medium"
          >
            {translations.clear_all || 'Clear all'}
          </button>
        )}
      </div>

      {/* Lines of Business Grid */}
      <div>

        <div className="flex flex-wrap justify-center gap-2">
          {sortedLines.map(line => {
            const orgCount = organizations.filter(org => getLinesOfBusiness(org).includes(line)).length;

            // Hide lines with 0 organizations
            if (orgCount === 0) return null;

            const isSelected = selectedLines.includes(line);

            return (
              <button
                key={line}
                type="button"
                onClick={() => handleToggleLine(line)}
                className={`
                  px-3 py-2 rounded-lg text-sm transition-all
                  ${isSelected
                    ? 'bg-fase-navy text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-fase-navy/30 hover:bg-gray-50'
                  }
                `}
              >
                <span className="font-medium">{getLineOfBusinessDisplay(line, locale)}</span>
                <span className={`ml-1.5 text-xs ${isSelected ? 'text-fase-gold' : 'text-gray-400'}`}>
                  ({orgCount})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected filters summary */}
      {selectedLines.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">
            {selectedLines.length} {translations.lines_selected || 'selected'}:
          </span>
          {selectedLines.map(line => (
            <span
              key={line}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-fase-navy/10 text-fase-navy rounded-full"
            >
              {getLineOfBusinessDisplay(line, locale)}
              <button
                type="button"
                onClick={() => handleToggleLine(line)}
                className="hover:text-fase-orange transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      {selectedLines.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <p className="text-gray-600">
            {translations.select_lines || 'Select one or more lines of business to see matching organizations.'}
          </p>
        </div>
      ) : filteredOrganizations.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-fase-navy mb-2">
            {translations.no_results || 'No organizations found'}
          </h3>
          <p className="text-gray-600">
            {translations.no_results_desc || 'No organizations match the selected lines of business.'}
          </p>
        </div>
      ) : (
        <div>
          <div className="text-sm text-gray-600 mb-3">
            {filteredOrganizations.length} {translations.organizations_found || 'organizations found'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrganizations.map((org, index) => {
              const orgData = org as any;
              const matchingLines = getLinesOfBusiness(org).filter(line => selectedLines.includes(line));

              return (
                <button
                  type="button"
                  key={`org-${index}`}
                  onClick={() => setSelectedOrg(org)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-fase-navy/30 transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <CompanyLogo organization={org} />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-fase-navy text-sm mb-1 truncate">
                        {org.organizationName || org.personalName}
                      </h5>
                      <div className="text-xs text-gray-500 mb-2">
                        {getDisplayOrganizationType(org)}
                        {orgData.businessAddress?.country && ` · ${orgData.businessAddress.country}`}
                      </div>
                    </div>
                  </div>

                  {/* Matching lines of business */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1">
                      {matchingLines.slice(0, 3).map((line, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-fase-navy text-white rounded-full"
                        >
                          {getLineOfBusinessDisplay(line, locale)}
                        </span>
                      ))}
                      {matchingLines.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-gray-500">
                          +{matchingLines.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Organization Detail Modal - rendered via portal to escape transform context */}
      {selectedOrg && typeof document !== 'undefined' && createPortal(
        (() => {
          const orgData = selectedOrg as any;
          const bio = getLocalizedBio(selectedOrg, locale);
          const allLines = getLinesOfBusiness(selectedOrg);

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {selectedOrg.logoURL ? (
                        <div className="relative w-16 h-16 overflow-hidden rounded-lg border border-gray-200">
                          <Image
                            src={selectedOrg.logoURL}
                            alt={`${selectedOrg.organizationName} logo`}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-lg font-medium">
                            {(selectedOrg.organizationName || selectedOrg.personalName)?.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-fase-navy">
                        {selectedOrg.organizationName || selectedOrg.personalName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {getDisplayOrganizationType(selectedOrg)}
                      </p>
                      {orgData.businessAddress && (
                        <p className="text-sm text-gray-500 mt-1">
                          {orgData.businessAddress.city && `${orgData.businessAddress.city}, `}
                          {orgData.businessAddress.country}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrg(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                {/* Website */}
                {orgData.website && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Website</h4>
                    <a
                      href={orgData.website.startsWith('http') ? orgData.website : `https://${orgData.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fase-navy hover:underline flex items-center gap-1 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {orgData.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </div>
                )}

                {/* Company Bio */}
                {bio && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">About</h4>
                    <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">{bio}</p>
                  </div>
                )}

                {/* Lines of Business */}
                {allLines.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Lines of Business</h4>
                    <div className="flex flex-wrap gap-2">
                      {allLines.map((line, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1 text-sm rounded-full ${
                            selectedLines.includes(line)
                              ? 'bg-fase-navy text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {getLineOfBusinessDisplay(line, locale)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Member Since */}
                {selectedOrg.createdAt && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Member Since</h4>
                    <p className="text-sm text-gray-900">
                      {selectedOrg.createdAt.toDate?.()?.toLocaleDateString(locale, { year: 'numeric', month: 'long' }) || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setSelectedOrg(null)}
                  className="w-full px-4 py-2 bg-fase-navy text-white rounded-lg hover:bg-fase-navy/90 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
