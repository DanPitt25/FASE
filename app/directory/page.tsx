'use client';

import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import { getApprovedMembersForDirectory } from '../../lib/unified-member';
import type { UnifiedMember } from '../../lib/unified-member';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

export default function DirectoryPage() {
  const [members, setMembers] = useState<UnifiedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  
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

  // Filter members based on search and country
  const filteredMembers = members.filter(member => {
    const matchesSearch = !searchTerm || 
      member.personalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.organizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.registeredAddress?.country?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCountry = !selectedCountry || member.registeredAddress?.country === selectedCountry;
    
    return matchesSearch && matchesCountry;
  });

  // Get unique countries for filter
  const availableCountries = Array.from(new Set(
    members.map(member => member.registeredAddress?.country).filter(Boolean)
  )).sort();

  if (loading) {
    return (
      <PageLayout currentPage="directory">
        <main className="flex-1 bg-white">
          {/* Hero Banner */}
          <section ref={bannerAnimation.elementRef} className="relative h-[33vh] flex items-center overflow-hidden">
            <img
              src="/conference.jpg"
              alt="Member Directory"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(0.7) contrast(1.1) saturate(1.1)' }}
            />
            <div className="absolute inset-0 bg-fase-navy/40"></div>
            <div className="relative z-10 w-full h-full flex items-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
              <div className={`w-1/4 transition-all duration-700 ${
                bannerAnimation.isVisible ? 'scroll-visible-left' : 'scroll-hidden-left'
              }`}>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-noto-serif font-medium text-white leading-tight">
                  Directory
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
              <p className="mt-4 text-lg text-fase-black">Loading directory...</p>
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
          <img
            src="/conference.jpg"
            alt="Member Directory"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.7) contrast(1.1) saturate(1.1)' }}
          />
          <div className="absolute inset-0 bg-fase-navy/40"></div>
          <div className="relative z-10 w-full h-full flex items-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className={`w-1/4 transition-all duration-700 ${
              bannerAnimation.isVisible ? 'scroll-visible-left' : 'scroll-hidden-left'
            }`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-noto-serif font-medium text-white leading-tight">
                Directory
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
            {/* Search and Filters */}
            <div className="bg-white rounded-lg border border-fase-light-gold p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <label htmlFor="search" className="block text-sm font-medium text-fase-black mb-2">
                    Search Directory
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, organisation, or location..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-blue focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Country Filter */}
                <div className="md:w-64">
                  <label htmlFor="country" className="block text-sm font-medium text-fase-black mb-2">
                    Filter by Country
                  </label>
                  <select
                    id="country"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-blue focus:border-transparent"
                  >
                    <option value="">All Countries</option>
                    {availableCountries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-noto-serif font-bold text-fase-navy">
                FASE Members
              </h2>
              <p className="text-sm text-gray-600">
                {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
                {searchTerm || selectedCountry ? ' found' : ''}
              </p>
            </div>

            {/* Directory Grid */}
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || selectedCountry 
                    ? "Try adjusting your search or filter criteria."
                    : "The directory will be populated as members join FASE."
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-white border border-fase-light-gold rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
                          {member.personalName}
                        </h3>
                        {member.primaryContact?.role && (
                          <p className="text-sm text-fase-black mt-1">{member.primaryContact.role}</p>
                        )}
                      </div>
                    </div>

                    {member.organizationName && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-fase-navy">
                          {member.organizationName}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 text-sm text-fase-black">
                      {member.registeredAddress?.country && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{member.registeredAddress.country}</span>
                        </div>
                      )}
                      
                      {(member.primaryContact?.email || member.email) && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <a 
                            href={`mailto:${member.primaryContact?.email || member.email}`}
                            className="text-fase-blue hover:underline"
                          >
                            {member.primaryContact?.email || member.email}
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
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </PageLayout>
  );
}