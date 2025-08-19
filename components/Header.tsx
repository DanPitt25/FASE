'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from './Button';

interface HeaderProps {
  currentPage?: string;
  onLoad?: () => void;
}

export default function Header({ currentPage = '', onLoad }: HeaderProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  return (
    <>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white shadow-lg border-b border-fase-silver">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between">
            {/* Left Side - Logo */}
            <div className="flex items-center py-3">
              <div className="flex-shrink-0 flex items-center">
                <div className="relative w-16 h-16">
                  <Image 
                    src="/europe.jpg" 
                    alt="Europe Map" 
                    width={64}
                    height={64}
                    className="w-full h-full object-contain "
                    style={{
                      filter: 'brightness(0.8) contrast(1.2) saturate(0.7)',
                      objectPosition: 'center'
                    }}
                    priority
                    onLoad={handleImageLoad}
                  />
                  <div className="absolute inset-0 bg-fase-pearl bg-opacity-30 "></div>
                </div>
                <div className="border-l border-fase-silver h-14 mx-3"></div>
                <a href="/" className="text-4xl font-futura font-bold text-fase-navy mx-3">FASE</a>
                <div className="border-l border-fase-silver h-14 mx-3"></div>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex flex-col justify-center">
              {/* Top Row - Search and Language - Hidden on Mobile */}
              <div className="hidden md:flex items-center justify-end space-x-6 py-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="bg-fase-pearl text-fase-steel px-4 py-1 pr-10  text-sm w-48 focus:outline-none focus:ring-2 focus:ring-fase-navy border border-fase-silver"
                  />
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fase-platinum" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-fase-steel">Language:</span>
                  <select className="bg-white text-fase-steel text-sm border border-fase-silver rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-fase-navy">
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                    <option value="it">Italiano</option>
                  </select>
                </div>
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center justify-end lg:hidden">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2  text-fase-steel hover:text-fase-navy focus:outline-none focus:ring-2 focus:ring-fase-navy"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showMobileMenu ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>

              {/* Desktop Navigation Menu */}
              <div className="hidden lg:flex items-center space-x-6 py-1">
                <div className="relative group">
                  <a href="/about" className={`px-3 py-2 text-sm font-medium flex items-center ${
                    currentPage === 'about' ? 'text-fase-navy' : 'text-fase-steel hover:text-fase-navy'
                  }`}>
                    About Us
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </a>
                  <div className="absolute left-0 mt-2 w-64 bg-white shadow-lg border border-fase-silver  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <a href="/about/who-we-are" className={`block px-4 py-2 text-sm ${
                        currentPage === 'who-we-are' ? 'text-fase-navy bg-fase-pearl font-medium' : 'text-fase-steel hover:bg-fase-pearl'
                      }`}>Who We Are</a>
                      <a href="/about/committees" className="block px-4 py-2 text-sm text-fase-steel hover:bg-fase-pearl">Committees</a>
                      <a href="/about/membership-directory" className="block px-4 py-2 text-sm text-fase-steel hover:bg-fase-pearl">Membership Directory</a>
                      <a href="/about/affiliates" className="block px-4 py-2 text-sm text-fase-steel hover:bg-fase-pearl">Affiliates & Associates</a>
                      <a href="/about/sponsors" className="block px-4 py-2 text-sm text-fase-steel hover:bg-fase-pearl">Sponsors</a>
                    </div>
                  </div>
                </div>

                <a href="/join" className={`px-3 py-2 text-sm font-medium ${
                  currentPage === 'join' ? 'text-fase-navy' : 'text-fase-steel hover:text-fase-navy'
                }`}>Join Us</a>
                <a href="/sponsorship" className={`px-3 py-2 text-sm font-medium ${
                  currentPage === 'sponsorship' ? 'text-fase-navy' : 'text-fase-steel hover:text-fase-navy'
                }`}>Sponsorship</a>
                <a href="/events" className={`px-3 py-2 text-sm font-medium ${
                  currentPage === 'events' ? 'text-fase-navy' : 'text-fase-steel hover:text-fase-navy'
                }`}>Events</a>
                <a href="/knowledge" className={`px-3 py-2 text-sm font-medium ${
                  currentPage === 'knowledge' ? 'text-fase-navy' : 'text-fase-steel hover:text-fase-navy'
                }`}>Knowledge & Education</a>
                <a href="/news" className={`px-3 py-2 text-sm font-medium ${
                  currentPage === 'news' ? 'text-fase-navy' : 'text-fase-steel hover:text-fase-navy'
                }`}>News</a>
                <a href="/member-portal" className={`px-3 py-2 text-sm font-medium ${
                  currentPage === 'member-portal' ? 'text-fase-navy' : 'text-fase-steel hover:text-fase-navy'
                }`}>Member Portal</a>
                <Button href="/login" variant="primary" size="small">Sign In</Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="lg:hidden bg-white border-b border-fase-silver shadow-lg">
          <div className="px-4 py-2 space-y-1">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-fase-pearl text-fase-steel px-4 py-2 pr-10  text-sm focus:outline-none focus:ring-2 focus:ring-fase-navy border border-fase-silver"
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fase-platinum" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="mb-4">
              <select className="w-full bg-white text-fase-steel text-sm border border-fase-silver rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fase-navy">
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>

            <a href="/about" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'about' || currentPage === 'who-we-are' ? 'text-fase-navy bg-fase-pearl' : 'text-fase-steel hover:text-fase-navy hover:bg-fase-pearl'
            }`}>About Us</a>
            <a href="/join" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'join' ? 'text-fase-navy bg-fase-pearl' : 'text-fase-steel hover:text-fase-navy hover:bg-fase-pearl'
            }`}>Join Us</a>
            <a href="/sponsorship" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'sponsorship' ? 'text-fase-navy bg-fase-pearl' : 'text-fase-steel hover:text-fase-navy hover:bg-fase-pearl'
            }`}>Sponsorship</a>
            <a href="/events" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'events' ? 'text-fase-navy bg-fase-pearl' : 'text-fase-steel hover:text-fase-navy hover:bg-fase-pearl'
            }`}>Events</a>
            <a href="/knowledge" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'knowledge' ? 'text-fase-navy bg-fase-pearl' : 'text-fase-steel hover:text-fase-navy hover:bg-fase-pearl'
            }`}>Knowledge & Education</a>
            <a href="/news" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'news' ? 'text-fase-navy bg-fase-pearl' : 'text-fase-steel hover:text-fase-navy hover:bg-fase-pearl'
            }`}>News</a>
            <a href="/member-portal" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'member-portal' ? 'text-fase-navy bg-fase-pearl' : 'text-fase-steel hover:text-fase-navy hover:bg-fase-pearl'
            }`}>Member Portal</a>
            <Button href="/login" variant="primary" size="medium" className="w-full text-center mt-2">Sign In</Button>
          </div>
        </div>
      )}
    </>
  );
}