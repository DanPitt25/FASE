'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Button from '../components/Button';
import Footer from '../components/Footer';
import Header from '../components/Header';
import RibbonSeparator from '../components/RibbonSeparator';
import QuoteSection from '../components/QuoteSection';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useTranslations } from 'next-intl';

export default function Page() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentSection, setCurrentSection] = useState('hero');
  const [currentStandardIndex, setCurrentStandardIndex] = useState(-1);
  const [currentImpactIndex, setCurrentImpactIndex] = useState(-1);
  
  const tHomepage = useTranslations('homepage');
  
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

  const impacts = [
    {
      title: tHomepage('impact.networking.title'),
      description: tHomepage('impact.networking.description'),
      image: "/earlyMorning.jpg"
    },
    {
      title: tHomepage('impact.professional_development.title'),
      description: tHomepage('impact.professional_development.description'),
      image: "/hivan.jpg"
    },
    {
      title: tHomepage('impact.market_intelligence.title'),
      description: tHomepage('impact.market_intelligence.description'),
      image: "/market.jpg"
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

  const sections = useMemo(() => [
    { name: 'Home', id: 'hero' },
    { name: 'What We Offer', id: 'services' },
    { name: 'Conference', id: 'conference' },
    { name: 'Join FASE', id: 'cta' }
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % cities.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [cities.length]);
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 3;
      
      let foundSection = 'hero';
      
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const offsetTop = window.scrollY + rect.top;
          
          if (scrollPosition >= offsetTop) {
            foundSection = section.id;
          }
        }
      }
      
      setCurrentSection(foundSection);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  return (
    <div className="flex min-h-screen bg-white font-lato overflow-x-hidden">
      <div className="flex-1 relative">
        <Header currentPage="home" />
      <section id="hero" className="relative min-h-[calc(100vh-5.5rem)] flex items-center overflow-hidden">
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
          <div 
            className="absolute inset-0" 
            style={{
              background: `linear-gradient(to left, transparent 0%, transparent 60%, rgba(255,255,255,0.8) 80%, #ffffff 95%)`
            }}
          />
        </div>
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

      <RibbonSeparator direction="right" animated={ribbon1Visible} ref={ribbon1Ref} />

      <section ref={whoWeAreRef} id="services" className="bg-white py-24 lg:py-32 2xl:py-40 relative overflow-hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
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

      <RibbonSeparator direction="right" />

      <QuoteSection 
        quote={tHomepage('quote.text')}
        author={tHomepage('quote.author')}
        title={tHomepage('quote.title')}
      />

      <RibbonSeparator direction="left" animated={ribbon2Visible} ref={ribbon2Ref} />

      <section ref={impactRef} id="conference" className="bg-white py-24 lg:py-32 2xl:py-40 overflow-hidden">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="text-center mb-12">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-8 transition-all duration-700 ${
              impactVisible ? 'scroll-visible' : 'scroll-hidden'
            }`}>{tHomepage('impact.title')}</h2>
          </div>
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
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <h4 className="text-white font-noto-serif font-medium text-lg">{impact.title}</h4>
                  </div>
                </div>
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

      <RibbonSeparator direction="right" animated={ribbon3Visible} ref={ribbon3Ref} />

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

      <section 
        className="relative min-h-[75vh] flex items-center" 
        style={{
          backgroundImage: 'url("/corporate-towers-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
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