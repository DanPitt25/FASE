'use client';

import { Suspense } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SearchContent from './search-content';

export default function SearchPage() {
  return (
    <>
      <Header currentPage="search" />
      <section className="relative h-[33vh] flex items-center overflow-hidden">
        <img
          src="/images/building.jpg"
          alt="Search"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.7) contrast(1.1) saturate(1.1)' }}
        />
        <div className="absolute inset-0 bg-fase-navy/40"></div>
        <div className="relative z-10 w-full h-full flex items-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="w-1/4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-noto-serif font-medium text-white leading-tight">
              Search
            </h1>
          </div>
        </div>
      </section>
      <main className="flex-1 bg-white">
        <Suspense fallback={
          <div className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto"></div>
              </div>
            </div>
          </div>
        }>
          <SearchContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}