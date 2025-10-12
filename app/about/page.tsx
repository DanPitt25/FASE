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
    { name: 'Our Mission', id: 'mission' },
    { name: 'Core Values', id: 'values' },
    { name: 'Our Growing Community', id: 'community' },
    { name: 'Join Us', id: 'join' }
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
                  FASE is the premier organization representing Managing General Agents (MGAs) across Europe. We serve as a unified voice for the MGA community, providing networking opportunities, professional development, and market intelligence to our members.
                </p>
                <p className="text-fase-black text-lg leading-relaxed">
                  Our mission is to elevate awareness of the critical role that MGAs play in the insurance value chain while creating a forum for MGAs, capacity providers, and service providers to connect and do business together.
                </p>
                <div className="mt-8">
                  <Button href="/join" variant="primary" size="medium">
                    Join Now
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
                      <h3 className="font-semibold text-fase-navy">Professional Networking</h3>
                      <p className="text-fase-black">Facilitating connections through pan-European conferences and events.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-fase-navy mt-2"></div>
                    <div>
                      <h3 className="font-semibold text-fase-navy">Professional Development</h3>
                      <p className="text-fase-black">Providing comprehensive market data and insights across European MGA markets.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-fase-navy mt-2"></div>
                    <div>
                      <h3 className="font-semibold text-fase-navy">Industry Advocacy</h3>
                      <p className="text-fase-black">Representing MGA interests in regulatory discussions at national and European levels.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* Mission Section */}
        <ContentHero id="mission" fullHeight={false} className="bg-fase-light-blue py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">Our Mission</h2>
                  <p className="text-lg text-fase-black leading-relaxed mb-6">
                    FASE exists to elevate the profile and influence of Managing General Agents across Europe. Through strategic networking, professional development, and market intelligence, we strengthen the entire MGA ecosystem and drive sustainable growth across European insurance markets.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-fase-navy"></div>
                    <span className="text-fase-black font-medium">Industry Leadership</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-fase-navy"></div>
                    <span className="text-fase-black font-medium">Market Innovation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-fase-navy"></div>
                    <span className="text-fase-black font-medium">Professional Excellence</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-w-4 aspect-h-3 overflow-hidden shadow-2xl">
                  <img 
                    src="/london.jpg" 
                    alt="European Business District" 
                    className="w-full h-96 object-cover"
                    style={{ filter: 'brightness(0.9) contrast(1.1) saturate(1.2)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-fase-navy/20 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* Values Section */}
        <ContentHero id="values" fullHeight={false} className="bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">Our Core Values</h2>
              <p className="text-xl text-fase-black max-w-3xl mx-auto">
                The principles that guide everything we do as we build the future of European MGA collaboration.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center group">
                <div className="w-20 h-20 bg-fase-navy flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Networking</h3>
                <p className="text-fase-black leading-relaxed">
                  Building bridges between MGAs, insurers, and service providers to create a stronger, more connected European insurance ecosystem.
                </p>
              </div>
              <div className="bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center group">
                <div className="w-20 h-20 bg-fase-navy flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Development</h3>
                <p className="text-fase-black leading-relaxed">
                  Championing forward-thinking approaches to insurance distribution and embracing digital transformation across the MGA landscape.
                </p>
              </div>
              <div className="bg-white p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center group">
                <div className="w-20 h-20 bg-fase-navy flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Excellence</h3>
                <p className="text-fase-black leading-relaxed">
                  Setting the highest standards for professional conduct, market practices, and service delivery throughout our community.
                </p>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* Community Section */}
        <ContentHero id="community" fullHeight={false} className="bg-fase-navy py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-noto-serif font-bold text-white mb-6">Our Growing Community</h2>
              <p className="text-xl text-fase-light-blue max-w-3xl mx-auto">
                Building momentum across European markets with industry leaders ready to shape the future.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-5xl font-noto-serif font-bold text-white">15+</div>
                <div className="text-fase-light-blue">Countries Represented</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-noto-serif font-bold text-white">150+</div>
                <div className="text-fase-light-blue">Industry Partners</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-noto-serif font-bold text-white">€2.5B+</div>
                <div className="text-fase-light-blue">Combined Premium Volume</div>
              </div>
            </div>
          </div>
        </ContentHero>

        {/* CTA Section */}
        <ContentHero id="join" fullHeight={false} className="bg-fase-light-blue py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-noto-serif font-bold text-fase-navy mb-6">Ready to Shape the Future?</h2>
            <p className="text-xl text-fase-black mb-8 max-w-3xl mx-auto">
              Join the growing community of forward-thinking MGAs and industry partners building the future of European insurance distribution.
            </p>
            <Button href="/join" variant="primary" size="large">
              Join FASE Today
            </Button>
          </div>
        </ContentHero>

        {/* Quick Links */}
        <ContentHero id="explore" fullHeight={false} className="bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-noto-serif font-bold text-fase-navy text-center mb-12">Explore FASE</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <a href="/events" className="bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-fase-navy flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">Events</h3>
                <p className="text-fase-black">Join our networking events and professional conferences.</p>
              </a>

              <a href="/about/membership-directory" className="bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-fase-navy flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">Member Directory</h3>
                <p className="text-fase-black">Browse our comprehensive membership directory.</p>
              </a>

              <a href="/knowledge" className="bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-fase-navy flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">Knowledge Base</h3>
                <p className="text-fase-black">Access market insights and professional development resources.</p>
              </a>
            </div>
          </div>
        </ContentHero>
      </main>
    </PageLayout>
  );
}