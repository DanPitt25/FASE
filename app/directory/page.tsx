'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import PageLayout from '../../components/PageLayout';
import { getApprovedMembersForDirectory } from '../../lib/unified-member';
import type { UnifiedMember } from '../../lib/unified-member';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';
import countries from 'i18n-iso-countries';

// Component for logo with error handling
function CompanyLogo({ member }: { member: UnifiedMember }) {
  const [imageError, setImageError] = useState(false);
  
  if (!member.logoURL || imageError) {
    return (
      <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-400 text-xs font-medium">
          {member.organizationName ? 
            member.organizationName.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase()
            : 'N/A'
          }
        </span>
      </div>
    );
  }
  
  return (
    <div className="relative w-16 h-16 overflow-hidden rounded-lg border border-gray-200">
      <Image
        src={member.logoURL}
        alt={`${member.organizationName} logo`}
        fill
        className="object-contain"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

// Register locales
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
countries.registerLocale(require("i18n-iso-countries/langs/es.json"));
countries.registerLocale(require("i18n-iso-countries/langs/fr.json"));
countries.registerLocale(require("i18n-iso-countries/langs/de.json"));
countries.registerLocale(require("i18n-iso-countries/langs/it.json"));
countries.registerLocale(require("i18n-iso-countries/langs/pt.json"));
countries.registerLocale(require("i18n-iso-countries/langs/nl.json"));

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

export default function DirectoryPage() {
  const t = useTranslations('directory');
  const locale = useLocale();
  const [members, setMembers] = useState<UnifiedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedOrganizationType, setSelectedOrganizationType] = useState('');
  const [expandedBio, setExpandedBio] = useState<string | null>(null);

  // Show coming soon overlay
  const [showComingSoon] = useState(false);
  
  // Animation hooks
  const bannerAnimation = useScrollAnimation();
  const ribbonAnimation = useScrollAnimation();

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const approvedMembers = await getApprovedMembersForDirectory();
        setMembers(approvedMembers);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  // Filter members based on search and filters
  const filteredMembers = members.filter(member => {
    const matchesSearch = !searchTerm || 
      member.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.registeredAddress?.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member as any).businessAddress?.country?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCountry = !selectedCountry || 
      member.registeredAddress?.country === selectedCountry ||
      (member as any).businessAddress?.country === selectedCountry;
    
    const matchesOrganizationType = !selectedOrganizationType || getDisplayOrganizationType(member) === selectedOrganizationType;
    
    return matchesSearch && matchesCountry && matchesOrganizationType;
  });

  // Get unique values for filters
  const availableCountries = Array.from(new Set(
    members.flatMap(member => [
      member.registeredAddress?.country,
      (member as any).businessAddress?.country
    ]).filter(Boolean)
  )).sort();

  const availableOrganizationTypes = Array.from(new Set(
    members.map(member => getDisplayOrganizationType(member)).filter(Boolean)
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
  });


  if (loading) {
    return (
      <PageLayout currentPage="directory">
        <main className="flex-1 bg-white">
          {/* Hero Banner */}
          <section ref={bannerAnimation.elementRef} className="relative h-[33vh] flex items-center overflow-hidden">
            <Image
              src="/conferenceWood.jpg"
              alt={t('page.banner_alt')}
              fill
              className="object-cover"
              style={{ filter: 'brightness(0.7) contrast(1.1) saturate(1.1)' }}
              priority
            />
            <div className="absolute inset-0 bg-fase-navy/40"></div>
            <div className="relative z-10 w-full h-full flex items-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
              <div className={`w-1/4 transition-all duration-700 ${
                bannerAnimation.isVisible ? 'scroll-visible-left' : 'scroll-hidden-left'
              }`}>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-noto-serif font-medium text-white leading-tight">
                  {t('page.title')}
                </h1>
              </div>
            </div>
          </section>
          
          {/* Blue ribbon separator */}
          <div ref={ribbonAnimation.elementRef} className="relative h-12">
            <div className={`absolute right-0 h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
              ribbonAnimation.isVisible ? 'scroll-visible-right' : 'scroll-hidden-right'
            }`} style={{ width: '61.8%' }}></div>
          </div>
          
          {/* Loading Section */}
          <section className="bg-white py-12 lg:py-16 2xl:py-20">
            <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-fase-blue mx-auto"></div>
              <p className="mt-4 text-lg text-fase-black">{t('loading.message')}</p>
            </div>
          </section>
        </main>
      </PageLayout>
    );
  }

  return (
    <PageLayout currentPage="directory">
      <main className="flex-1 bg-white">
        {/* Hero Banner */}
        <section ref={bannerAnimation.elementRef} className="relative h-[33vh] flex items-center overflow-hidden">
          <Image
            src="/conferenceWood.jpg"
            alt={t('page.banner_alt')}
            fill
            className="object-cover"
            style={{ filter: 'brightness(0.7) contrast(1.1) saturate(1.1)' }}
            priority
          />
          <div className="absolute inset-0 bg-fase-navy/40"></div>
          <div className="relative z-10 w-full h-full flex items-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className={`w-1/4 transition-all duration-700 ${
              bannerAnimation.isVisible ? 'scroll-visible-left' : 'scroll-hidden-left'
            }`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-noto-serif font-medium text-white leading-tight">
                {t('page.title')}
              </h1>
            </div>
          </div>
        </section>

        {/* Blue ribbon separator */}
        <div ref={ribbonAnimation.elementRef} className="relative h-12">
          <div className={`absolute right-0 h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
            ribbonAnimation.isVisible ? 'scroll-visible-right' : 'scroll-hidden-right'
          }`} style={{ width: '61.8%' }}></div>
        </div>

        {/* Directory Content Section */}
        <section className="bg-white py-12 lg:py-16 2xl:py-20">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            {showComingSoon ? (
              /* Coming Soon Overlay */
              <div className="text-center py-20">
                <div className="max-w-2xl mx-auto">
                  <svg className="w-20 h-20 text-fase-navy mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  
                  <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">
                    {t('coming_soon.title')}
                  </h2>
                  
                  <p className="text-xl text-fase-black mb-8 leading-relaxed">
                    {t('coming_soon.description')}
                  </p>
                  
                  <div className="bg-fase-cream/50 border border-fase-light-gold rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-3">
                      {t('coming_soon.what_to_expect.title')}
                    </h3>
                    <ul className="text-fase-black space-y-2 text-left max-w-md mx-auto">
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-fase-navy mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {t('coming_soon.what_to_expect.features.searchable')}
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-fase-navy mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {t('coming_soon.what_to_expect.features.filtering')}
                      </li>
                      <li className="flex items-start">
                        <svg className="w-5 h-5 text-fase-navy mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {t('coming_soon.what_to_expect.features.direct_access')}
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a 
                      href="/join"
                      className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-fase-navy hover:bg-fase-navy/90 transition-colors duration-200"
                    >
                      {t('coming_soon.become_member')}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* Original Directory Content - Keep for future activation */
              <>
            {/* Search and Filters */}
            <div className="bg-white rounded-lg border border-fase-light-gold p-6 mb-8">
              <div className="flex flex-col gap-4">
                {/* Search */}
                <div className="flex-1">
                  <label htmlFor="search" className="block text-sm font-medium text-fase-black mb-2">
                    {t('search_and_filters.search_label')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t('search_and_filters.search_placeholder')}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-blue focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Country Filter */}
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-fase-black mb-2">
                      {t('search_and_filters.filter_by_country')}
                    </label>
                    <select
                      id="country"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-blue focus:border-transparent"
                    >
                      <option value="">{t('search_and_filters.all_countries')}</option>
                      {availableCountries.map(countryCode => {
                        const countryName = countries.getName(countryCode, locale) || countries.getName(countryCode, 'en') || countryCode;
                        return (
                          <option key={countryCode} value={countryCode}>{countryName}</option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Organization Type Filter */}
                  <div>
                    <label htmlFor="organizationType" className="block text-sm font-medium text-fase-black mb-2">
                      {t('search_and_filters.filter_by_type')}
                    </label>
                    <select
                      id="organizationType"
                      value={selectedOrganizationType}
                      onChange={(e) => setSelectedOrganizationType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-blue focus:border-transparent"
                    >
                      <option value="">{t('search_and_filters.all_types')}</option>
                      {availableOrganizationTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-noto-serif font-bold text-fase-navy">
                {t('results.title')}
              </h2>
              <p className="text-sm text-gray-600">
                {filteredMembers.length} {filteredMembers.length === 1 ? t('results.count_singular') : t('results.count_plural')}
                {searchTerm || selectedCountry || selectedOrganizationType ? ` ${t('results.found')}` : ''}
              </p>
            </div>

            {/* Directory Grid */}
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('empty_state.no_members_title')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || selectedCountry || selectedOrganizationType
                    ? t('empty_state.try_adjusting')
                    : t('empty_state.will_be_populated')
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-white border border-fase-light-gold rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Company Logo and Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start gap-4 mb-4">
                        {/* Company Logo */}
                        <div className="flex-shrink-0">
                          <CompanyLogo member={member} />
                        </div>

                        {/* Company Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-noto-serif font-bold text-fase-navy mb-1 break-words">
                            {member.organizationName}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-fase-light-blue text-fase-navy">
                              {getDisplayOrganizationType(member)}
                            </span>
                          </div>
                          {member.primaryContact?.role && (
                            <p className="text-sm text-gray-600 mt-1">{member.primaryContact.role}</p>
                          )}
                        </div>
                      </div>

                      {/* Company Bio */}
                      {member.companySummary?.status === 'approved' && member.companySummary.text && (
                        <div className="mb-4">
                          <p
                            className={`text-sm text-gray-700 leading-relaxed ${expandedBio === member.id ? '' : 'line-clamp-3'} ${member.companySummary.text.length > 200 ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (member.companySummary!.text!.length > 200) {
                                setExpandedBio(expandedBio === member.id ? null : member.id);
                              }
                            }}
                          >
                            {member.companySummary.text}
                          </p>
                          {member.companySummary.text.length > 200 && (
                            <button
                              onClick={() => setExpandedBio(expandedBio === member.id ? null : member.id)}
                              className="text-xs text-fase-blue hover:text-fase-navy mt-1"
                            >
                              {expandedBio === member.id ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Company Details */}
                    <div className="px-6 pb-6">
                      <div className="space-y-2 text-sm text-fase-black">
                        {(member.registeredAddress?.country || (member as any).businessAddress?.country) && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>
                              {(() => {
                                const countryCode = member.registeredAddress?.country || (member as any).businessAddress?.country;
                                return countries.getName(countryCode, locale) || countries.getName(countryCode, 'en') || countryCode;
                              })()}
                            </span>
                          </div>
                        )}
                        
                        {/* Website */}
                        {(member as any).website && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <a 
                              href={(() => {
                                let url = (member as any).website;
                                // Remove protocol if present
                                url = url.replace(/^https?:\/\//, '');
                                // Add www. if not present
                                if (!url.startsWith('www.')) {
                                  url = `www.${url}`;
                                }
                                return `https://${url}`;
                              })()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-fase-blue hover:underline"
                            >
                              {(() => {
                                let displayUrl = (member as any).website;
                                // Remove protocol if present
                                displayUrl = displayUrl.replace(/^https?:\/\//, '');
                                // Add www. if not present
                                if (!displayUrl.startsWith('www.')) {
                                  displayUrl = `www.${displayUrl}`;
                                }
                                return displayUrl;
                              })()}
                            </a>
                          </div>
                        )}

                        {member.primaryContact?.phone && (
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{member.primaryContact.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </>
            )}
          </div>
        </section>
      </main>
    </PageLayout>
  );
}