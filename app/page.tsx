'use client';

import { useState, useEffect } from 'react';
import ServiceCard from '../components/ServiceCard';
import FeatureBox from '../components/FeatureBox';
import CTASection from '../components/CTASection';
import ContentHero from '../components/ContentHero';
import Button from '../components/Button';
import Footer from '../components/Footer';

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
    <div className="flex min-h-screen bg-fase-paper font-lato">
      {/* Collapsible Navigation Sidebar */}
      <div className={`fixed top-0 left-0 h-full transition-all duration-300 ${showNavPanel ? 'w-80' : 'w-0'} overflow-hidden bg-white border-r border-fase-silver z-40`}>
        <div className="w-80 h-full">
          <div className="p-6">
            {/* Panel Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-futura font-bold text-fase-navy">Navigation</h2>
              <button
                onClick={() => setShowNavPanel(false)}
                className="p-2 hover:bg-fase-pearl transition-colors"
              >
                <svg className="w-5 h-5 text-fase-steel" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      const element = document.getElementById(section.id);
                      if (element) {
                        const headerHeight = 80; // Approximate header height
                        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                        window.scrollTo({
                          top: elementPosition - headerHeight,
                          behavior: 'smooth'
                        });
                      }
                    }
                  }}
                  className={`w-full flex items-center space-x-3 p-3 transition-all duration-200 group ${
                    currentSection === section.id 
                      ? 'bg-fase-navy text-white' 
                      : 'hover:bg-fase-pearl'
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 text-xs font-bold transition-colors ${
                    currentSection === section.id 
                      ? 'bg-white text-fase-navy' 
                      : 'bg-fase-steel text-white group-hover:bg-fase-navy'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`text-base font-medium transition-colors ${
                    currentSection === section.id 
                      ? 'text-white' 
                      : 'text-fase-steel group-hover:text-fase-navy'
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
          className="hidden md:flex fixed top-1/2 left-0 transform -translate-y-1/2 z-50 bg-white/90 backdrop-blur-sm pl-2 pr-4 py-8  shadow-lg border border-l-0 border-fase-silver hover:bg-white transition-all duration-200 flex-col items-center space-y-2"
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1.5 h-1.5 bg-fase-steel "></div>
            <div className="w-1.5 h-1.5 bg-fase-navy "></div>
            <div className="w-1.5 h-1.5 bg-fase-steel "></div>
          </div>
          <span className="text-xs font-medium text-fase-steel transform rotate-90 whitespace-nowrap">NAV</span>
        </button>

        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white shadow-lg border-b border-fase-silver">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between">
              {/* Left Side - Logo */}
              <div className="flex items-center py-3">
                <div className="flex-shrink-0 flex items-center">
                  <div className="relative">
                    <img 
                      src="/europe.jpg" 
                      alt="Europe Map" 
                      className="h-16 w-auto object-contain "
                      style={{
                        filter: 'brightness(0.8) contrast(1.2) saturate(0.7)',
                        objectPosition: 'center'
                      }}
                    />
                    <div className="absolute inset-0 bg-fase-paper bg-opacity-30 "></div>
                  </div>
                  <div className="border-l border-fase-silver h-14 mx-3"></div>
                  <h1 className="text-4xl font-futura font-bold text-fase-navy mx-3">FASE</h1>
                  <div className="border-l border-fase-silver h-14 mx-3"></div>
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
                    className="bg-fase-paper text-fase-steel px-4 py-1 pr-10  text-sm w-48 focus:outline-none focus:ring-2 focus:ring-fase-navy border border-fase-silver"
                  />
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fase-platinum" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Language Selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-fase-steel">Language:</span>
                  <select className="bg-white text-fase-steel text-sm border border-fase-silver rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-fase-navy">
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
                  className="p-2  text-fase-steel hover:text-fase-steel focus:outline-none focus:ring-2 focus:ring-fase-navy"
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
                  <a href="/about" className="text-fase-steel hover:text-fase-steel px-3 py-2 text-sm font-medium flex items-center">
                    About Us
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </a>
                  <div className="absolute left-0 mt-2 w-64 bg-white shadow-lg border border-fase-silver  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                      <a href="/about/who-we-are" className="block px-4 py-2 text-sm text-fase-steel hover:bg-fase-paper">Who We Are</a>
                      <a href="/about/committees" className="block px-4 py-2 text-sm text-fase-steel hover:bg-fase-paper">Committees</a>
                      <a href="/about/membership-directory" className="block px-4 py-2 text-sm text-fase-steel hover:bg-fase-paper">Membership Directory</a>
                      <a href="/about/affiliates" className="block px-4 py-2 text-sm text-fase-steel hover:bg-fase-paper">Affiliates & Associates</a>
                      <a href="/about/sponsors" className="block px-4 py-2 text-sm text-fase-steel hover:bg-fase-paper">Sponsors</a>
                    </div>
                  </div>
                </div>

                {/* Join Us Link */}
                <a href="/join" className="text-fase-steel hover:text-fase-steel px-3 py-2 text-sm font-medium">Join Us</a>

                {/* Sponsorship Link */}
                <a href="/sponsorship" className="text-fase-steel hover:text-fase-steel px-3 py-2 text-sm font-medium">Sponsorship</a>

                {/* Events Link */}
                <a href="/events" className="text-fase-steel hover:text-fase-steel px-3 py-2 text-sm font-medium">Events</a>

                {/* Knowledge & Education Link */}
                <a href="/knowledge" className="text-fase-steel hover:text-fase-steel px-3 py-2 text-sm font-medium">Knowledge & Education</a>

                {/* News Link */}
                <a href="/news" className="text-fase-steel hover:text-fase-steel px-3 py-2 text-sm font-medium">News</a>

                {/* Member Portal */}
                <a href="/member-portal" className="text-fase-steel hover:text-fase-steel px-3 py-2 text-sm font-medium">Member Portal</a>

                {/* Sign In Button */}
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
            {/* Mobile Search */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-fase-paper text-fase-steel px-4 py-2 pr-10  text-sm focus:outline-none focus:ring-2 focus:ring-fase-navy border border-fase-silver"
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fase-platinum" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Mobile Language Selector */}
            <div className="mb-4">
              <select className="w-full bg-white text-fase-steel text-sm border border-fase-silver rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fase-navy">
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>

            {/* Mobile Navigation Links */}
            <a href="/about" className="block px-3 py-2 text-base font-medium text-fase-steel hover:text-fase-steel hover:bg-fase-paper ">About Us</a>
            <a href="/join" className="block px-3 py-2 text-base font-medium text-fase-steel hover:text-fase-steel hover:bg-fase-paper ">Join Us</a>
            <a href="/sponsorship" className="block px-3 py-2 text-base font-medium text-fase-steel hover:text-fase-steel hover:bg-fase-paper ">Sponsorship</a>
            <a href="/events" className="block px-3 py-2 text-base font-medium text-fase-steel hover:text-fase-steel hover:bg-fase-paper ">Events</a>
            <a href="/knowledge" className="block px-3 py-2 text-base font-medium text-fase-steel hover:text-fase-steel hover:bg-fase-paper ">Knowledge & Education</a>
            <a href="/news" className="block px-3 py-2 text-base font-medium text-fase-steel hover:text-fase-steel hover:bg-fase-paper ">News</a>
            <a href="/member-portal" className="block px-3 py-2 text-base font-medium text-fase-steel hover:text-fase-steel hover:bg-fase-paper ">Member Portal</a>
            <a href="/login" className="block px-3 py-2 mt-2 text-base font-medium text-white bg-fase-navy hover:bg-fase-steel  text-center">Sign In</a>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <ContentHero 
        id="hero"
        backgroundImages={cities}
        currentImageIndex={currentImageIndex}
        fullHeight={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start md:items-center md:min-h-[calc(100vh-5.5rem)] pt-2 md:pt-0">
          {/* Left Content */}
          <div className="text-left md:py-16">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-futura font-bold text-fase-navy mb-4 lg:mb-6 leading-tight">
              The Federation of European <span className="text-fase-navy">Managing General Agents</span>
            </h1>
            <p className="text-lg sm:text-xl text-fase-steel mb-6 font-lato leading-relaxed">
              A clear voice for the most responsive, innovative and customer-friendly businesses in insurance. A unique forum for MGAs, capacity providers and service providers to meet, exchange ideas and insights, and do business together across Europe.
            </p>
            <div className="mb-8">
              <div className="grid grid-cols-2 gap-4 text-sm text-fase-platinum">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-fase-graphite  mr-2"></div>
                  <span>Pan-European Events</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-fase-steel  mr-2"></div>
                  <span>Regulatory Intelligence</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-fase-navy  mr-2"></div>
                  <span>Market Research</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-fase-platinum  mr-2"></div>
                  <span>Industry Advocacy</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button href="#" variant="primary" size="large">
                Join FASE
              </Button>
              <Button href="#" variant="secondary" size="large">
                Spring Rendezvous 2026
              </Button>
            </div>
          </div>

          {/* Right Side - Empty for now */}
          <div className="hidden lg:block">
            {/* Space for right side content if needed */}
          </div>
        </div>
      </ContentHero>

      {/* Core Services Section */}
      <ContentHero 
        id="services" 
        fullHeight={true}
        className="bg-white py-16"
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-futura font-bold text-fase-navy mb-4">What FASE Offers</h2>
            <p className="text-base sm:text-lg md:text-xl text-fase-steel max-w-3xl mx-auto px-4">
              A unified voice and forum for European MGAs, providing advocacy, networking, and market intelligence.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 mb-12 sm:mb-16">
            <ServiceCard
              icon={
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="Pan-European Events"
              description="Biannual conferences bringing together MGAs, capacity providers, and service providers for networking and business development."
              variant="primary"
              size="medium"
            />
            
            <ServiceCard
              icon={
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="Digital Platform"
              description="Multi-lingual digital platform providing technical, regulatory, and risk appetite resources for MGA members."
              variant="primary"
              size="medium"
            />
            
            <ServiceCard
              icon={
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              }
              title="Market Intelligence"
              description="Annual European market reports demonstrating MGA dynamism with accurate statistics and pan-European market insights."
              variant="primary"
              size="medium"
            />
          </div>

          {/* Additional Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <FeatureBox
              icon={
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
              title="Industry Advocacy"
              description="Voice for MGAs in regulatory discussions at national and pan-European levels."
            />
            
            <FeatureBox
              icon={
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
              title="Education & Training"
              description="Online education and training modules for MGA employees across various specialisms."
            />
            
            <FeatureBox
              icon={
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
                </svg>
              }
              title="Market Research"
              description="Research capabilities for MGAs seeking access to new European markets and growth opportunities."
            />
            
            <FeatureBox
              icon={
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Capacity Transparency"
              description="Enhanced transparency on insurer appetite for MGA-sourced business by geography and class."
            />
          </div>
        </div>
      </ContentHero>

      {/* Conference Section */}
      <ContentHero 
        id="conference" 
        fullHeight={true}
        className="bg-fase-paper py-16"
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-futura font-bold text-fase-navy mb-4">FASE European Conference</h2>
            <p className="text-base sm:text-lg md:text-xl text-fase-steel max-w-2xl mx-auto px-4">
              The premier pan-European gathering for MGAs, capacity providers, and service providers. Date and location to be determined.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-2xl sm:text-3xl font-futura font-bold text-fase-navy mb-4 sm:mb-6">Building the European MGA Community</h3>
              <p className="text-fase-steel text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">
                Following the success of national MGA associations like the MGAA, FASE will host annual conferences to unite the European MGA community. Our events focus on meaningful connections, business development, and industry advocacy.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-steel "></div>
                  <p className="text-fase-steel"><strong>Format:</strong> Networking-focused conference</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-graphite "></div>
                  <p className="text-fase-steel"><strong>Focus:</strong> Business connections and market insights</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-navy "></div>
                  <p className="text-fase-steel"><strong>Audience:</strong> European MGAs and market participants</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-platinum "></div>
                  <p className="text-fase-steel"><strong>Goal:</strong> Unite the European MGA community</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 sm:p-8 lg:p-10  shadow-xl border border-fase-silver">
              <h4 className="text-xl sm:text-2xl font-futura font-semibold text-fase-navy mb-4 sm:mb-6">Sponsorship Opportunities</h4>
              <p className="text-fase-steel text-base sm:text-lg mb-4 sm:mb-6 leading-relaxed">
                Partner with FASE to reach the European MGA community. Sponsorship packages available for our inaugural conference.
              </p>
              <div className="bg-fase-paper p-4 sm:p-6  mb-4 sm:mb-6">
                <h5 className="font-semibold text-fase-navy mb-3">Why Sponsor FASE:</h5>
                <ul className="text-fase-steel text-sm space-y-2">
                  <li>• Access to pan-European MGA market</li>
                  <li>• Brand visibility across multiple countries</li>
                  <li>• Direct engagement with decision makers</li>
                  <li>• Support for industry development</li>
                </ul>
              </div>
              <Button 
                href="#" 
                variant="primary" 
                size="large" 
                className="w-full text-center"
              >
                Explore Sponsorship
              </Button>
            </div>
          </div>
        </div>
      </ContentHero>

      <CTASection
        id="cta"
        title="Join FASE"
        description="MGAs, capacity providers, and service providers are invited to register their interest in FASE membership. The federation will be officially launched when a quorum of fifty (50) MGAs have registered their interest. No membership dues will be payable before this point."
        buttons={[
          {
            text: "Register Interest",
            href: "#",
            variant: "primary"
          }
        ]}
        background="navy"
        size="standard"
      />

      <Footer />
      </div>
    </div>
  );
}