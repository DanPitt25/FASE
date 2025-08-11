'use client';

import { useState } from 'react';
import Header from '../../components/Header';

export default function AboutPage() {
  const [headerLoaded, setHeaderLoaded] = useState(false);

  return (
    <div className={`min-h-screen bg-fase-ice-blue font-lato transition-opacity duration-300 ${headerLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Header currentPage="about" onLoad={() => setHeaderLoaded(true)} />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-fase-navy py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-futura font-bold text-white mb-6">About FASE</h1>
            <p className="text-xl text-fase-ice-blue max-w-3xl mx-auto">
              The Federation of European MGAs - representing the managing general agent community across Europe.
            </p>
          </div>
        </section>

        {/* Content Sections */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Who We Are */}
              <div className="space-y-6">
                <h2 className="text-3xl font-futura font-bold text-fase-navy">Who We Are</h2>
                <p className="text-fase-dark-slate text-lg leading-relaxed">
                  FASE is the premier organization representing Managing General Agents (MGAs) across Europe. We serve as a unified voice for the MGA community, providing advocacy, networking opportunities, and market intelligence to our members.
                </p>
                <p className="text-fase-dark-slate text-lg leading-relaxed">
                  Our mission is to improve awareness of the critical role that MGAs play in the insurance value chain while creating a forum for MGAs, capacity providers, and service providers to connect and do business together.
                </p>
                <a href="/about/who-we-are" className="inline-block bg-fase-orange text-white px-6 py-3 rounded-md font-medium hover:bg-yellow-600 transition duration-200">
                  Learn More About Us
                </a>
              </div>

              {/* Our Impact */}
              <div className="space-y-6">
                <h2 className="text-3xl font-futura font-bold text-fase-navy">Our Impact</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-fase-sage rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-semibold text-fase-navy">Industry Advocacy</h3>
                      <p className="text-fase-dark-slate">Representing MGA interests in regulatory discussions at national and European levels.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-fase-navy rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-semibold text-fase-navy">Market Intelligence</h3>
                      <p className="text-fase-dark-slate">Providing comprehensive market data and insights across European MGA markets.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-fase-orange rounded-full mt-2"></div>
                    <div>
                      <h3 className="font-semibold text-fase-navy">Professional Networking</h3>
                      <p className="text-fase-dark-slate">Facilitating connections through pan-European conferences and events.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-16 bg-fase-ice-blue">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-futura font-bold text-fase-navy text-center mb-12">Explore FASE</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <a href="/about/committees" className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-fase-sage rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-futura font-semibold text-fase-navy mb-2">Committees</h3>
                <p className="text-fase-dark-slate">Learn about our working groups and governance structure.</p>
              </a>

              <a href="/about/membership-directory" className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-futura font-semibold text-fase-navy mb-2">Member Directory</h3>
                <p className="text-fase-dark-slate">Browse our comprehensive membership directory.</p>
              </a>

              <a href="/about/sponsors" className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-fase-orange rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-futura font-semibold text-fase-navy mb-2">Our Sponsors</h3>
                <p className="text-fase-dark-slate">Meet the organizations that support FASE&apos;s mission.</p>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}