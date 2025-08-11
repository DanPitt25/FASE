'use client';

import { useState, useEffect } from 'react';

export default function Page() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showNavPanel, setShowNavPanel] = useState(false);
  const [currentSection, setCurrentSection] = useState('hero');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const cities = [
    { name: 'Amsterdam', image: '/amsterdam.jpg' },
    { name: 'Hamburg', image: '/hamburg.jpg' },
    { name: 'London', image: '/london.jpg' },
    { name: 'Madrid', image: '/madrid.jpg' },
    { name: 'Paris', image: '/paris.jpg' },
    { name: 'Rome', image: '/rome.jpg' },
    { name: 'Vienna', image: '/vienna.jpg' }
  ];

  const sections = [
    { name: 'Home', id: 'hero' },
    { name: 'What We Offer', id: 'services' },
    { name: 'Conference', id: 'conference' },
    { name: 'Join FASE', id: 'cta' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % cities.length);
    }, 7000); // Change image every 7 seconds

    return () => clearInterval(interval);
  }, [cities.length]);

  // Track current section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 3;
      
      // Find which section is currently in view
      let foundSection = 'hero'; // default
      
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const offsetTop = window.scrollY + rect.top;
          
          // If we've scrolled past the start of this section
          if (scrollPosition >= offsetTop) {
            foundSection = section.id;
          }
        }
      }
      
      setCurrentSection(foundSection);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  return (
    <div className="flex min-h-screen bg-fase-ice-blue font-lato">
      {/* Collapsible Navigation Sidebar */}
      <div className={`fixed top-0 left-0 h-full transition-all duration-300 ${showNavPanel ? 'w-80' : 'w-0'} overflow-hidden bg-white border-r border-fase-light-gray z-40`}>
        <div className="w-80 h-full">
          <div className="p-6">
            {/* Panel Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-futura font-bold text-fase-navy">Navigation</h2>
              <button
                onClick={() => setShowNavPanel(false)}
                className="p-2 hover:bg-fase-ice-blue rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-fase-dark-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="space-y-3">
              {sections.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => {
                    if (section.id === 'hero') {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      document.getElementById(section.id)?.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group ${
                    currentSection === section.id 
                      ? 'bg-fase-orange text-white' 
                      : 'hover:bg-fase-ice-blue'
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${
                    currentSection === section.id 
                      ? 'bg-white text-fase-orange' 
                      : 'bg-fase-navy text-white group-hover:bg-fase-orange'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`text-base font-medium transition-colors ${
                    currentSection === section.id 
                      ? 'text-white' 
                      : 'text-fase-navy group-hover:text-fase-orange'
                  }`}>
                    {section.name}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className={`flex-1 relative transition-all duration-300 ${showNavPanel ? 'md:ml-80' : 'ml-0'}`}>
        {/* Menu Toggle Tab - Hidden on mobile, shown on desktop */}
        <button
          onClick={() => setShowNavPanel(!showNavPanel)}
          className="hidden md:flex fixed top-1/2 left-0 transform -translate-y-1/2 z-50 bg-white/90 backdrop-blur-sm pl-2 pr-4 py-8 rounded-r-xl shadow-lg border border-l-0 border-fase-light-gray hover:bg-white transition-all duration-200 flex-col items-center space-y-2"
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1.5 h-1.5 bg-fase-navy rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-fase-orange rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-fase-navy rounded-full"></div>
          </div>
          <span className="text-xs font-medium text-fase-navy transform rotate-90 whitespace-nowrap">NAV</span>
        </button>

        {/* Navigation */}
        <nav className="bg-white shadow-lg border-b border-fase-light-gray">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between">
              {/* Left Side - Logo */}
              <div className="flex items-center py-3">
                <div className="flex-shrink-0 flex items-center">
                  <div className="relative">
                    <img 
                      src="/europe.jpg" 
                      alt="Europe Map" 
                      className="h-16 w-auto object-contain rounded-sm"
                      style={{
                        filter: 'brightness(0.8) contrast(1.2) saturate(0.7)',
                        objectPosition: 'center'
                      }}
                    />
                    <div className="absolute inset-0 bg-fase-ice-blue bg-opacity-30 rounded-sm"></div>
                  </div>
                  <div className="border-l border-fase-light-gray h-14 mx-3"></div>
                  <h1 className="text-4xl font-futura font-bold text-fase-navy mx-3">FASE</h1>
                  <div className="border-l border-fase-light-gray h-14 mx-3"></div>
                </div>
              </div>

            {/* Right Side - Two row layout */}
            <div className="flex flex-col justify-center">
              {/* Top Row - Search and Language - Hidden on Mobile */}
              <div className="hidden md:flex items-center justify-end space-x-6 py-1">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="bg-fase-ice-blue text-fase-dark-slate px-4 py-1 pr-10 rounded-md text-sm w-48 focus:outline-none focus:ring-2 focus:ring-fase-orange border border-fase-light-gray"
                  />
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fase-blue-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Language Selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-fase-dark-slate">Language:</span>
                  <select className="bg-white text-fase-dark-slate text-sm border border-fase-light-gray rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-fase-orange">
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center justify-end lg:hidden">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 rounded-md text-fase-dark-slate hover:text-fase-navy focus:outline-none focus:ring-2 focus:ring-fase-orange"
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
                {/* About Us Dropdown */}
                <div className="relative group">
                  <button className="text-fase-dark-slate hover:text-fase-navy px-3 py-2 text-sm font-medium flex items-center">
                    About Us
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-64 bg-white shadow-lg border border-fase-light-gray rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Who We Are</a>
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Committees</a>
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Membership Directory</a>
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Affiliates & Associates</a>
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Sponsors</a>
                    </div>
                  </div>
                </div>

                {/* Join Us Dropdown */}
                <div className="relative group">
                  <button className="text-fase-dark-slate hover:text-fase-navy px-3 py-2 text-sm font-medium flex items-center">
                    Join Us
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg border border-fase-light-gray rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">MGA</a>
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Market Practitioner</a>
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Supplier</a>
                    </div>
                  </div>
                </div>

                {/* Sponsorship Link */}
                <a href="#" className="text-fase-dark-slate hover:text-fase-navy px-3 py-2 text-sm font-medium">Sponsorship</a>

                {/* Events Dropdown */}
                <div className="relative group">
                  <button className="text-fase-dark-slate hover:text-fase-navy px-3 py-2 text-sm font-medium flex items-center">
                    Events
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg border border-fase-light-gray rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Sample Event 1</a>
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Sample Event 2</a>
                    </div>
                  </div>
                </div>

                {/* Knowledge & Education Dropdown */}
                <div className="relative group">
                  <button className="text-fase-dark-slate hover:text-fase-navy px-3 py-2 text-sm font-medium flex items-center">
                    Knowledge & Education
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg border border-fase-light-gray rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Example 1</a>
                      <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Example 2</a>
                    </div>
                  </div>
                </div>

                {/* News Link */}
                <a href="#" className="text-fase-dark-slate hover:text-fase-navy px-3 py-2 text-sm font-medium">News</a>

                {/* Member Portal */}
                <a href="#" className="text-fase-dark-slate hover:text-fase-navy px-3 py-2 text-sm font-medium">Member Portal</a>

                {/* Sign In Button */}
                <a href="/login" className="bg-fase-navy text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-fase-dark-slate transition duration-200">Sign In</a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="lg:hidden bg-white border-b border-fase-light-gray shadow-lg">
          <div className="px-4 py-2 space-y-1">
            {/* Mobile Search */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-fase-ice-blue text-fase-dark-slate px-4 py-2 pr-10 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-fase-orange border border-fase-light-gray"
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fase-blue-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Mobile Language Selector */}
            <div className="mb-4">
              <select className="w-full bg-white text-fase-dark-slate text-sm border border-fase-light-gray rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fase-orange">
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>

            {/* Mobile Navigation Links */}
            <a href="#" className="block px-3 py-2 text-base font-medium text-fase-dark-slate hover:text-fase-navy hover:bg-fase-ice-blue rounded-md">About Us</a>
            <a href="#" className="block px-3 py-2 text-base font-medium text-fase-dark-slate hover:text-fase-navy hover:bg-fase-ice-blue rounded-md">Join Us</a>
            <a href="#" className="block px-3 py-2 text-base font-medium text-fase-dark-slate hover:text-fase-navy hover:bg-fase-ice-blue rounded-md">Sponsorship</a>
            <a href="#" className="block px-3 py-2 text-base font-medium text-fase-dark-slate hover:text-fase-navy hover:bg-fase-ice-blue rounded-md">Events</a>
            <a href="#" className="block px-3 py-2 text-base font-medium text-fase-dark-slate hover:text-fase-navy hover:bg-fase-ice-blue rounded-md">Knowledge & Education</a>
            <a href="#" className="block px-3 py-2 text-base font-medium text-fase-dark-slate hover:text-fase-navy hover:bg-fase-ice-blue rounded-md">News</a>
            <a href="#" className="block px-3 py-2 text-base font-medium text-fase-dark-slate hover:text-fase-navy hover:bg-fase-ice-blue rounded-md">Member Portal</a>
            <a href="/login" className="block px-3 py-2 mt-2 text-base font-medium text-white bg-fase-navy hover:bg-fase-dark-slate rounded-md text-center">Sign In</a>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="relative min-h-[calc(100vh-80px)] flex items-center overflow-hidden">
        {/* Background Images - Right Side Only */}
        <div className="absolute right-0 top-0 w-3/5 h-full">
          {cities.map((city, index) => (
            <div
              key={city.name}
              className={`absolute inset-0 transition-opacity duration-[8000ms] ease-in-out ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={city.image}
                alt={city.name}
                className="w-full h-full object-cover"
                style={{
                  filter: 'brightness(0.8) contrast(1.1) saturate(1.1)'
                }}
              />
            </div>
          ))}
        </div>

        {/* Smooth Gradient Overlay */}
        <div 
          className="absolute inset-0" 
          style={{
            background: `linear-gradient(to right, 
              #ebf7ff 0%, 
              #ebf7ff 40%, 
              rgba(235, 247, 255, 0.8) 50%, 
              rgba(235, 247, 255, 0.4) 60%, 
              rgba(235, 247, 255, 0.1) 70%, 
              transparent 80%)`
          }}
        ></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-200px)]">
            {/* Left Content */}
            <div className="text-left mt-8 md:mt-0 md:py-16">
              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-futura font-bold text-fase-navy mb-4 lg:mb-6 leading-tight">
                Federation of European <span className="text-fase-orange">MGAs</span>
              </h1>
              <p className="text-lg sm:text-xl text-fase-dark-slate mb-6 font-lato leading-relaxed">
                A voice to improve awareness of the critical role that MGAs play in the insurance value chain. A forum for MGAs, capacity providers and service providers to meet, exchange ideas and insights, and do business together across Europe.
              </p>
              <div className="mb-8">
                <div className="grid grid-cols-2 gap-4 text-sm text-fase-blue-gray">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-fase-sage rounded-full mr-2"></div>
                    <span>Pan-European Events</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-fase-navy rounded-full mr-2"></div>
                    <span>Regulatory Intelligence</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-fase-orange rounded-full mr-2"></div>
                    <span>Market Research</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-fase-blue-gray rounded-full mr-2"></div>
                    <span>Industry Advocacy</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <a href="#" className="bg-fase-navy text-white px-6 sm:px-8 py-3 rounded-md text-base sm:text-lg font-medium hover:bg-fase-dark-slate transition duration-200 text-center">
                  Join FASE
                </a>
                <a href="#" className="bg-fase-orange text-white px-6 sm:px-8 py-3 rounded-md text-base sm:text-lg font-medium hover:bg-yellow-600 transition duration-200 text-center">
                  Spring Rendezvous 2026
                </a>
              </div>
            </div>

            {/* Right Side - Empty for now */}
            <div className="hidden lg:block">
              {/* Space for right side content if needed */}
            </div>
          </div>
        </div>

      </section>

      {/* Core Services Section */}
      <section id="services" className="min-h-screen flex items-center bg-white py-16">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-futura font-bold text-fase-navy mb-4">What FASE Offers</h2>
            <p className="text-base sm:text-lg md:text-xl text-fase-dark-slate max-w-3xl mx-auto px-4">
              A unified voice and forum for European MGAs, providing advocacy, networking, and market intelligence.
            </p>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 mb-12 sm:mb-16 transition-all duration-300`}>
            <div className="text-center rounded-xl border border-fase-light-gray hover:shadow-xl hover:border-fase-sage transition-all duration-300 bg-fase-ice-blue transform hover:-translate-y-1 p-6 sm:p-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-fase-sage rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-futura font-semibold text-fase-navy mb-3 sm:mb-4">Pan-European Events</h3>
              <p className="text-base sm:text-lg text-fase-dark-slate leading-relaxed">Biannual conferences bringing together MGAs, capacity providers, and service providers for networking and business development.</p>
            </div>
            
            <div className="text-center rounded-xl border border-fase-light-gray hover:shadow-xl hover:border-fase-sage transition-all duration-300 bg-fase-ice-blue transform hover:-translate-y-1 p-6 sm:p-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-futura font-semibold text-fase-navy mb-3 sm:mb-4">Digital Platform</h3>
              <p className="text-base sm:text-lg text-fase-dark-slate leading-relaxed">Multi-lingual digital platform providing technical, regulatory, and risk appetite resources for MGA members.</p>
            </div>
            
            <div className="text-center rounded-xl border border-fase-light-gray hover:shadow-xl hover:border-fase-sage transition-all duration-300 bg-fase-ice-blue transform hover:-translate-y-1 p-6 sm:p-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-fase-orange rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-futura font-semibold text-fase-navy mb-3 sm:mb-4">Market Intelligence</h3>
              <p className="text-base sm:text-lg text-fase-dark-slate leading-relaxed">Annual European market reports demonstrating MGA dynamism with accurate statistics and pan-European market insights.</p>
            </div>
          </div>

          {/* Additional Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <div className="text-center p-6 rounded-lg border border-fase-light-gray hover:shadow-lg hover:border-fase-blue-gray transition-all duration-300">
              <div className="w-16 h-16 bg-fase-blue-gray rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h4 className="text-lg font-futura font-semibold text-fase-navy mb-2">Industry Advocacy</h4>
              <p className="text-fase-dark-slate text-sm">Voice for MGAs in regulatory discussions at national and pan-European levels.</p>
            </div>
            
            <div className="text-center p-6 rounded-lg border border-fase-light-gray hover:shadow-lg hover:border-fase-blue-gray transition-all duration-300">
              <div className="w-16 h-16 bg-fase-blue-gray rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h4 className="text-lg font-futura font-semibold text-fase-navy mb-2">Education & Training</h4>
              <p className="text-fase-dark-slate text-sm">Online education and training modules for MGA employees across various specialisms.</p>
            </div>
            
            <div className="text-center p-6 rounded-lg border border-fase-light-gray hover:shadow-lg hover:border-fase-blue-gray transition-all duration-300">
              <div className="w-16 h-16 bg-fase-blue-gray rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
                </svg>
              </div>
              <h4 className="text-lg font-futura font-semibold text-fase-navy mb-2">Market Research</h4>
              <p className="text-fase-dark-slate text-sm">Research capabilities for MGAs seeking access to new European markets and growth opportunities.</p>
            </div>
            
            <div className="text-center p-6 rounded-lg border border-fase-light-gray hover:shadow-lg hover:border-fase-blue-gray transition-all duration-300">
              <div className="w-16 h-16 bg-fase-blue-gray rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-futura font-semibold text-fase-navy mb-2">Capacity Transparency</h4>
              <p className="text-fase-dark-slate text-sm">Enhanced transparency on insurer appetite for MGA-sourced business by geography and class.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Conference Section */}
      <section id="conference" className="min-h-screen flex items-center bg-fase-ice-blue py-16">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-futura font-bold text-fase-navy mb-4">FASE European Conference</h2>
            <p className="text-base sm:text-lg md:text-xl text-fase-dark-slate max-w-2xl mx-auto px-4">
              The premier pan-European gathering for MGAs, capacity providers, and service providers. Date and location to be determined.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-2xl sm:text-3xl font-futura font-bold text-fase-navy mb-4 sm:mb-6">Building the European MGA Community</h3>
              <p className="text-fase-dark-slate text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">
                Following the success of national MGA associations like the MGAA, FASE will host annual conferences to unite the European MGA community. Our events focus on meaningful connections, business development, and industry advocacy.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-navy rounded-full"></div>
                  <p className="text-fase-dark-slate"><strong>Format:</strong> Networking-focused conference</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-sage rounded-full"></div>
                  <p className="text-fase-dark-slate"><strong>Focus:</strong> Business connections and market insights</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-orange rounded-full"></div>
                  <p className="text-fase-dark-slate"><strong>Audience:</strong> European MGAs and market participants</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-blue-gray rounded-full"></div>
                  <p className="text-fase-dark-slate"><strong>Goal:</strong> Unite the European MGA community</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-2xl shadow-xl border border-fase-light-gray">
              <h4 className="text-xl sm:text-2xl font-futura font-semibold text-fase-navy mb-4 sm:mb-6">Sponsorship Opportunities</h4>
              <p className="text-fase-dark-slate text-base sm:text-lg mb-4 sm:mb-6 leading-relaxed">
                Partner with FASE to reach the European MGA community. Sponsorship packages available for our inaugural conference.
              </p>
              <div className="bg-fase-ice-blue p-4 sm:p-6 rounded-lg mb-4 sm:mb-6">
                <h5 className="font-semibold text-fase-navy mb-3">Why Sponsor FASE:</h5>
                <ul className="text-fase-dark-slate text-sm space-y-2">
                  <li>• Access to pan-European MGA market</li>
                  <li>• Brand visibility across multiple countries</li>
                  <li>• Direct engagement with decision makers</li>
                  <li>• Support for industry development</li>
                </ul>
              </div>
              <a href="#" className="bg-fase-orange text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-medium hover:bg-yellow-600 transition duration-300 inline-block w-full text-center shadow-lg transform hover:scale-105">
                Explore Sponsorship
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="min-h-screen flex items-center bg-fase-navy py-16">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-futura font-bold text-white mb-6 sm:mb-8">
            Join FASE
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-fase-ice-blue mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed px-4">
            MGAs, capacity providers, and service providers are invited to register their interest in FASE membership. The federation will be officially launched when a quorum of fifty (50) MGAs have registered their interest. No membership dues will be payable before this point.
          </p>
          <a href="#" className="bg-fase-orange text-white px-8 sm:px-12 py-4 sm:py-5 rounded-xl text-lg sm:text-xl font-medium hover:bg-yellow-600 transition duration-300 shadow-xl transform hover:scale-105 inline-block">
            Register Interest
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-fase-dark-slate text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-futura font-bold mb-4 text-fase-orange">FASE</h3>
              <p className="text-fase-light-gray">
                The Federation of European MGAs - representing the MGA community across Europe.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-futura font-semibold mb-4 text-white">Membership</h4>
              <ul className="space-y-2 text-fase-light-gray">
                <li><a href="#" className="hover:text-fase-orange transition duration-200">MGA Members</a></li>
                <li><a href="#" className="hover:text-fase-orange transition duration-200">Capacity Providers</a></li>
                <li><a href="#" className="hover:text-fase-orange transition duration-200">Service Providers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-futura font-semibold mb-4 text-white">Resources</h4>
              <ul className="space-y-2 text-fase-light-gray">
                <li><a href="#" className="hover:text-fase-orange transition duration-200">Knowledge Base</a></li>
                <li><a href="#" className="hover:text-fase-orange transition duration-200">Events</a></li>
                <li><a href="#" className="hover:text-fase-orange transition duration-200">News</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-futura font-semibold mb-4 text-white">Connect</h4>
              <ul className="space-y-2 text-fase-light-gray">
                <li><a href="#" className="hover:text-fase-orange transition duration-200">Contact Us</a></li>
                <li><a href="#" className="hover:text-fase-orange transition duration-200">Member Portal</a></li>
                <li><a href="#" className="hover:text-fase-orange transition duration-200">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-fase-blue-gray mt-8 pt-8 text-center text-fase-light-gray">
            <p>&copy; 2024 FASE - Federation of European MGAs. All rights reserved.</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}