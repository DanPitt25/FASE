'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getApprovedMembersWithSubcollections } from '../lib/unified-member';
import type { UnifiedMember } from '../lib/unified-member';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { getLineOfBusinessDisplay } from '../lib/lines-of-business';

// Helper function to get display organization type (matches external directory exactly)
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

// Component for logo with error handling
function CompanyLogo({ organization }: { organization: UnifiedMember }) {
  const [imageError, setImageError] = useState(false);
  
  if (!organization.logoURL || imageError) {
    return (
      <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
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
    <div className="relative w-16 h-16 overflow-hidden rounded-lg border border-gray-200">
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

interface MembershipDirectoryProps {
  translations: {
    title?: string;
    description?: string;
    loading?: string;
    no_members?: string;
    no_members_desc?: string;
    search_placeholder?: string;
    contact_member?: string;
    view_profile?: string;
    member_since?: string;
    location?: string;
    organization_type?: string;
    lines_of_business?: string;
    email?: string;
    locale?: string;
    copy_email?: string;
    email_copied?: string;
  };
}

// Organization card component that shows members within it
function OrganizationCard({ 
  organization, 
  organizationMembers,
  translations 
}: { 
  organization: UnifiedMember;
  organizationMembers: Array<UnifiedMember & { companyName: string; companyId: string }>;
  translations: MembershipDirectoryProps['translations'];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const orgData = organization as any;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Organization Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Company Logo */}
            <div className="flex-shrink-0">
              <CompanyLogo organization={organization} />
            </div>

            {/* Organization Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-fase-navy text-lg mb-2 break-words">
                {organization.organizationName || organization.personalName}
              </h4>
              <div className="text-sm text-gray-600 mb-2">
                {getDisplayOrganizationType(organization)}
              </div>
              {orgData.businessAddress?.country && (
                <div className="text-sm text-gray-500 mb-2">
                  {orgData.businessAddress.city && `${orgData.businessAddress.city}, `}
                  {orgData.businessAddress.country}
                </div>
              )}

              {/* Company Bio Preview - only show when collapsed */}
              {!isExpanded && organization.companySummary?.status === 'approved' && organization.companySummary.text && (
                <div className="text-sm text-gray-700 mb-2 line-clamp-2 leading-relaxed">
                  {organization.companySummary.text}
                </div>
              )}

              <div className="text-xs text-gray-500">
                {organizationMembers.length} {organizationMembers.length === 1 ? 'member' : 'members'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Organization Details & Members */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Organization Details */}
          <div className="p-4 bg-gray-50">
            <div className="space-y-3">
              {/* Company Bio - Full Text */}
              {organization.companySummary?.status === 'approved' && organization.companySummary.text && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">About</div>
                  <div className="text-sm text-gray-900 leading-relaxed">
                    {organization.companySummary.text}
                  </div>
                </div>
              )}

              {/* Lines of Business */}
              {organization.linesOfBusiness && organization.linesOfBusiness.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">{translations.lines_of_business || 'Lines of Business'}</div>
                  <div className="text-sm text-gray-900">
                    {organization.linesOfBusiness.map((line: string, index: number) => (
                      <span key={index}>
                        {getLineOfBusinessDisplay(line, translations.locale || 'en')}
                        {index < organization.linesOfBusiness!.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Member Since */}
              {organization.createdAt && (
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">{translations.member_since || 'Member Since'}</div>
                  <div className="text-sm text-gray-900">
                    {organization.createdAt.toDate?.()?.toLocaleDateString() || 'N/A'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Members List */}
          <div className="p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Team Members</h5>
            <div className="space-y-3">
              {organizationMembers.map((member, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-fase-navy">
                      {member.personalName}
                    </div>
                    {member.jobTitle && (
                      <div className="text-sm text-gray-600">
                        {member.jobTitle}
                      </div>
                    )}
                    {member.email && (
                      <div className="text-sm text-gray-500">
                        {member.email}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MembershipDirectory({ translations }: MembershipDirectoryProps) {
  const { user } = useUnifiedAuth();
  const [directoryData, setDirectoryData] = useState<{
    organizations: UnifiedMember[];
    membersByOrg: Map<string, Array<UnifiedMember & { companyName: string; companyId: string }>>;
  }>({ organizations: [], membersByOrg: new Map() });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredOrganizations, setFilteredOrganizations] = useState<UnifiedMember[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');

  // Load members on mount
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const { organizations: orgs, allMembers: members } = await getApprovedMembersWithSubcollections();
        
        // Create a map of organization ID to members
        const membersByOrg = new Map<string, Array<UnifiedMember & { companyName: string; companyId: string }>>();
        members.forEach(member => {
          if (!membersByOrg.has(member.companyId)) {
            membersByOrg.set(member.companyId, []);
          }
          membersByOrg.get(member.companyId)!.push(member);
        });
        
        // Filter organizations that have members (suppress empty ones)
        const orgsWithMembers = orgs.filter(org => {
          // All memberships are corporate, check if there are subcollection members
          return membersByOrg.has(org.id) && membersByOrg.get(org.id)!.length > 0;
        });
        
        setDirectoryData({ organizations: orgsWithMembers, membersByOrg });
        setFilteredOrganizations(orgsWithMembers);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  // Filter organizations based on search and organization type
  useEffect(() => {
    let filtered = directoryData.organizations;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      filtered = filtered.filter(org => {
        const orgName = org.organizationName?.toLowerCase() || '';
        const personalName = org.personalName?.toLowerCase() || '';
        
        // Also search within organization members
        const orgMembers = directoryData.membersByOrg.get(org.id) || [];
        const memberMatch = orgMembers.some(member => 
          member.personalName?.toLowerCase().includes(query) ||
          member.email?.toLowerCase().includes(query) ||
          member.jobTitle?.toLowerCase().includes(query)
        );
        
        return orgName.includes(query) || personalName.includes(query) || memberMatch;
      });
    }

    // Filter by organization type (using display type)
    if (organizationFilter !== 'all') {
      filtered = filtered.filter(org => getDisplayOrganizationType(org) === organizationFilter);
    }

    setFilteredOrganizations(filtered);
  }, [searchQuery, organizationFilter, directoryData]);

  // Get unique organization types for filter (using display types with same sort order as public directory)
  const organizationTypes = ['all', ...Array.from(new Set(
    directoryData.organizations.map(m => getDisplayOrganizationType(m)).filter(Boolean)
  )).sort((a, b) => {
    // Custom sort order: MGA, Carrier, Broker, Service Provider, then alphabetical
    const order = ['MGA', 'Carrier', 'Broker', 'Service Provider'];
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    
    // If both are in the custom order, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // If only one is in the custom order, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    // If neither is in the custom order, sort alphabetically
    return a.localeCompare(b);
  })];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">{translations.loading || 'Loading member directory...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold text-fase-navy mb-2">
          {translations.title || 'Member Directory'}
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          {translations.description || 'Connect with FASE members across Europe. Contact information is only visible to logged-in members.'}
        </p>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search organizations and members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
          />
        </div>
        <select
          value={organizationFilter}
          onChange={(e) => setOrganizationFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
        >
          <option value="all">All Types</option>
          {organizationTypes.slice(1).map(type => (
            <option key={type} value={type}>
              {type === 'MGA' ? 'Managing General Agent' :
               type === 'carrier' ? 'Insurance Carrier' :
               type === 'provider' ? 'Service Provider' :
               type}
            </option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {filteredOrganizations.length === 1 ? '1 organization' : `${filteredOrganizations.length} organizations`}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Organizations Grid */}
      {filteredOrganizations.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-fase-navy mb-2">
            {searchQuery ? 'No organizations found' : (translations.no_members || 'No organizations found')}
          </h3>
          <p className="text-gray-600">
            {searchQuery ? `No organizations match "${searchQuery}"` : (translations.no_members_desc || 'The member directory is currently being populated.')}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-fase-navy hover:text-fase-orange font-medium text-sm"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrganizations.map((org, index) => (
            <OrganizationCard 
              key={`org-${index}`} 
              organization={org} 
              organizationMembers={directoryData.membersByOrg.get(org.id) || []}
              translations={translations}
            />
          ))}
        </div>
      )}
    </div>
  );
}