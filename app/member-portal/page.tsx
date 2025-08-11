'use client';

import { useState } from 'react';
import Header from '../../components/Header';

export default function MemberPortalPage() {
  const [headerLoaded, setHeaderLoaded] = useState(false);

  return (
    <div className={`min-h-screen bg-fase-ice-blue font-lato transition-opacity duration-300 ${headerLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Header currentPage="member-portal" onLoad={() => setHeaderLoaded(true)} />
      
      <main className="flex-1">
        <section className="bg-fase-navy py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-futura font-bold text-white mb-6">Member Portal</h1>
            <p className="text-xl text-fase-ice-blue max-w-3xl mx-auto">
              Access exclusive member resources and connect with the community.
            </p>
          </div>
        </section>
        
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-futura font-bold text-fase-navy mb-6">Member Access Required</h2>
            <p className="text-lg text-fase-dark-slate mb-8">
              The member portal will be available to registered members after FASE launches.
            </p>
            <div className="space-x-4">
              <a href="/join" className="bg-fase-orange text-white px-8 py-3 rounded-md font-medium hover:bg-yellow-600 transition duration-200">
                Register Interest
              </a>
              <a href="/" className="bg-white text-fase-navy px-8 py-3 rounded-md font-medium hover:bg-gray-50 transition duration-200 border border-fase-light-gray">
                Back to Home
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}