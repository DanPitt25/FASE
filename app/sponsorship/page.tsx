'use client';

import { useState } from 'react';
import Header from '../../components/Header';

export default function SponsorshipPage() {
  const [headerLoaded, setHeaderLoaded] = useState(false);

  return (
    <div className={`min-h-screen bg-fase-ice-blue font-lato transition-opacity duration-300 ${headerLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Header currentPage="sponsorship" onLoad={() => setHeaderLoaded(true)} />
      
      <main className="flex-1">
        <section className="bg-fase-navy py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-futura font-bold text-white mb-6">Sponsorship</h1>
            <p className="text-xl text-fase-ice-blue max-w-3xl mx-auto">
              Partner with FASE to reach the European MGA community.
            </p>
          </div>
        </section>
        
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-futura font-bold text-fase-navy mb-6">Coming Soon</h2>
            <p className="text-lg text-fase-dark-slate mb-8">
              Sponsorship opportunities will be available when FASE officially launches.
            </p>
            <a href="/" className="bg-fase-orange text-white px-8 py-3 rounded-md font-medium hover:bg-yellow-600 transition duration-200">
              Back to Home
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}