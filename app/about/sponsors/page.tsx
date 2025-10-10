/* eslint-disable react/no-unescaped-entities */
'use client';

import PageLayout from '../../../components/PageLayout';
import TitleHero from '../../../components/TitleHero';
import ContentHero from '../../../components/ContentHero';
import Button from '../../../components/Button';

export default function SponsorsPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Sponsorship Levels', id: 'sponsorship-levels' },
    { name: 'Founding Supporters', id: 'founding-supporters' },
    { name: 'Why Sponsor', id: 'why-sponsor' },
    { name: 'Become a Sponsor', id: 'become-sponsor' }
  ];

  return (
    <PageLayout currentPage="about" sections={sections}>
      <main className="flex-1">
        <TitleHero 
          id="hero"
          title="Our Sponsors"
          useDefaultSubtitle={true}
          backgroundImage="/hamburg.jpg"
          fullHeight={true}
        />

        {/* Sponsorship Tiers */}
        <ContentHero id="sponsorship-levels" fullHeight={false} className="bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">Sponsorship Levels</h2>
              <p className="text-xl text-fase-black max-w-3xl mx-auto">
                Multiple sponsorship opportunities designed to showcase your commitment to the European MGA community.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
              {/* Platinum Sponsors */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200  p-8 text-center border-2 border-gray-300">
                <div className="w-20 h-20 bg-gray-600  flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Platinum Sponsors</h3>
                <p className="text-fase-black leading-relaxed mb-6">
                  Premier level recognition with maximum visibility across all FASE activities.
                </p>
                <ul className="text-left text-fase-black text-sm space-y-2">
                  <li>• Conference title sponsorship</li>
                  <li>• Logo on all marketing materials</li>
                  <li>• Speaking opportunities</li>
                  <li>• Premium booth placement</li>
                  <li>• Annual report feature</li>
                </ul>
              </div>

              {/* Gold Sponsors */}
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200  p-8 text-center border-2 border-yellow-400">
                <div className="w-20 h-20 bg-yellow-600  flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Gold Sponsors</h3>
                <p className="text-fase-black leading-relaxed mb-6">
                  High-level visibility with significant branding opportunities.
                </p>
                <ul className="text-left text-fase-black text-sm space-y-2">
                  <li>• Session sponsorship</li>
                  <li>• Website logo placement</li>
                  <li>• Networking event branding</li>
                  <li>• Exhibition space</li>
                  <li>• Newsletter mentions</li>
                </ul>
              </div>

              {/* Silver Sponsors */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100  p-8 text-center border-2 border-gray-300">
                <div className="w-20 h-20 bg-gray-400  flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Silver Sponsors</h3>
                <p className="text-fase-black leading-relaxed mb-6">
                  Supporting level with valuable exposure and networking benefits.
                </p>
                <ul className="text-left text-fase-black text-sm space-y-2">
                  <li>• Logo in event materials</li>
                  <li>• Directory listing</li>
                  <li>• Networking participation</li>
                  <li>• Digital recognition</li>
                  <li>• Member communications</li>
                </ul>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* Current Sponsors Preview */}
        <ContentHero id="founding-supporters" fullHeight={false} className="bg-fase-light-blue py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">Founding Supporters</h2>
              <p className="text-xl text-fase-black max-w-3xl mx-auto">
                Forward-thinking organizations showing early support for FASE&apos;s mission.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {/* Sponsor placeholders */}
              {[
                { name: "[Company Name]", type: "Platinum", sector: "Reinsurance" },
                { name: "[Company Name]", type: "Gold", sector: "Technology" },
                { name: "[Company Name]", type: "Gold", sector: "Consulting" },
                { name: "[Company Name]", type: "Silver", sector: "Insurance" }
              ].map((sponsor, index) => (
                <div key={index} className="bg-white  p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                  <div className="w-16 h-16 bg-fase-gold  flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-noto-serif font-bold text-sm">LOGO</span>
                  </div>
                  <h3 className="text-lg font-noto-serif font-bold text-fase-navy mb-2">{sponsor.name}</h3>
                  <p className="text-fase-cream text-sm mb-2">{sponsor.sector}</p>
                  <div className={`inline-block px-3 py-1  text-xs font-medium ${
                    sponsor.type === 'Platinum' 
                      ? 'bg-gray-600 text-white' 
                      : sponsor.type === 'Gold'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-400 text-white'
                  }`}>
                    {sponsor.type} Sponsor
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-fase-navy  p-8 text-center text-white">
              <h3 className="text-2xl font-noto-serif font-bold mb-4">Join Our Sponsors</h3>
              <p className="text-fase-paper mb-6 max-w-2xl mx-auto">
                Sponsorship packages are available for FASE&apos;s inaugural events and ongoing activities. 
                Support the growth of the European MGA community.
              </p>
              <Button href="/sponsorship" variant="primary" size="large">
                Explore Sponsorship
              </Button>
            </div>
          </div>
        </ContentHero>

        {/* Sponsorship Benefits */}
        <ContentHero id="why-sponsor" fullHeight={false} className="bg-fase-navy py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">Why Sponsor FASE?</h2>
              <p className="text-xl text-fase-black max-w-3xl mx-auto">
                Position your organization at the forefront of European MGA development.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-fase-gold  flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Market Visibility</h3>
                <p className="text-fase-black text-sm">Reach decision-makers across European MGA markets</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-fase-navy  flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Network Access</h3>
                <p className="text-fase-black text-sm">Direct engagement with industry leaders and prospects</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-fase-navy  flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Thought Leadership</h3>
                <p className="text-fase-black text-sm">Platform to share expertise and industry insights</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-fase-gold  flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Industry Support</h3>
                <p className="text-fase-black text-sm">Demonstrate commitment to sector development</p>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* CTA */}
        <ContentHero id="become-sponsor" fullHeight={false} className="bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-noto-serif font-bold text-white mb-6">Become a FASE Sponsor</h2>
            <p className="text-xl text-fase-paper mb-8 max-w-3xl mx-auto">
              Support the European MGA community while advancing your business objectives. 
              Sponsorship packages available for all budget levels.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button href="/sponsorship" variant="primary" size="large">
                View Sponsorship Options
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