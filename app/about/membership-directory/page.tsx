/* eslint-disable react/no-unescaped-entities */
'use client';

import PageLayout from '../../../components/PageLayout';
import TitleHero from '../../../components/TitleHero';
import ContentHero from '../../../components/ContentHero';
import Button from '../../../components/Button';

export default function MembershipDirectoryPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Growing Community', id: 'directory-preview' },
    { name: 'Directory Size', id: 'directory-size' },
    { name: 'Get Listed', id: 'get-listed' }
  ];

  return (
    <PageLayout currentPage="about" sections={sections}>
      <main className="flex-1">
        <TitleHero 
          id="hero"
          title="Membership Directory"
          useDefaultSubtitle={true}
          backgroundImage="/madrid.jpg"
          fullHeight={true}
        />

        {/* Directory Preview */}
        <ContentHero id="directory-preview" fullHeight={false} className="bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">Growing Community</h2>
              <p className="text-xl text-fase-black max-w-3xl mx-auto">
                Our directory will showcase the diverse FASE community once we officially launch.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {/* Sample Directory Entries */}
              {[
                { company: "[Company Name]", location: "London, UK", type: "MGA Member", specialties: ["Property", "Casualty"] },
                { company: "[Company Name]", location: "Hamburg, DE", type: "MGA Member", specialties: ["Marine", "Aviation"] },
                { company: "[Company Name]", location: "Rome, IT", type: "MGA Member", specialties: ["Travel", "Health"] },
                { company: "[Company Name]", location: "Stockholm, SE", type: "Capacity Provider", specialties: ["Reinsurance"] },
                { company: "[Company Name]", location: "Paris, FR", type: "Service Provider", specialties: ["Technology"] },
                { company: "[Company Name]", location: "Madrid, ES", type: "Service Provider", specialties: ["Data Analytics"] }
              ].map((member, index) => (
                <div key={index} className="bg-fase-light-blue  p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-fase-light-gold">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-noto-serif font-bold text-fase-navy mb-1">{member.company}</h3>
                      <p className="text-fase-cream text-sm">{member.location}</p>
                    </div>
                    <div className={`px-3 py-1  text-xs font-medium ${
                      member.type === 'MGA Member' 
                        ? 'bg-fase-gold text-white' 
                        : member.type === 'Capacity Provider'
                        ? 'bg-fase-navy text-white'
                        : 'bg-fase-navy text-white'
                    }`}>
                      {member.type}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-fase-black text-sm font-medium">Specialties:</p>
                    <div className="flex flex-wrap gap-2">
                      {member.specialties.map((specialty, idx) => (
                        <span key={idx} className="bg-white px-2 py-1 text-xs text-fase-navy border border-fase-light-gold">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Directory Features */}
            <div className="bg-fase-navy  p-8 text-center text-white mb-16">
              <h3 className="text-2xl font-noto-serif font-bold mb-6">Directory Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-fase-gold  flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h4 className="font-noto-serif font-semibold">Advanced Search</h4>
                  <p className="text-fase-paper text-sm">Filter by location, specialties, member type, and more</p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-fase-navy  flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className="font-noto-serif font-semibold">Direct Connection</h4>
                  <p className="text-fase-paper text-sm">Connect directly with members through secure messaging</p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-fase-gold  flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <h4 className="font-noto-serif font-semibold">Market Intelligence</h4>
                  <p className="text-fase-paper text-sm">Access member market data and industry insights</p>
                </div>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* Stats */}
        <ContentHero id="directory-size" fullHeight={false} className="bg-fase-light-blue py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-12">Anticipated Directory Size</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <div className="text-4xl font-noto-serif font-bold text-fase-navy">200+</div>
                <div className="text-fase-black">MGA Members</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-noto-serif font-bold text-fase-navy">50+</div>
                <div className="text-fase-black">Capacity Providers</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-noto-serif font-bold text-fase-navy">100+</div>
                <div className="text-fase-black">Service Providers</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-noto-serif font-bold text-fase-navy">20+</div>
                <div className="text-fase-black">Countries</div>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* CTA */}
        <ContentHero id="get-listed" fullHeight={false} className="bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">Be Listed in Our Directory</h2>
            <p className="text-xl text-fase-black mb-8 max-w-3xl mx-auto">
              Register your interest to be included in FASE&apos;s comprehensive membership directory when we launch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button href="/join" variant="primary" size="large">
                Register for Directory
              </Button>
              <Button href="/about" variant="secondary" size="large">
                Back to About
              </Button>
            </div>
          </div>
        </ContentHero>
      </main>
    </PageLayout>
  );
}