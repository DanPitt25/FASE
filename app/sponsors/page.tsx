'use client';

import PageLayout from '../../components/PageLayout';
import TitleHero from '../../components/TitleHero';
import ContentHero from '../../components/ContentHero';
import Button from '../../components/Button';

export default function SponsorsPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Partnership Opportunities', id: 'opportunities' },
    { name: 'Sponsor Benefits', id: 'benefits' },
    { name: 'Contact Us', id: 'contact' }
  ];

  return (
    <PageLayout currentPage="sponsors" sections={sections}>
      <main className="flex-1">
        <TitleHero
          id="hero"
          title="Partner with FASE"
          useDefaultSubtitle={true}
          backgroundImage="/conference.jpg"
          fullHeight={true}
        />

        {/* Partnership Overview */}
        <ContentHero id="opportunities" fullHeight={false} className="bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">Strategic Partnership Opportunities</h2>
                  <p className="text-lg text-fase-black leading-relaxed mb-6">
                    Partner with FASE to connect with Europe's leading MGAs, capacity providers, and insurance professionals. Our sponsorship opportunities provide direct access to key decision-makers across European insurance markets.
                  </p>
                  <p className="text-lg text-fase-black leading-relaxed">
                    From conference sponsorship to thought leadership platforms, we offer tailored partnership packages that align with your business objectives and market reach goals.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-fase-navy"></div>
                    <span className="text-fase-black font-medium">Pan-European Reach</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-fase-navy"></div>
                    <span className="text-fase-black font-medium">Senior Decision Makers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-fase-navy"></div>
                    <span className="text-fase-black font-medium">Industry Leadership</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-w-4 aspect-h-3 overflow-hidden shadow-2xl">
                  <img 
                    src="/conference.jpg" 
                    alt="Professional Conference" 
                    className="w-full h-96 object-cover"
                    style={{ filter: 'brightness(0.9) contrast(1.1) saturate(1.2)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-fase-navy/20 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* Sponsor Benefits */}
        <ContentHero id="benefits" fullHeight={false} className="bg-fase-light-blue py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">Partnership Benefits</h2>
              <p className="text-xl text-fase-black max-w-3xl mx-auto">
                Connect with Europe's most influential MGA community through strategic partnership opportunities.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center group">
                <div className="w-20 h-20 bg-fase-navy flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Network Access</h3>
                <p className="text-fase-black leading-relaxed">
                  Direct access to C-level executives from Europe's leading MGAs and capacity providers through exclusive networking events.
                </p>
              </div>
              <div className="bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center group">
                <div className="w-20 h-20 bg-fase-navy flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Thought Leadership</h3>
                <p className="text-fase-black leading-relaxed">
                  Position your organization as an industry leader through speaking opportunities and content partnerships.
                </p>
              </div>
              <div className="bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center group">
                <div className="w-20 h-20 bg-fase-navy flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Market Intelligence</h3>
                <p className="text-fase-black leading-relaxed">
                  Gain exclusive insights into European MGA market trends and opportunities through our research and events.
                </p>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* Contact CTA */}
        <ContentHero id="contact" fullHeight={false} className="bg-fase-navy py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-noto-serif font-bold text-white mb-6">Ready to Partner?</h2>
            <p className="text-xl text-fase-light-blue mb-8 max-w-3xl mx-auto">
              Contact us to discuss partnership opportunities and learn how FASE can help you connect with Europe's MGA community.
            </p>
            <Button href="/contact" variant="secondary" size="large">
              Contact Us Today
            </Button>
          </div>
        </ContentHero>
      </main>
    </PageLayout>
  );
}