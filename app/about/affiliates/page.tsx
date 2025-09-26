'use client';

import PageLayout from '../../../components/PageLayout';
import TitleHero from '../../../components/TitleHero';
import ContentHero from '../../../components/ContentHero';
import Button from '../../../components/Button';

export default function AffiliatesPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Partnership Framework', id: 'framework' },
    { name: 'Key Relationships', id: 'relationships' },
    { name: 'Benefits', id: 'benefits' },
    { name: 'Partner with Us', id: 'cta' }
  ];

  return (
    <PageLayout currentPage="about" sections={sections}>
      <main className="flex-1">
        <TitleHero 
          id="hero"
          title="Affiliates & Associates"
          useDefaultSubtitle={true}
          backgroundImage="/amsterdam.jpg"
          fullHeight={true}
        />

        {/* Partnership Types */}
        <ContentHero id="framework" fullHeight={true} className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-playfair font-bold text-fase-navy mb-6">Partnership Framework</h2>
              <p className="text-xl text-fase-steel max-w-3xl mx-auto">
                FASE collaborates with industry organizations, associations, and stakeholders across Europe.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
              {/* Strategic Affiliates */}
              <div className="bg-fase-paper  p-8 text-center">
                <div className="w-20 h-20 bg-fase-graphite  flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-playfair font-bold text-fase-navy mb-4">Strategic Affiliates</h3>
                <p className="text-fase-steel leading-relaxed mb-6">
                  National MGA associations and industry bodies with formal collaboration agreements.
                </p>
                <ul className="text-left text-fase-steel text-sm space-y-2">
                  <li>• Joint advocacy initiatives</li>
                  <li>• Shared research projects</li>
                  <li>• Cross-border collaboration</li>
                  <li>• Member exchange programs</li>
                </ul>
              </div>

              {/* Industry Associates */}
              <div className="bg-white  p-8 text-center shadow-lg border border-fase-silver">
                <div className="w-20 h-20 bg-fase-navy  flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                  </svg>
                </div>
                <h3 className="text-2xl font-playfair font-bold text-fase-navy mb-4">Industry Associates</h3>
                <p className="text-fase-steel leading-relaxed mb-6">
                  Professional service providers and industry stakeholders supporting MGA operations.
                </p>
                <ul className="text-left text-fase-steel text-sm space-y-2">
                  <li>• Legal and regulatory advisors</li>
                  <li>• Technology solution providers</li>
                  <li>• Risk management consultants</li>
                  <li>• Market research organizations</li>
                </ul>
              </div>

              {/* Regulatory Partners */}
              <div className="bg-white  p-8 text-center shadow-lg border border-fase-silver">
                <div className="w-20 h-20 bg-fase-navy  flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-playfair font-bold text-fase-navy mb-4">Regulatory Partners</h3>
                <p className="text-fase-steel leading-relaxed mb-6">
                  Dialogue with regulators and policy makers across European markets.
                </p>
                <ul className="text-left text-fase-steel text-sm space-y-2">
                  <li>• Regulatory consultation</li>
                  <li>• Policy development input</li>
                  <li>• Market intelligence sharing</li>
                  <li>• Best practice guidance</li>
                </ul>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* Existing Partnerships */}
        <ContentHero id="relationships" fullHeight={true} className="bg-fase-paper py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-playfair font-bold text-fase-navy mb-6">Key Relationships</h2>
              <p className="text-xl text-fase-steel max-w-3xl mx-auto">
                Building on established industry relationships as we formalize FASE partnerships.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { name: "[Organization Name]", country: "United Kingdom", type: "Strategic Affiliate" },
                { name: "[Organization Name]", country: "France", type: "Strategic Affiliate" },
                { name: "[Organization Name]", country: "Germany", type: "Industry Associate" },
                { name: "[Organization Name]", country: "United Kingdom", type: "Industry Associate" },
                { name: "[Organization Name]", country: "Belgium", type: "Regulatory Partner" },
                { name: "[Organization Name]", country: "Europe", type: "Regulatory Partner" }
              ].map((partner, index) => (
                <div key={index} className="bg-white  p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-playfair font-bold text-fase-navy mb-2 leading-tight">{partner.name}</h3>
                      <p className="text-fase-platinum text-sm">{partner.country}</p>
                    </div>
                  </div>
                  <div className={`inline-block px-3 py-1  text-xs font-medium ${
                    partner.type === 'Strategic Affiliate' 
                      ? 'bg-fase-graphite text-white' 
                      : partner.type === 'Industry Associate'
                      ? 'bg-fase-navy text-white'
                      : 'bg-fase-navy text-white'
                  }`}>
                    {partner.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ContentHero>

        {/* Benefits of Partnership */}
        <ContentHero id="benefits" fullHeight={true} className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl font-playfair font-bold text-fase-navy mb-6">Partnership Benefits</h2>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-fase-graphite  flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-playfair font-semibold text-fase-navy mb-2">Market Access</h3>
                      <p className="text-fase-steel">Enhanced access to European markets through partner networks and relationships.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-fase-navy  flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-playfair font-semibold text-fase-navy mb-2">Knowledge Sharing</h3>
                      <p className="text-fase-steel">Access to shared research, best practices, and market intelligence across borders.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-fase-navy  flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-playfair font-semibold text-fase-navy mb-2">Collective Voice</h3>
                      <p className="text-fase-steel">Stronger advocacy position through coordinated industry representation.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-w-4 aspect-h-3  overflow-hidden shadow-2xl">
                  <img 
                    src="/vienna.jpg" 
                    alt="European Partnership" 
                    className="w-full h-96 object-cover"
                    style={{ filter: 'brightness(0.9) contrast(1.1) saturate(1.2)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-fase-navy/20 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* CTA */}
        <ContentHero id="cta" fullHeight={true} className="bg-fase-navy py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-playfair font-bold text-white mb-6">Partner with FASE</h2>
            <p className="text-xl text-fase-paper mb-8 max-w-3xl mx-auto">
              Interested in establishing a partnership? Connect with us to explore collaboration opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button href="/join" variant="primary" size="large">
                Explore Partnership
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