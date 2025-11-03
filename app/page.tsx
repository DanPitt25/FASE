'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import CTASection from '../components/CTASection';
import ContentHero from '../components/ContentHero';
import Button from '../components/Button';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useTranslations } from 'next-intl';

export default function Page() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentSection, setCurrentSection] = useState('hero');
  const [currentServiceIndex, setCurrentServiceIndex] = useState(-1);
  const [currentStandardIndex, setCurrentStandardIndex] = useState(-1);
  const [currentImpactIndex, setCurrentImpactIndex] = useState(-1); // No card selected initially
  
  // Translation hooks
  const tHomepage = useTranslations('homepage');
  const tNav = useTranslations('navigation');
  
  // Scroll animation hooks
  const { elementRef: whoWeAreRef, isVisible: whoWeAreVisible } = useScrollAnimation();
  const { elementRef: impactRef, isVisible: impactVisible } = useScrollAnimation();
  const { elementRef: standardsRef, isVisible: standardsVisible } = useScrollAnimation();
  const { elementRef: ribbon1Ref, isVisible: ribbon1Visible } = useScrollAnimation();
  const { elementRef: ribbon2Ref, isVisible: ribbon2Visible } = useScrollAnimation();
  const { elementRef: ribbon3Ref, isVisible: ribbon3Visible } = useScrollAnimation();
  
  const cities = [
    { name: 'Motorcycle', image: '/motorcycle.jpeg' },
    { name: 'Seated', image: '/seated.jpg' },
    { name: 'Early Morning', image: '/earlyMorning.jpg' },
    { name: 'Conference Wood', image: '/conferenceWood.jpg' },
    { name: 'Airplane', image: '/airplane.jpeg' }
  ];

  const services = [
    {
      title: tHomepage('services.pan_european_events.title'),
      description: tHomepage('services.pan_european_events.description'),
      image: "/conferenceWood.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: tHomepage('services.digital_platform.title'),
      description: tHomepage('services.digital_platform.description'),
      image: "/data.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: tHomepage('services.market_intelligence.title'),
      description: tHomepage('services.market_intelligence.description'),
      image: "/market.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      )
    },
    {
      title: tHomepage('services.industry_advocacy.title'),
      description: tHomepage('services.industry_advocacy.description'),
      image: "/regulatory.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      title: tHomepage('services.education_training.title'),
      description: tHomepage('services.education_training.description'),
      image: "/training.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      title: tHomepage('services.market_research.title'),
      description: tHomepage('services.market_research.description'),
      image: "/market.jpg",
      icon: (
        <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9V3" />
        </svg>
      )
    },
    {
      title: tHomepage('services.capacity_transparency.title'),
      description: tHomepage('services.capacity_transparency.description'),
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
      title: tHomepage('impact.networking.title'),
      description: tHomepage('impact.networking.description'),
      image: "/earlyMorning.jpg",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: tHomepage('impact.professional_development.title'),
      description: tHomepage('impact.professional_development.description'),
      image: "/hivan.jpg",
      icon: (
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      title: tHomepage('impact.market_intelligence.title'),
      description: tHomepage('impact.market_intelligence.description'),
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
      title: tHomepage('standards.eligibility_review.title'),
      description: tHomepage('standards.eligibility_review.description')
    },
    {
      title: tHomepage('standards.standards_alignment.title'),
      description: tHomepage('standards.standards_alignment.description')
    },
    {
      title: tHomepage('standards.ongoing_review.title'),
      description: tHomepage('standards.ongoing_review.description')
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
    <div className="flex min-h-screen bg-white font-lato overflow-x-hidden">
      {/* Main Content Container */}
      <div className="flex-1 relative">
        <Header currentPage="home" />

      {/* Hero Section */}
      <section id="hero" className="relative min-h-[calc(100vh-5.5rem)] flex items-center overflow-hidden">
        {/* Background Images */}
        <div className="hidden md:block absolute top-0 right-0 w-3/5 xl:w-2/3 2xl:w-3/4 h-full">
          {cities.map((city, index) => (
            <div
              key={city.name}
              className={`absolute inset-0 transition-opacity duration-[6000ms] ease-in-out ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={city.image}
                alt={city.name}
                fill
                className={`object-cover ${
                  city.name === 'Motorcycle' || city.name === 'Early Morning' 
                    ? 'object-[25%_center]' 
                    : ''
                }`}
                style={{ filter: 'brightness(0.8) contrast(1.1) saturate(1.1)' }}
                priority={index === 0}
                sizes="(max-width: 768px) 0vw, (max-width: 1280px) 60vw, 67vw"
              />
            </div>
          ))}
          {/* Simple gradient overlay */}
          <div 
            className="absolute inset-0" 
            style={{
              background: `linear-gradient(to left, transparent 0%, transparent 60%, rgba(255,255,255,0.8) 80%, #ffffff 95%)`
            }}
          />
        </div>
        
        {/* Content */}
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 relative z-10">
          <div className="max-w-lg xl:max-w-xl 2xl:max-w-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-noto-serif font-medium text-fase-gold mb-4 lg:mb-6 leading-relaxed">
              {tHomepage('hero.title')}
            </h1>
            <p className="text-lg sm:text-xl text-fase-black mb-8 font-lato leading-relaxed">
              {tHomepage('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button href="/join" variant="primary" size="large">
                {tHomepage('hero.join_now')}
              </Button>
              <Button href="/about" variant="secondary" size="large">
                {tHomepage('hero.learn_more')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Blue ribbon separator */}
      <div ref={ribbon1Ref} className="relative h-12">
        <div className={`absolute right-0 h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
          ribbon1Visible ? 'scroll-visible-right' : 'scroll-hidden-right'
        }`} style={{ width: '61.8%' }}></div>
      </div>

      {/* Who We Are Section */}
      <section ref={whoWeAreRef} id="services" className="bg-white py-24 lg:py-32 2xl:py-40 relative overflow-hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Image */}
            <div className={`relative group transition-all duration-700 ${
              whoWeAreVisible ? 'scroll-visible-left' : 'scroll-hidden-left'
            }`}>
              <div className="transform transition-all duration-700 hover:scale-105">
                <Image 
                  src="/conferenceWood.jpg" 
                  alt="Insurance professionals collaborating"
                  width={800}
                  height={600}
                  className="w-full h-[400px] lg:h-[500px] 2xl:h-[600px] object-cover rounded-lg shadow-lg transition-shadow duration-500 group-hover:shadow-2xl"
                />
                <div className="absolute inset-0 bg-fase-navy/10 rounded-lg transition-opacity duration-300 group-hover:bg-fase-navy/5"></div>
              </div>
            </div>
            
            {/* Right side - Content */}
            <div className={`transition-all duration-700 delay-200 ${
              whoWeAreVisible ? 'scroll-visible-right' : 'scroll-hidden-right'
            }`}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-6">
                {tHomepage('who_we_are.title')}
              </h2>
              <p className="text-fase-black text-base sm:text-lg leading-relaxed">
                {tHomepage('who_we_are.description')}
              </p>
            </div>
          </div>
        </div>
        
      </section>

      {/* Blue ribbon separator */}
      <div className="relative h-12">
        <div className="absolute right-0 h-12 bg-fase-navy shadow-lg" style={{ width: '61.8%' }}></div>
      </div>

      {/* Quote Section */}
      <section className="bg-white py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="max-w-4xl mx-auto text-center">
            <blockquote className="text-xl sm:text-2xl font-noto-serif text-fase-navy leading-relaxed mb-8">
              &ldquo;{tHomepage('quote.text')}&rdquo;
            </blockquote>
            <div className="flex flex-col items-center">
              <cite className="text-fase-black font-medium text-lg not-italic">{tHomepage('quote.author')}</cite>
              <p className="text-fase-black text-sm mt-1">{tHomepage('quote.title')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Blue ribbon separator */}
      <div ref={ribbon2Ref} className="relative h-12">
        <div className={`absolute left-0 h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
          ribbon2Visible ? 'scroll-visible-left' : 'scroll-hidden-left'
        }`} style={{ width: '61.8%' }}></div>
      </div>

      {/* Our Impact Section */}
      <section ref={impactRef} id="conference" className="bg-white py-24 lg:py-32 2xl:py-40 overflow-hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="text-center mb-12">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-8 transition-all duration-700 ${
              impactVisible ? 'scroll-visible' : 'scroll-hidden'
            }`}>{tHomepage('impact.title')}</h2>
          </div>
          
          {/* Impact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {impacts.map((impact, index) => {
              const isExpanded = currentImpactIndex === index;
              return (
              <div
                key={index}
                className={`cursor-pointer group transition-all duration-500 overflow-hidden transform hover:scale-105 hover:-translate-y-2 ${
                  impactVisible ? 'scroll-visible' : 'scroll-hidden'
                }`}
                style={{ 
                  transitionDelay: impactVisible ? `${index * 200}ms` : '0ms'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentImpactIndex(currentImpactIndex === index ? -1 : index);
                }}
              >
                <div className="relative h-80 lg:h-96 2xl:h-[450px] overflow-hidden border border-gray-200 shadow-lg rounded-lg">
                  <Image 
                    src={impact.image} 
                    alt={impact.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-fase-navy/20 transition-all duration-300 group-hover:bg-fase-navy/10"></div>
                  
                  {/* Title overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <h4 className="text-white font-noto-serif font-medium text-lg">{impact.title}</h4>
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
      <div ref={ribbon3Ref} className="relative h-12">
        <div className={`absolute right-0 h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
          ribbon3Visible ? 'scroll-visible-right' : 'scroll-hidden-right'
        }`} style={{ width: '61.8%' }}></div>
      </div>

      {/* Vetting & Standards Section */}
      <section ref={standardsRef} className="bg-white py-24 lg:py-32 2xl:py-40 relative overflow-hidden">
        <div className="relative z-20 w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="text-center mb-8">
            <h2 className={`text-xl sm:text-2xl md:text-3xl font-noto-serif font-medium text-fase-navy mb-3 transition-all duration-700 ${
              standardsVisible ? 'scroll-visible' : 'scroll-hidden'
            }`}>{tHomepage('standards.title')}</h2>
            <p className={`text-fase-black text-base sm:text-lg max-w-3xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
              standardsVisible ? 'scroll-visible' : 'scroll-hidden'
            }`}>
              {tHomepage('standards.subtitle')}
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className={`bg-white/95 backdrop-blur-sm shadow-2xl border border-fase-light-gold overflow-hidden rounded-lg transform transition-all duration-700 hover:shadow-3xl delay-400 ${
              standardsVisible ? 'scroll-visible' : 'scroll-hidden'
            }`}>
              <div className="bg-gradient-to-r from-fase-navy to-fase-navy/90 p-4">
                <h3 className="text-white text-lg font-medium text-center">{tHomepage('standards.review_process')}</h3>
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
                        <h4 className={`font-medium transition-all duration-300 ${
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
              {tHomepage('standards.conclusion')}
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
        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 text-center py-20 max-w-6xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-noto-serif font-medium text-white mb-4">{tHomepage('why_join.title')}</h2>
          <p className="text-fase-light-blue text-sm sm:text-base mb-6 leading-relaxed max-w-3xl mx-auto">
            {tHomepage('why_join.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/join" className="inline-flex items-center px-8 py-4 bg-white text-fase-navy font-semibold  hover:bg-fase-light-blue transition-colors">
              {tHomepage('why_join.become_member')}
            </a>
          </div>
          
          <div className="mt-16 pt-8 border-t border-fase-light-blue/30">
            <p className="text-fase-light-blue text-lg leading-relaxed italic">
              {tHomepage('why_join.tagline')}
            </p>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </div>
  );
}