'use client';

import { Suspense } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SearchContent from './search-content';

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header currentPage="search" />
      <main className="flex-1 bg-gray-50">
        {/* Hero Section */}
        <div className="bg-fase-navy text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Search</h1>
              <p className="text-xl text-blue-100">
                Search the FASE website
              </p>
              <nav className="flex justify-center mt-4" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2 text-blue-200">
                  <li><a href="/" className="hover:text-white">Home</a></li>
                  <li><span className="mx-2">/</span></li>
                  <li className="text-white">Search</li>
                </ol>
              </nav>
            </div>
          </div>
        </div>

        {/* Content wrapped in Suspense */}
        <Suspense fallback={
          <div className="py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
                <p className="text-gray-600">Loading search...</p>
              </div>
            </div>
          </div>
        }>
          <SearchContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}