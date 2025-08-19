'use client';

import { useState } from 'react';
import Header from '../../components/Header';
import Button from '../../components/Button';

export default function SponsorshipPage() {
  const [headerLoaded, setHeaderLoaded] = useState(false);

  return (
    <div className={`min-h-screen bg-fase-paper font-lato transition-opacity duration-300 ${headerLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Header currentPage="sponsorship" onLoad={() => setHeaderLoaded(true)} />
      
      <main className="flex-1">
        <section className="bg-fase-navy py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-futura font-bold text-white mb-6">Sponsorship</h1>
            <p className="text-xl text-fase-paper max-w-3xl mx-auto">
              FASE - The Federation of European MGAs - representing the MGA community across Europe.
            </p>
          </div>
        </section>
        
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-futura font-bold text-fase-navy mb-6">Coming Soon</h2>
            <p className="text-lg text-fase-steel mb-8">
              Sponsorship opportunities will be available when FASE officially launches.
            </p>
            <Button href="/" variant="primary" size="large">
              Back to Home
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}