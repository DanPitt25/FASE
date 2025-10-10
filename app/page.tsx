'use client';

import { useState, useEffect } from 'react';
import CTASection from '../components/CTASection';
import ContentHero from '../components/ContentHero';
import Button from '../components/Button';
import Footer from '../components/Footer';
import Header from '../components/Header';

export default function Page() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showNavPanel, setShowNavPanel] = useState(false);
  const [currentSection, setCurrentSection] = useState('hero');
  const [currentServiceIndex, setCurrentServiceIndex] = useState(-1);
  
  const cities = [
    { name: 'Amsterdam', image: '/amsterdam.jpg' },
    { name: 'Hamburg', image: '/hamburg.jpg' },
    { name: 'London', image: '/london.jpg' },
    { name: 'Madrid', image: '/madrid.jpg' },
    { name: 'Paris', image: '/paris.jpg' },
    { name: 'Rome', image: '/rome.jpg' },
    { name: 'Vienna', image: '/vienna.jpg' }
  ];

  const services = [
    {
      title: "Pan-European Events",
      description: "Biannual conferences bringing together MGAs, capacity providers, and service providers for networking and business development.",
      image: "/conference.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Digital Platform",
      description: "Multi-lingual digital platform providing technical, regulatory, and risk appetite resources for MGA members.",
      image: "/data.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Market Intelligence",
      description: "Annual European market reports demonstrating MGA dynamism with accurate statistics and pan-European market insights.",
      image: "/market.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      )
    },
    {
      title: "Industry Advocacy",
      description: "Voice for MGAs in regulatory discussions at national and pan-European levels.",
      image: "/regulatory.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      title: "Education & Training",
      description: "Online education and training modules for MGA employees across various specialisms.",
      image: "/training.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      title: "Market Research",
      description: "Research capabilities for MGAs seeking access to new European markets and growth opportunities.",
      image: "/market.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
        </svg>
      )
    },
    {
      title: "Capacity Transparency",
      description: "Enhanced transparency on insurer appetite for MGA-sourced business by geography and class.",
      image: "/capacity.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
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
    <div className="flex min-h-screen bg-fase-light-blue font-lato">
      {/* Collapsible Navigation Sidebar */}
      <div className={`fixed top-0 left-0 h-full transition-all duration-300 ${showNavPanel ? 'w-80' : 'w-0'} overflow-hidden bg-white shadow-2xl z-40`}>
        <div className="w-80 h-full">
          <div className="p-6">
            {/* Panel Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-noto-serif font-bold text-fase-navy">Navigation</h2>
              <button
                onClick={() => setShowNavPanel(false)}
                className="p-2 hover:bg-fase-cream transition-colors"
              >
                <svg className="w-5 h-5 text-fase-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className={`w-full flex items-center space-x-3 p-3 transition-all duration-200 group rounded-lg mx-2 ${
                    currentSection === section.id 
                      ? 'bg-fase-navy text-white shadow-lg' 
                      : 'hover:bg-fase-cream hover:shadow-md'
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 text-xs font-bold transition-colors rounded-full ${
                    currentSection === section.id 
                      ? 'bg-white text-fase-navy' 
                      : 'bg-fase-black text-white group-hover:bg-fase-navy'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`text-base font-medium transition-colors ${
                    currentSection === section.id 
                      ? 'text-white' 
                      : 'text-fase-black group-hover:text-fase-navy'
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
          className="hidden md:flex fixed top-1/2 left-0 transform -translate-y-1/2 z-50 bg-white/95 backdrop-blur-sm pl-2 pr-4 py-8 shadow-xl rounded-r-lg hover:bg-white hover:shadow-2xl transition-all duration-200 flex-col items-center space-y-2"
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1.5 h-1.5 bg-fase-black "></div>
            <div className="w-1.5 h-1.5 bg-fase-navy "></div>
            <div className="w-1.5 h-1.5 bg-fase-black "></div>
          </div>
          <span className="text-xs font-medium text-fase-black transform rotate-90 whitespace-nowrap">NAV</span>
        </button>

        <Header currentPage="home" />

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
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-noto-serif font-bold text-fase-navy mb-4 lg:mb-6 leading-tight">
              The Federation of European <span className="text-fase-navy">Managing General Agents</span>
            </h1>
            <p className="text-lg sm:text-xl text-fase-black mb-6 font-lato leading-relaxed">
              A clear voice for the most responsive, innovative and customer-friendly businesses in insurance. A unique forum for MGAs, capacity providers and service providers to meet, exchange ideas and insights, and do business together across Europe.
            </p>
            <div className="mb-8">
              <div className="grid grid-cols-2 gap-4 text-base text-fase-navy">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-fase-navy mr-2"></div>
                  <span>Pan-European Events</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-fase-navy mr-2"></div>
                  <span>Regulatory Intelligence</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-fase-navy mr-2"></div>
                  <span>Market Research</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-fase-navy mr-2"></div>
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
      <section id="services" className="relative py-8 bg-fase-navy min-h-[calc(100vh-5.5rem)] flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-noto-serif font-bold text-white">What FASE Offers</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 border-2 border-fase-gold rounded-lg shadow-xl overflow-hidden max-w-5xl mx-auto">
            {/* Left Side - Image */}
            <div className="relative order-2 lg:order-1">
              {/* Default image when nothing is selected */}
              <div className={`absolute inset-0 transition-opacity duration-500 ${
                currentServiceIndex === -1 ? 'opacity-100' : 'opacity-0'
              }`}>
                <img 
                  src="/conference.jpg" 
                  alt="Conference" 
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Service-specific images */}
              {services.map((service, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    currentServiceIndex === index ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img 
                    src={service.image} 
                    alt={service.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            
            {/* Right Side - Content */}
            <div className="bg-white order-1 lg:order-2 flex flex-col justify-center">
              <div className="p-8 lg:p-12">
                <div className="space-y-1">
                  {services.map((service, index) => (
                    <div key={index} className="border-b border-fase-cream last:border-b-0">
                      <button
                        onClick={() => {
                          const newIndex = currentServiceIndex === index ? -1 : index;
                          setCurrentServiceIndex(newIndex);
                        }}
                        className={`w-full text-left py-4 transition-all duration-300 font-medium ${
                          currentServiceIndex === index 
                            ? 'text-fase-navy text-lg font-semibold' 
                            : 'text-fase-black hover:text-fase-navy text-base'
                        }`}
                      >
                        {service.title}
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
                        currentServiceIndex === index 
                          ? 'max-h-48 opacity-100 pb-4' 
                          : 'max-h-0 opacity-0'
                      }`}>
                        <p className="text-fase-black text-base leading-relaxed mb-4">
                          {service.description}
                        </p>
                        <a 
                          href={
                            service.title === "Pan-European Events" ? "/events" :
                            service.title === "Education & Training" ? "/knowledge" :
                            service.title === "Digital Platform" ? "/digital-platform" :
                            service.title === "Market Intelligence" ? "/market-intelligence" :
                            service.title === "Industry Advocacy" ? "/industry-advocacy" :
                            service.title === "Market Research" ? "/market-intelligence" :
                            service.title === "Capacity Transparency" ? "/capacity-transparency" :
                            "#"
                          }
                          className="inline-flex items-center text-fase-navy hover:text-fase-black transition-colors text-base font-medium underline"
                        >
                          Learn More
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Conference Section */}
      <ContentHero 
        id="conference" 
        fullHeight={false}
        className="bg-fase-light-blue py-20"
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-noto-serif font-bold text-fase-navy mb-4">FASE European Conference</h2>
            <p className="text-base sm:text-lg md:text-xl text-fase-black max-w-2xl mx-auto px-4">
              The premier pan-European gathering for MGAs, capacity providers, and service providers. Date and location to be determined.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-2xl sm:text-3xl font-noto-serif font-bold text-fase-navy mb-4 sm:mb-6">Building the European MGA Community</h3>
              <p className="text-fase-black text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">
                Following the success of national MGA associations like the MGAA, FASE will host annual conferences to unite the European MGA community. Our events focus on meaningful connections, business development, and industry advocacy.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-navy"></div>
                  <p className="text-fase-black"><strong>Format:</strong> Networking-focused conference</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-navy"></div>
                  <p className="text-fase-black"><strong>Focus:</strong> Business connections and market insights</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-navy"></div>
                  <p className="text-fase-black"><strong>Audience:</strong> European MGAs and market participants</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-fase-navy"></div>
                  <p className="text-fase-black"><strong>Goal:</strong> Unite the European MGA community</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 sm:p-8 lg:p-10  shadow-xl border border-fase-light-gold">
              <h4 className="text-xl sm:text-2xl font-noto-serif font-semibold text-fase-navy mb-4 sm:mb-6">Sponsorship Opportunities</h4>
              <p className="text-fase-black text-base sm:text-lg mb-4 sm:mb-6 leading-relaxed">
                Partner with FASE to reach the European MGA community. Sponsorship packages available for our inaugural conference.
              </p>
              <div className="bg-fase-light-blue p-4 sm:p-6  mb-4 sm:mb-6">
                <h4 className="font-semibold text-fase-navy mb-3">Why Sponsor FASE:</h4>
                <ul className="text-fase-black text-sm space-y-2">
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