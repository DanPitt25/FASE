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
  const [currentStandardIndex, setCurrentStandardIndex] = useState(-1);
  const [currentImpactIndex, setCurrentImpactIndex] = useState(-1); // No card selected initially
  
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

  const impacts = [
    {
      title: "Networking & Collaboration",
      description: "Engage with peers through forums, events, and working groups that foster practical connections and help members find solutions to common challenges.",
      image: "/conference.jpg",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Professional Development",
      description: "Access targeted learning opportunities and research designed to help MGAs build expertise and leadership capability.",
      image: "/training.jpg",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      title: "Market Intelligence",
      description: "Benefit from curated data and insights that give members a clear understanding of current trends, regulatory shifts, and emerging opportunities across European markets.",
      image: "/market.jpg",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  const standards = [
    {
      title: "Eligibility Review",
      description: "Confirmation of business credentials, regulatory status, and ethical track record."
    },
    {
      title: "Standards Alignment",
      description: "Assessment of each applicant's alignment with recognised delegated underwriting principles."
    },
    {
      title: "Peer Endorsement", 
      description: "Consultation with our Advisory Board and existing members to ensure credibility and fit within the community."
    },
    {
      title: "Ongoing Review",
      description: "Periodic reaffirmation of good standing and continued commitment to shared standards."
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
    <div className="flex min-h-screen bg-white font-lato">
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
                  className={`w-full flex items-center space-x-3 p-3 transition-all duration-200 group  mx-2 ${
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
          className="hidden md:flex fixed top-1/2 left-0 transform -translate-y-1/2 z-50 bg-white/95 backdrop-blur-sm pl-2 pr-4 py-8 shadow-xl  hover:bg-white hover:shadow-2xl transition-all duration-200 flex-col items-center space-y-2"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-5.5rem)]">
          {/* Left Content */}
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-noto-serif font-bold text-fase-navy mb-4 lg:mb-6 leading-tight">
              Connecting Europe&apos;s insurance innovators
            </h1>
            <p className="text-lg sm:text-xl text-fase-black mb-8 font-lato leading-relaxed">
              Linking MGAs, capacity providers, distributors and service partners to share knowledge, build relationships, and improve delegated underwriting across Europe.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button href="/join" variant="primary" size="large">
                Join Now
              </Button>
              <Button href="/about" variant="secondary" size="large">
                Learn More
              </Button>
            </div>
          </div>
          <div></div>
        </div>
      </ContentHero>

      {/* Blue ribbon separator */}
      <div className="relative h-12">
        <div className="absolute right-0 w-3/5 h-12 bg-fase-navy"></div>
      </div>

      {/* Who We Are Section */}
      <section id="services" className="bg-white py-40 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Image */}
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=400&fit=crop" 
                alt="Insurance professionals collaborating"
                className="w-full h-80 object-cover"
              />
              <div className="absolute inset-0 bg-fase-navy/10"></div>
            </div>
            
            {/* Right side - Content */}
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-noto-serif font-bold text-fase-navy mb-6">A Community of Insurance Professionals</h2>
              <p className="text-fase-black text-base sm:text-lg leading-relaxed">
                FASE brings together organizations and individuals who are shaping the future of delegated underwriting. Our members share a focus on collaboration, responsible growth, and consistent professional standards. Through shared insight, practical resources, and an active network, we help the delegated underwriting community work more effectively.
              </p>
            </div>
          </div>
        </div>
        
        {/* Section transition wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg 
            className="w-full h-20 text-fase-cream" 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none"
          >
            <path 
              d="M0,0 C400,80 800,20 1200,60 L1200,120 L0,120 Z" 
              fill="currentColor"
            />
          </svg>
        </div>
      </section>

      {/* Our Impact Section */}
      <section id="conference" className="bg-fase-cream py-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-noto-serif font-bold text-fase-navy mb-8">Our Impact</h2>
          </div>
          
          {/* Impact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {impacts.map((impact, index) => {
              const isExpanded = currentImpactIndex === index;
              return (
              <div
                key={index}
                className="cursor-pointer group transition-all duration-300 overflow-hidden"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentImpactIndex(currentImpactIndex === index ? -1 : index);
                }}
              >
                <div className="relative h-96 overflow-hidden border border-gray-200 shadow-lg">
                  <img 
                    src={impact.image} 
                    alt={impact.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-fase-navy/20"></div>
                  
                  {/* Title overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <h4 className="text-white font-noto-serif font-bold text-lg">{impact.title}</h4>
                  </div>
                </div>
                
                {/* Expandable content */}
                <div 
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                  style={{
                    transitionTimingFunction: isExpanded ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'cubic-bezier(0.4, 0, 1, 1)'
                  }}
                >
                  <div className={`bg-white border-t border-gray-200 transition-transform duration-500 ${
                    isExpanded ? 'translate-y-0' : '-translate-y-2'
                  }`}>
                    <div className="p-4">
                      <p className="text-fase-black leading-relaxed text-sm">
                        {impact.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
        
      </section>

      {/* Blue ribbon separator */}
      <div className="relative h-0 z-10">
        <div className="absolute left-0 w-3/5 h-12 bg-fase-navy -translate-y-12"></div>
      </div>

      {/* Vetting & Standards Section */}
      <section 
        className="relative py-20 pt-26 -mt-6" 
        style={{
          background: `
            linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)),
            url("/regulatory.jpg")
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-noto-serif font-bold text-fase-navy mb-3">Vetting & Standards</h2>
            <p className="text-fase-black text-base sm:text-lg max-w-3xl mx-auto leading-relaxed">
              To uphold the professionalism of the FASE community, we have established a membership protocol:
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/95 backdrop-blur-sm shadow-2xl border border-fase-light-gold overflow-hidden">
              <div className="bg-gradient-to-r from-fase-navy to-fase-navy/90 p-4">
                <h3 className="text-white text-lg font-bold text-center">Our Review Process</h3>
              </div>
              <div className="divide-y divide-fase-cream">
                {standards.map((standard, index) => (
                  <div key={index} className="p-4 hover:bg-fase-cream/30 transition-colors duration-300">
                    <button
                      onClick={() => {
                        const newIndex = currentStandardIndex === index ? -1 : index;
                        setCurrentStandardIndex(newIndex);
                      }}
                      className="w-full flex items-center justify-between text-left transition-all duration-300 group"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 shadow-lg ${
                          currentStandardIndex === index 
                            ? 'bg-fase-gold text-white scale-110 shadow-fase-gold/30' 
                            : 'bg-fase-navy text-white group-hover:bg-fase-gold group-hover:shadow-fase-gold/30'
                        }`}>
                          {index + 1}
                        </div>
                        <h4 className={`font-bold transition-all duration-300 ${
                          currentStandardIndex === index 
                            ? 'text-fase-navy text-lg' 
                            : 'text-fase-black group-hover:text-fase-navy'
                        }`}>
                          {standard.title}
                        </h4>
                      </div>
                      <svg 
                        className={`w-5 h-5 text-fase-navy transition-transform duration-300 ${
                          currentStandardIndex === index ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      currentStandardIndex === index 
                        ? 'max-h-48 opacity-100' 
                        : 'max-h-0 opacity-0'
                    }`}>
                      <p className="text-fase-black text-sm leading-relaxed mt-3 ml-14 pr-4">
                        {standard.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <p className="text-fase-black text-base sm:text-lg mt-8 text-center leading-relaxed font-medium">
              This process ensures FASE remains a trusted network of professionals working to raise consistency, transparency, and performance in delegated underwriting.
            </p>
          </div>
        </div>
      </section>

      {/* Why Join FASE Section */}
      <section 
        className="relative min-h-[75vh] flex items-center" 
        style={{
          backgroundImage: 'url("/corporate-towers-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-fase-navy/75"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-noto-serif font-bold text-white mb-4">Why Join FASE</h2>
          <h3 className="text-lg sm:text-xl font-noto-serif font-bold text-fase-light-blue mb-6">A Practical Network for a Complex Market</h3>
          <p className="text-fase-light-blue text-sm sm:text-base mb-6 leading-relaxed max-w-3xl mx-auto">
            Whether you&apos;re an MGA, insurer, broker, or service partner, FASE helps you stay connected to the people, information, and perspectives shaping delegated underwriting in Europe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/join" className="inline-flex items-center px-8 py-4 bg-white text-fase-navy font-semibold  hover:bg-fase-light-blue transition-colors">
              Become a Member
            </a>
            <a href="/events" className="inline-flex items-center px-8 py-4 border-2 border-white text-white font-semibold  hover:bg-white hover:text-fase-navy transition-colors">
              View Upcoming Events
            </a>
          </div>
          
          <div className="mt-16 pt-8 border-t border-fase-light-blue/30">
            <p className="text-fase-light-blue text-lg leading-relaxed italic">
              FASE — Building a Connected, Informed, and Responsible Delegated Underwriting Community
            </p>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  );
}