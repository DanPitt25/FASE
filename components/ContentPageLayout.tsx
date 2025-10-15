'use client';

import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface SplitSection {
  type: 'split';
  title: string;
  content: string | string[];
  image: string;
  imageAlt: string;
  imagePosition: 'left' | 'right';
}

interface CardsSection {
  type: 'cards';
  title: string;
  subtitle?: string;
  cards: Array<{
    title: string;
    description: string;
    icon: ReactNode;
  }>;
}

interface CTASection {
  type: 'cta';
  title: string;
  subtitle: string;
  description: string;
  backgroundImage: string;
  buttons: Array<{
    text: string;
    href: string;
    variant: 'primary' | 'secondary';
  }>;
}

type ContentSection = SplitSection | CardsSection | CTASection;

interface ContentPageLayoutProps {
  title: string;
  bannerImage: string;
  bannerImageAlt?: string;
  sections: ContentSection[];
  currentPage: string;
}

export default function ContentPageLayout({
  title,
  bannerImage,
  bannerImageAlt = '',
  sections,
  currentPage
}: ContentPageLayoutProps) {
  // Create animation hooks for each section
  const bannerAnimation = useScrollAnimation();
  
  // Create multiple animation hooks for sections (up to 10 sections)
  const sectionAnim1 = useScrollAnimation();
  const sectionAnim2 = useScrollAnimation();
  const sectionAnim3 = useScrollAnimation();
  const sectionAnim4 = useScrollAnimation();
  const sectionAnim5 = useScrollAnimation();
  const ribbonAnim1 = useScrollAnimation();
  const ribbonAnim2 = useScrollAnimation();
  const ribbonAnim3 = useScrollAnimation();
  const ribbonAnim4 = useScrollAnimation();
  const ribbonAnim5 = useScrollAnimation();
  
  const sectionAnimations = [sectionAnim1, sectionAnim2, sectionAnim3, sectionAnim4, sectionAnim5];
  const ribbonAnimations = [ribbonAnim1, ribbonAnim2, ribbonAnim3, ribbonAnim4, ribbonAnim5];

  const renderSection = (section: ContentSection, index: number) => {
    const isEven = index % 2 === 0;
    const animation = sectionAnimations[index];

    switch (section.type) {
      case 'split':
        return (
          <div key={index}>
            {/* Blue ribbon separator */}
            <div ref={ribbonAnimations[index].elementRef} className="relative h-12">
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} w-3/5 h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible ? (isEven ? 'scroll-visible-right' : 'scroll-visible-left') : (isEven ? 'scroll-hidden-right' : 'scroll-hidden-left')
              }`}></div>
            </div>

            {/* Content Section */}
            <section ref={animation.elementRef} className="bg-white py-24 lg:py-32 2xl:py-40">
              <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  {section.imagePosition === 'left' ? (
                    <>
                      {/* Left side - Image */}
                      <div className={`relative group transition-all duration-700 ${
                        animation.isVisible ? 'scroll-visible-left' : 'scroll-hidden-left'
                      }`}>
                        <div className="transform transition-all duration-700 hover:scale-105">
                          <img 
                            src={section.image}
                            alt={section.imageAlt}
                            className="w-full h-[400px] lg:h-[500px] 2xl:h-[600px] object-cover rounded-lg shadow-lg transition-shadow duration-500 group-hover:shadow-2xl"
                          />
                          <div className="absolute inset-0 bg-fase-navy/10 rounded-lg transition-opacity duration-300 group-hover:bg-fase-navy/5"></div>
                        </div>
                      </div>
                      
                      {/* Right side - Content */}
                      <div className={`transition-all duration-700 delay-200 ${
                        animation.isVisible ? 'scroll-visible-right' : 'scroll-hidden-right'
                      }`}>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-6">
                          {section.title}
                        </h2>
                        {Array.isArray(section.content) ? (
                          section.content.map((paragraph, i) => (
                            <p key={i} className="text-fase-black text-base sm:text-lg leading-relaxed mb-6 last:mb-0">
                              {paragraph}
                            </p>
                          ))
                        ) : (
                          <p className="text-fase-black text-base sm:text-lg leading-relaxed">
                            {section.content}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Left side - Content */}
                      <div className={`transition-all duration-700 ${
                        animation.isVisible ? 'scroll-visible-left' : 'scroll-hidden-left'
                      }`}>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-6">
                          {section.title}
                        </h2>
                        {Array.isArray(section.content) ? (
                          section.content.map((paragraph, i) => (
                            <p key={i} className="text-fase-black text-base sm:text-lg leading-relaxed mb-6 last:mb-0">
                              {paragraph}
                            </p>
                          ))
                        ) : (
                          <p className="text-fase-black text-base sm:text-lg leading-relaxed">
                            {section.content}
                          </p>
                        )}
                      </div>
                      
                      {/* Right side - Image */}
                      <div className={`relative group transition-all duration-700 delay-200 ${
                        animation.isVisible ? 'scroll-visible-right' : 'scroll-hidden-right'
                      }`}>
                        <div className="transform transition-all duration-700 hover:scale-105">
                          <img 
                            src={section.image}
                            alt={section.imageAlt}
                            className="w-full h-[400px] lg:h-[500px] 2xl:h-[600px] object-cover rounded-lg shadow-lg transition-shadow duration-500 group-hover:shadow-2xl"
                          />
                          <div className="absolute inset-0 bg-fase-navy/10 rounded-lg transition-opacity duration-300 group-hover:bg-fase-navy/5"></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        );

      case 'cards':
        return (
          <div key={index}>
            {/* Blue ribbon separator */}
            <div ref={ribbonAnimations[index].elementRef} className="relative h-12">
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} w-3/5 h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible ? (isEven ? 'scroll-visible-right' : 'scroll-visible-left') : (isEven ? 'scroll-hidden-right' : 'scroll-hidden-left')
              }`}></div>
            </div>

            {/* Cards Section */}
            <section ref={animation.elementRef} className="bg-white py-24 lg:py-32 2xl:py-40">
              <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
                <div className="text-center mb-16">
                  <h2 className={`text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-8 transition-all duration-700 ${
                    animation.isVisible ? 'scroll-visible' : 'scroll-hidden'
                  }`}>{section.title}</h2>
                  {section.subtitle && (
                    <p className={`text-fase-black text-base sm:text-lg max-w-3xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
                      animation.isVisible ? 'scroll-visible' : 'scroll-hidden'
                    }`}>
                      {section.subtitle}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {section.cards.map((card, cardIndex) => (
                    <div
                      key={cardIndex}
                      className={`group transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 ${
                        animation.isVisible ? 'scroll-visible' : 'scroll-hidden'
                      }`}
                      style={{ 
                        transitionDelay: animation.isVisible ? `${cardIndex * 200}ms` : '0ms'
                      }}
                    >
                      <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-8 text-center h-full transition-shadow duration-300 group-hover:shadow-2xl">
                        <div className="w-20 h-20 bg-fase-navy flex items-center justify-center mx-auto mb-6 rounded-lg transition-transform duration-300 group-hover:scale-110">
                          {card.icon}
                        </div>
                        <h3 className="text-xl font-noto-serif font-medium text-fase-navy mb-4">{card.title}</h3>
                        <p className="text-fase-black leading-relaxed text-sm">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        );

      case 'cta':
        return (
          <section key={index} className="relative min-h-[75vh] flex items-center" 
            style={{
              backgroundImage: `url("${section.backgroundImage}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-fase-navy/75"></div>
            <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 text-center py-20 max-w-6xl mx-auto">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-noto-serif font-medium text-white mb-4">{section.title}</h2>
              <h3 className="text-lg sm:text-xl font-noto-serif font-medium text-fase-light-blue mb-6">{section.subtitle}</h3>
              <p className="text-fase-light-blue text-sm sm:text-base mb-6 leading-relaxed max-w-3xl mx-auto">
                {section.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {section.buttons.map((button, buttonIndex) => (
                  <a 
                    key={buttonIndex}
                    href={button.href} 
                    className={`inline-flex items-center px-8 py-4 font-semibold transition-colors ${
                      button.variant === 'primary' 
                        ? 'bg-white text-fase-navy hover:bg-fase-light-blue' 
                        : 'border-2 border-white text-white hover:bg-white hover:text-fase-navy'
                    }`}
                  >
                    {button.text}
                  </a>
                ))}
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-lato">
      {/* Main Content Container */}
      <div className="flex-1 relative">
        <Header currentPage={currentPage} />

        {/* Hero Banner */}
        <section ref={bannerAnimation.elementRef} className="relative h-[33vh] flex items-center overflow-hidden">
          <img
            src={bannerImage}
            alt={bannerImageAlt}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.7) contrast(1.1) saturate(1.1)' }}
          />
          <div className="absolute inset-0 bg-fase-navy/40"></div>
          <div className="relative z-10 w-full h-full flex items-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className={`w-1/4 transition-all duration-700 ${
              bannerAnimation.isVisible ? 'scroll-visible-left' : 'scroll-hidden-left'
            }`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-noto-serif font-medium text-white leading-tight">
                {title}
              </h1>
            </div>
          </div>
        </section>

        {/* Content Sections */}
        {sections.map((section, index) => renderSection(section, index))}

        <Footer />
      </div>
    </div>
  );
}