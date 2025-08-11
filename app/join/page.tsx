/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import Header from '../../components/Header';

export default function JoinPage() {
  const [selectedMembership, setSelectedMembership] = useState('mga');
  const [headerLoaded, setHeaderLoaded] = useState(false);

  return (
    <div className={`min-h-screen bg-fase-ice-blue font-lato transition-opacity duration-300 ${headerLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Header currentPage="join" onLoad={() => setHeaderLoaded(true)} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-fase-navy py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-futura font-bold text-white mb-6">Join FASE</h1>
            <p className="text-xl text-fase-ice-blue max-w-3xl mx-auto">
              Become part of Europe&apos;s premier MGA community. Three membership categories available to serve the entire ecosystem.
            </p>
          </div>
        </section>

        {/* Membership Types */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-futura font-bold text-fase-navy mb-4">Choose Your Membership</h2>
              <p className="text-lg text-fase-dark-slate max-w-2xl mx-auto">
                FASE offers three distinct membership categories to serve MGAs, market practitioners, and service providers across Europe.
              </p>
            </div>

            {/* Membership Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {/* MGA Membership */}
              <div className="bg-fase-ice-blue rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-fase-sage">
                <div className="text-center">
                  <div className="w-20 h-20 bg-fase-sage rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-futura font-bold text-fase-navy mb-4">MGA Member</h3>
                  <p className="text-fase-dark-slate mb-6">
                    Full membership for Managing General Agents operating in Europe.
                  </p>
                  <div className="text-left space-y-3 mb-8">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-sage mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Voting rights</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-sage mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Committee participation</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-sage mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Full access to resources</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-sage mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Conference discounts</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedMembership('mga')}
                    className="w-full bg-fase-sage text-white py-3 rounded-lg font-medium hover:bg-green-700 transition duration-200"
                  >
                    Register Interest
                  </button>
                </div>
              </div>

              {/* Market Practitioner */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-fase-navy">
                <div className="text-center">
                  <div className="w-20 h-20 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-futura font-bold text-fase-navy mb-4">Market Practitioner</h3>
                  <p className="text-fase-dark-slate mb-6">
                    For capacity providers, insurers, and reinsurers working with MGAs.
                  </p>
                  <div className="text-left space-y-3 mb-8">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-navy mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Market intelligence access</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-navy mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Networking opportunities</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-navy mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Event participation</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-navy mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Industry insights</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedMembership('practitioner')}
                    className="w-full bg-fase-navy text-white py-3 rounded-lg font-medium hover:bg-fase-dark-slate transition duration-200"
                  >
                    Register Interest
                  </button>
                </div>
              </div>

              {/* Supplier */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-fase-orange">
                <div className="text-center">
                  <div className="w-20 h-20 bg-fase-orange rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-futura font-bold text-fase-navy mb-4">Supplier</h3>
                  <p className="text-fase-dark-slate mb-6">
                    For service providers supporting the MGA ecosystem.
                  </p>
                  <div className="text-left space-y-3 mb-8">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-orange mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Business development access</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-orange mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Sponsorship opportunities</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-orange mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Market visibility</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-fase-orange mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">Industry connection</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedMembership('supplier')}
                    className="w-full bg-fase-orange text-white py-3 rounded-lg font-medium hover:bg-yellow-600 transition duration-200"
                  >
                    Register Interest
                  </button>
                </div>
              </div>
            </div>

            {/* Launch Information */}
            <div className="bg-fase-navy rounded-2xl p-8 text-center text-white">
              <h3 className="text-2xl font-futura font-bold mb-4">Federation Launch</h3>
              <p className="text-fase-ice-blue mb-6 max-w-3xl mx-auto">
                FASE will be officially launched when a quorum of fifty (50) MGAs have registered their interest. 
                No membership dues will be payable before this point. Register your interest today to help us reach this milestone.
              </p>
              <div className="flex justify-center items-center space-x-8">
                <div className="text-center">
                  <div className="text-4xl font-futura font-bold text-fase-orange mb-2">0</div>
                  <div className="text-sm text-fase-ice-blue">Current Registrations</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-futura font-bold text-fase-orange mb-2">50</div>
                  <div className="text-sm text-fase-ice-blue">Target for Launch</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}