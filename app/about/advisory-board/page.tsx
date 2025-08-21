'use client';

import PageLayout from '../../../components/PageLayout';
import TitleHero from '../../../components/TitleHero';
import ContentHero from '../../../components/ContentHero';
import Button from '../../../components/Button';

export default function CommitteesPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Governance', id: 'governance' },
    { name: 'Leadership', id: 'leadership' },
    { name: 'Get Involved', id: 'get-involved' }
  ];

  return (
    <PageLayout currentPage="about" sections={sections}>
      <main className="flex-1">
        <TitleHero 
          id="hero"
          title="Advisory Board & Governance"
          useDefaultSubtitle={true}
          backgroundImage="/rome.jpg"
          fullHeight={true}
        />

        {/* Governance Structure */}
        <ContentHero id="governance" fullHeight={true} className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-futura font-bold text-fase-navy mb-6">Governance Structure</h2>
              <p className="text-xl text-fase-steel max-w-3xl mx-auto">
                FASE operates through a collaborative committee structure, ensuring representation from across the European MGA community.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
              {/* Executive Committee */}
              <div className="bg-fase-paper  p-8 text-center">
                <div className="w-20 h-20 bg-fase-navy  flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-futura font-bold text-fase-navy mb-4">Executive Committee</h3>
                <p className="text-fase-steel leading-relaxed">
                  Strategic oversight and leadership, comprising representatives from major European MGA markets.
                </p>
              </div>

              {/* Technical Committee */}
              <div className="bg-white  p-8 text-center shadow-lg border border-fase-silver">
                <div className="w-20 h-20 bg-fase-graphite  flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-futura font-bold text-fase-navy mb-4">Technical Committee</h3>
                <p className="text-fase-steel leading-relaxed">
                  Focus on regulatory matters, technical standards, and best practices across European MGA operations.
                </p>
              </div>

              {/* Events Committee */}
              <div className="bg-white  p-8 text-center shadow-lg border border-fase-silver">
                <div className="w-20 h-20 bg-fase-navy  flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6m-6 0l-.5 8.5A2 2 0 003.502 17h16.996a2 2 0 002-1.5L22 7m-6 0V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v1" />
                  </svg>
                </div>
                <h3 className="text-2xl font-futura font-bold text-fase-navy mb-4">Events Committee</h3>
                <p className="text-fase-steel leading-relaxed">
                  Planning and coordination of FASE conferences, networking events, and educational programs.
                </p>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* Committee Members */}
        <ContentHero id="leadership" fullHeight={true} className="bg-fase-paper py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-futura font-bold text-fase-navy mb-6">Committee Leadership</h2>
              <p className="text-xl text-fase-steel max-w-3xl mx-auto">
                Industry experts and thought leaders representing the diversity of European MGA markets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { name: "[Name]", role: "[Executive Chair]", location: "Germany", image: "/hamburg.jpg" },
                { name: "[Name]", role: "[Technical Lead]", location: "United Kingdom", image: "/london.jpg" },
                { name: "[Name]", role: "[Events Director]", location: "Italy", image: "/rome.jpg" },
                { name: "[Name]", role: "[Regulatory Affairs]", location: "France", image: "/paris.jpg" }
              ].map((member, index) => (
                <div key={index} className="bg-white  shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={member.image} 
                      alt={`${member.location} cityscape`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      style={{ filter: 'brightness(0.9) contrast(1.1)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-fase-navy/60 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 text-white text-sm">
                      {member.location}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-futura font-bold text-fase-navy mb-1">{member.name}</h3>
                    <p className="text-fase-steel font-medium">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ContentHero>

        {/* Get Involved */}
        <ContentHero id="get-involved" fullHeight={true} className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-futura font-bold text-fase-navy mb-6">Get Involved</h2>
              <p className="text-xl text-fase-steel max-w-3xl mx-auto mb-8">
                Committee positions will be available to founding members once FASE officially launches. Shape the future of European MGA collaboration.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button href="/join" variant="primary" size="large">
                  Register Interest
                </Button>
                <Button href="/about" variant="secondary" size="large">
                  Back to About
                </Button>
              </div>
            </div>
          </div>
        </ContentHero>
      </main>
    </PageLayout>
  );
}