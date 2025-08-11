'use client';

import { useState } from 'react';
import Header from '../../../components/Header';

export default function MembershipDirectoryPage() {
  const [headerLoaded, setHeaderLoaded] = useState(false);

  return (
    <div className={`min-h-screen bg-fase-ice-blue font-lato transition-opacity duration-300 ${headerLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Header currentPage="about" onLoad={() => setHeaderLoaded(true)} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-fase-navy py-24 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <nav className="flex justify-center mb-8">
              <ol className="flex items-center space-x-2 text-sm">
                <li><a href="/" className="text-fase-ice-blue hover:text-white">Home</a></li>
                <li className="text-fase-ice-blue">/</li>
                <li><a href="/about" className="text-fase-ice-blue hover:text-white">About</a></li>
                <li className="text-fase-ice-blue">/</li>
                <li className="text-white font-medium">Membership Directory</li>
              </ol>
            </nav>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-futura font-bold text-white mb-6 leading-tight">
              Membership Directory
            </h1>
            <p className="text-xl sm:text-2xl text-fase-ice-blue max-w-4xl mx-auto leading-relaxed">
              Connect with MGAs and industry partners across Europe.
            </p>
          </div>
        </section>

        {/* Directory Preview */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-futura font-bold text-fase-navy mb-6">Growing Community</h2>
              <p className="text-xl text-fase-dark-slate max-w-3xl mx-auto">
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
                <div key={index} className="bg-fase-ice-blue rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-fase-light-gray">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-futura font-bold text-fase-navy mb-1">{member.company}</h3>
                      <p className="text-fase-blue-gray text-sm">{member.location}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      member.type === 'MGA Member' 
                        ? 'bg-fase-sage text-white' 
                        : member.type === 'Capacity Provider'
                        ? 'bg-fase-navy text-white'
                        : 'bg-fase-orange text-white'
                    }`}>
                      {member.type}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-fase-dark-slate text-sm font-medium">Specialties:</p>
                    <div className="flex flex-wrap gap-2">
                      {member.specialties.map((specialty, idx) => (
                        <span key={idx} className="bg-white px-2 py-1 rounded text-xs text-fase-navy border border-fase-light-gray">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Directory Features */}
            <div className="bg-fase-navy rounded-2xl p-8 text-center text-white mb-16">
              <h3 className="text-2xl font-futura font-bold mb-6">Directory Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-fase-sage rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h4 className="font-futura font-semibold">Advanced Search</h4>
                  <p className="text-fase-ice-blue text-sm">Filter by location, specialties, member type, and more</p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-fase-orange rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className="font-futura font-semibold">Direct Connection</h4>
                  <p className="text-fase-ice-blue text-sm">Connect directly with members through secure messaging</p>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-fase-sage rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <h4 className="font-futura font-semibold">Market Intelligence</h4>
                  <p className="text-fase-ice-blue text-sm">Access member market data and industry insights</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 bg-fase-ice-blue">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-futura font-bold text-fase-navy mb-12">Anticipated Directory Size</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <div className="text-4xl font-futura font-bold text-fase-navy">200+</div>
                <div className="text-fase-dark-slate">MGA Members</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-futura font-bold text-fase-navy">50+</div>
                <div className="text-fase-dark-slate">Capacity Providers</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-futura font-bold text-fase-navy">100+</div>
                <div className="text-fase-dark-slate">Service Providers</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-futura font-bold text-fase-navy">20+</div>
                <div className="text-fase-dark-slate">Countries</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-futura font-bold text-fase-navy mb-6">Be Listed in Our Directory</h2>
            <p className="text-xl text-fase-dark-slate mb-8 max-w-3xl mx-auto">
              Register your interest to be included in FASE&apos;s comprehensive membership directory when we launch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/join" className="bg-fase-navy text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-fase-dark-slate transition duration-300">
                Register for Directory
              </a>
              <a href="/about" className="bg-white text-fase-navy px-8 py-4 rounded-xl text-lg font-medium hover:bg-gray-50 transition duration-300 border border-fase-light-gray">
                Back to About
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}