/* eslint-disable react/no-unescaped-entities */
'use client';

import PageLayout from '../../components/PageLayout';
import TitleHero from '../../components/TitleHero';
import ContentHero from '../../components/ContentHero';
import Button from '../../components/Button';

export default function AboutPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Who We Are', id: 'who-we-are' },
    { name: 'Explore FASE', id: 'explore' }
  ];

  return (
    <PageLayout currentPage="about" sections={sections}>
      {/* Main Content */}
      <main className="flex-1">
        <TitleHero 
          id="hero"
          title="About FASE"
          useDefaultSubtitle={true}
          backgroundImage="/london.jpg"
          fullHeight={true}
        />

        {/* Content Sections */}
        <ContentHero id="who-we-are" fullHeight={false} className="bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Who We Are */}
              <div className="space-y-6">
                <h2 className="text-3xl font-noto-serif font-bold text-fase-navy">Who We Are</h2>
                <p className="text-fase-black text-lg leading-relaxed">
                  FASE is the premier organization representing Managing General Agents (MGAs) across Europe. We serve as a unified voice for the MGA community, providing advocacy, networking opportunities, and market intelligence to our members.
                </p>
                <p className="text-fase-black text-lg leading-relaxed">
                  Our mission is to improve awareness of the critical role that MGAs play in the insurance value chain while creating a forum for MGAs, capacity providers, and service providers to connect and do business together.
                </p>
                <div className="mt-8">
                  <Button href="/about/who-we-are" variant="primary" size="medium">
                    Learn More About Us
                  </Button>
                </div>
              </div>

              {/* Our Impact */}
              <div className="space-y-6">
                <h2 className="text-3xl font-noto-serif font-bold text-fase-navy">Our Impact</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-fase-navy mt-2"></div>
                    <div>
                      <h3 className="font-semibold text-fase-navy">Industry Advocacy</h3>
                      <p className="text-fase-black">Representing MGA interests in regulatory discussions at national and European levels.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-fase-navy mt-2"></div>
                    <div>
                      <h3 className="font-semibold text-fase-navy">Market Intelligence</h3>
                      <p className="text-fase-black">Providing comprehensive market data and insights across European MGA markets.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-fase-navy mt-2"></div>
                    <div>
                      <h3 className="font-semibold text-fase-navy">Professional Networking</h3>
                      <p className="text-fase-black">Facilitating connections through pan-European conferences and events.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* Quick Links */}
        <ContentHero id="explore" fullHeight={false} className="bg-fase-light-blue py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-noto-serif font-bold text-fase-navy text-center mb-12">Explore FASE</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <a href="/about/committees" className="bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-fase-gold  flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">Committees</h3>
                <p className="text-fase-black">Learn about our working groups and governance structure.</p>
              </a>

              <a href="/about/membership-directory" className="bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-fase-navy  flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">Member Directory</h3>
                <p className="text-fase-black">Browse our comprehensive membership directory.</p>
              </a>

              <a href="/about/sponsors" className="bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-fase-navy  flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">Our Sponsors</h3>
                <p className="text-fase-black">Meet the organizations that support FASE's mission.</p>
              </a>
            </div>
          </div>
        </ContentHero>
      </main>
    </PageLayout>
  );
}