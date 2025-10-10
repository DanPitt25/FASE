/* eslint-disable react/no-unescaped-entities */
'use client';

import PageLayout from '../../components/PageLayout';
import TitleHero from '../../components/TitleHero';
import ContentHero from '../../components/ContentHero';

export default function JoinPage() {
  
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Membership Types', id: 'membership-types' }
  ];

  return (
    <PageLayout currentPage="join" sections={sections}>
      <main className="flex-1">
        <TitleHero 
          id="hero"
          title="Join FASE"
          useDefaultSubtitle={true}
          backgroundImage="/vienna.jpg"
          fullHeight={true}
        />

        {/* Membership Types */}
        <ContentHero id="membership-types" fullHeight={false} className="bg-fase-cream py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-noto-serif font-bold text-fase-navy mb-4">Choose Your Membership</h2>
              <p className="text-lg text-fase-black max-w-2xl mx-auto">
                FASE offers three distinct membership categories to serve MGAs, market practitioners, and service providers across Europe.
              </p>
            </div>

            {/* Membership Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* MGA Membership */}
              <a 
                href="/member-portal"
                className="group bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-fase-light-gold hover:border-fase-navy overflow-hidden cursor-pointer"
              >
                {/* Image Header */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src="/london.jpg" 
                    alt="MGA Member" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-fase-navy/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-2xl font-noto-serif font-bold text-white">MGA Member</h3>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <p className="text-fase-black mb-6 leading-relaxed">
                    Full membership for Managing General Agents operating in Europe.
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Voting rights</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Committee participation</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Full access to resources</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Conference benefits</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-fase-navy">Join as MGA Member</span>
                    <svg className="w-5 h-5 text-fase-navy group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>

              {/* Market Practitioner */}
              <a 
                href="/member-portal"
                className="group bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-fase-light-gold hover:border-fase-navy overflow-hidden cursor-pointer"
              >
                {/* Image Header */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src="/market.jpg" 
                    alt="Market Practitioner" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-fase-navy/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-2xl font-noto-serif font-bold text-white">Market Practitioner</h3>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <p className="text-fase-black mb-6 leading-relaxed">
                    For capacity providers, insurers, and reinsurers working with MGAs.
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Market intelligence access</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Networking opportunities</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Event participation</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Industry insights</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-fase-navy">Join as Market Practitioner</span>
                    <svg className="w-5 h-5 text-fase-navy group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>

              {/* Supplier */}
              <a 
                href="/member-portal"
                className="group bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-fase-light-gold hover:border-fase-navy overflow-hidden cursor-pointer"
              >
                {/* Image Header */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src="/regulatory.jpg" 
                    alt="Supplier" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-fase-navy/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-2xl font-noto-serif font-bold text-white">Supplier</h3>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <p className="text-fase-black mb-6 leading-relaxed">
                    For service providers supporting the MGA ecosystem.
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Business development access</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Sponsorship opportunities</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Market visibility</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-fase-navy rounded-full mr-3"></div>
                      <span className="text-sm text-fase-black">Industry connection</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-fase-navy">Join as Supplier</span>
                    <svg className="w-5 h-5 text-fase-navy group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </ContentHero>
      </main>
    </PageLayout>
  );
}