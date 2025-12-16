'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from './Header';
import Footer from './Footer';
import PricingAccordion from './PricingAccordion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

interface SplitSection {
  type: 'split';
  title: string;
  content: string | string[];
  image: string;
  imageAlt: string;
  imagePosition: 'left' | 'right';
  buttons?: Array<{
    text: string;
    href: string;
    variant: 'primary' | 'secondary';
  }>;
}

interface CardsSection {
  type: 'cards';
  title: string;
  subtitle?: string;
  cards: Array<{
    title: string;
    description: string;
    icon?: ReactNode;
    image?: string;
    imageAlt?: string;
    href?: string;
    actionText?: string;
  }>;
}

interface CTASection {
  type: 'cta';
  title: string;
  subtitle?: string;
  description: string;
  backgroundImage: string;
  buttons: Array<{
    text: string;
    href: string;
    variant: 'primary' | 'secondary';
  }>;
}

interface AccordionSection {
  type: 'accordion';
  title: string;
  subtitle?: string;
  items: Array<{
    title: string;
    content: string;
  }>;
}

interface QuoteSection {
  type: 'quote';
  quote: string;
  author: string;
  title: string;
}

interface ContactSection {
  type: 'contact';
  title: string;
  content: string[];
}

interface PeopleSection {
  type: 'people';
  title: string;
  subtitle?: string;
  people: Array<{
    name: string;
    role: string;
    company?: string;
    bio: string;
    image: string;
  }>;
}

interface ContentOnlySection {
  type: 'content';
  title: string;
  content: string[];
}

interface PricingSection {
  type: 'pricing';
  title: string;
  subtitle: string;
}

interface CustomSection {
  type: 'custom';
  content: ReactNode;
}

type ContentSection = SplitSection | CardsSection | CTASection | AccordionSection | QuoteSection | ContactSection | PeopleSection | ContentOnlySection | PricingSection | CustomSection;

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
  const sectionAnim6 = useScrollAnimation();
  const ribbonAnim1 = useScrollAnimation();
  const ribbonAnim2 = useScrollAnimation();
  const ribbonAnim3 = useScrollAnimation();
  const ribbonAnim4 = useScrollAnimation();
  const ribbonAnim5 = useScrollAnimation();
  const ribbonAnim6 = useScrollAnimation();
  
  const sectionAnimations = [sectionAnim1, sectionAnim2, sectionAnim3, sectionAnim4, sectionAnim5, sectionAnim6];
  const ribbonAnimations = [ribbonAnim1, ribbonAnim2, ribbonAnim3, ribbonAnim4, ribbonAnim5, ribbonAnim6];

  const renderSection = (section: ContentSection, index: number) => {
    const isEven = index % 2 === 0;
    const animation = sectionAnimations[index];

    switch (section.type) {
      case 'split':
        return (
          <div key={index}>
            {/* Blue ribbon separator */}
            <div ref={ribbonAnimations[index].elementRef} className="relative h-12">
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible ? (isEven ? 'scroll-visible-right' : 'scroll-visible-left') : (isEven ? 'scroll-hidden-right' : 'scroll-hidden-left')
              }`} style={{ width: '61.8%' }}></div>
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
                        <div className="transform transition-all duration-700 hover:scale-105 relative h-[400px] lg:h-[500px] 2xl:h-[600px]">
                          <Image 
                            src={section.image}
                            alt={section.imageAlt}
                            fill
                            className="object-cover rounded-lg shadow-lg transition-shadow duration-500 group-hover:shadow-2xl"
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
                          section.content.split('\n\n').map((paragraph, i) => (
                            <p key={i} className="text-fase-black text-base sm:text-lg leading-relaxed mb-6 last:mb-0">
                              {paragraph}
                            </p>
                          ))
                        )}
                        {section.buttons && (
                          <div className="flex flex-col sm:flex-row gap-4 mt-8">
                            {section.buttons.map((button, buttonIndex) => (
                              <a 
                                key={buttonIndex}
                                href={button.href} 
                                className={`inline-flex items-center px-6 py-3 font-semibold transition-colors text-center justify-center ${
                                  button.variant === 'primary' 
                                    ? 'bg-fase-navy text-white hover:bg-fase-blue' 
                                    : 'border-2 border-fase-navy text-fase-navy hover:bg-fase-navy hover:text-white'
                                }`}
                              >
                                {button.text}
                              </a>
                            ))}
                          </div>
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
                          section.content.split('\n\n').map((paragraph, i) => (
                            <p key={i} className="text-fase-black text-base sm:text-lg leading-relaxed mb-6 last:mb-0">
                              {paragraph}
                            </p>
                          ))
                        )}
                        {section.buttons && (
                          <div className="flex flex-col sm:flex-row gap-4 mt-8">
                            {section.buttons.map((button, buttonIndex) => (
                              <a 
                                key={buttonIndex}
                                href={button.href} 
                                className={`inline-flex items-center px-6 py-3 font-semibold transition-colors text-center justify-center ${
                                  button.variant === 'primary' 
                                    ? 'bg-fase-navy text-white hover:bg-fase-blue' 
                                    : 'border-2 border-fase-navy text-fase-navy hover:bg-fase-navy hover:text-white'
                                }`}
                              >
                                {button.text}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Right side - Image */}
                      <div className={`relative group transition-all duration-700 delay-200 ${
                        animation.isVisible ? 'scroll-visible-right' : 'scroll-hidden-right'
                      }`}>
                        <div className="transform transition-all duration-700 hover:scale-105 relative h-[400px] lg:h-[500px] 2xl:h-[600px]">
                          <Image 
                            src={section.image}
                            alt={section.imageAlt}
                            fill
                            className="object-cover rounded-lg shadow-lg transition-shadow duration-500 group-hover:shadow-2xl"
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
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible ? (isEven ? 'scroll-visible-right' : 'scroll-visible-left') : (isEven ? 'scroll-hidden-right' : 'scroll-hidden-left')
              }`} style={{ width: '61.8%' }}></div>
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
                  {section.cards.map((card, cardIndex) => {
                    const CardContent = (
                      <div className="bg-white border border-gray-200 shadow-lg p-8 text-center h-full transition-shadow duration-300 group-hover:shadow-2xl">
                        {card.image ? (
                          <div className="mb-6 relative h-48">
                            <Image 
                              src={card.image} 
                              alt={card.imageAlt || card.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        ) : card.icon ? (
                          <div className="w-20 h-20 bg-fase-navy flex items-center justify-center mx-auto mb-6 transition-transform duration-300 group-hover:scale-110">
                            {card.icon}
                          </div>
                        ) : null}
                        <h3 className="text-xl font-noto-serif font-medium text-fase-navy mb-4">{card.title}</h3>
                        <p className="text-fase-black leading-relaxed text-sm mb-6">
                          {card.description}
                        </p>
                        {card.actionText && (
                          <p className="text-fase-navy font-medium text-sm">
                            {card.actionText}
                          </p>
                        )}
                      </div>
                    );

                    return card.href ? (
                      <Link
                        key={cardIndex}
                        href={card.href}
                        className={`group transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 block ${
                          animation.isVisible ? 'scroll-visible' : 'scroll-hidden'
                        }`}
                        style={{ 
                          transitionDelay: animation.isVisible ? `${cardIndex * 200}ms` : '0ms'
                        }}
                      >
                        {CardContent}
                      </Link>
                    ) : (
                      <div
                        key={cardIndex}
                        className={`group transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 ${
                          animation.isVisible ? 'scroll-visible' : 'scroll-hidden'
                        }`}
                        style={{ 
                          transitionDelay: animation.isVisible ? `${cardIndex * 200}ms` : '0ms'
                        }}
                      >
                        {CardContent}
                      </div>
                    );
                  })}
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
            {/* Dark overlay for depth */}
            <div className="absolute inset-0 bg-fase-navy/50"></div>
            <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 flex justify-center py-20">
              <div className="bg-white px-8 py-12 text-center max-w-4xl shadow-2xl">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-noto-serif font-medium text-fase-navy mb-4">{section.title}</h2>
                {section.subtitle && (
                  <h3 className="text-lg sm:text-xl font-noto-serif font-medium text-fase-black mb-6">{section.subtitle}</h3>
                )}
                <p className="text-fase-black text-sm sm:text-base mb-6 leading-relaxed">
                  {section.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {section.buttons.map((button, buttonIndex) => (
                    <a 
                      key={buttonIndex}
                      href={button.href} 
                      className={`inline-flex items-center px-8 py-4 font-semibold transition-colors ${
                        button.variant === 'primary' 
                          ? 'bg-fase-navy text-white hover:bg-fase-blue' 
                          : 'border-2 border-fase-navy text-fase-navy hover:bg-fase-navy hover:text-white'
                      }`}
                    >
                      {button.text}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );

      case 'accordion':
        return (
          <div key={index}>
            {/* Blue ribbon separator */}
            <div ref={ribbonAnimations[index].elementRef} className="relative h-12">
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible ? (isEven ? 'scroll-visible-right' : 'scroll-visible-left') : (isEven ? 'scroll-hidden-right' : 'scroll-hidden-left')
              }`} style={{ width: '61.8%' }}></div>
            </div>

            <section ref={animation.elementRef} className="bg-white py-24 lg:py-32 2xl:py-40">
              <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-screen-2xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className={`text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-4 transition-all duration-700 ${
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
                
                <div className="max-w-4xl mx-auto">
                  {section.items.map((item, itemIndex) => (
                    <details
                      key={itemIndex}
                      className={`group border-b border-gray-200 transition-all duration-500 ${
                        animation.isVisible ? 'scroll-visible' : 'scroll-hidden'
                      }`}
                      style={{ 
                        transitionDelay: animation.isVisible ? `${itemIndex * 100}ms` : '0ms'
                      }}
                    >
                      <summary className="cursor-pointer py-5 px-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <h3 className="text-lg font-medium text-fase-navy pr-8">{item.title}</h3>
                        <svg className="w-5 h-5 text-fase-navy transform transition-transform group-open:rotate-180" 
                          fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-6 pb-5">
                        <div className="text-fase-black leading-relaxed space-y-4">
                          {item.content.split('\n\n').map((paragraph, pIndex) => {
                            if (paragraph.trim().startsWith('•')) {
                              return (
                                <div key={pIndex} className="ml-4">
                                  <p className="leading-relaxed">{paragraph.trim()}</p>
                                </div>
                              );
                            } else {
                              return (
                                <p key={pIndex} className="leading-relaxed">{paragraph.trim()}</p>
                              );
                            }
                          })}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          </div>
        );

      case 'quote':
        return (
          <div key={index}>
            {/* Blue ribbon separator */}
            <div ref={ribbonAnimations[index].elementRef} className="relative h-12">
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible ? (isEven ? 'scroll-visible-right' : 'scroll-visible-left') : (isEven ? 'scroll-hidden-right' : 'scroll-hidden-left')
              }`} style={{ width: '61.8%' }}></div>
            </div>

            {/* Quote Section */}
            <section ref={animation.elementRef} className="bg-white py-24 lg:py-32 2xl:py-40">
              <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
                <div className="max-w-4xl mx-auto relative">
                  <div className={`transition-all duration-1000 transform ${
                    animation.isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'
                  }`}>
                    {/* Quote text - centered */}
                    <div className="text-center py-12">
                      <blockquote className="text-2xl md:text-3xl font-noto-serif text-fase-navy leading-relaxed mb-8 italic">
                        {section.quote}
                      </blockquote>
                      
                      {/* Attribution */}
                      <div className="text-lg text-fase-black">
                        <span className="font-semibold">{section.author}</span>
                        <span className="text-gray-600"> • {section.title}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      case 'people':
        return (
          <div key={index}>
            {/* Blue ribbon separator */}
            <div ref={ribbonAnimations[index].elementRef} className="relative h-12">
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible ? (isEven ? 'scroll-visible-right' : 'scroll-visible-left') : (isEven ? 'scroll-hidden-right' : 'scroll-hidden-left')
              }`} style={{ width: '61.8%' }}></div>
            </div>

            <section ref={animation.elementRef} className="bg-white py-24 lg:py-32 2xl:py-40">
              <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 max-w-screen-2xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className={`text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-4 transition-all duration-700 ${
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
                
                <div className="max-w-6xl mx-auto space-y-12">
                  {section.people.map((person, personIndex) => (
                    <div
                      key={personIndex}
                      className={`flex flex-col md:flex-row gap-8 p-8 lg:p-12 border-b border-gray-200 last:border-0 transition-all duration-700 ${
                        animation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                      }`}
                      style={{ 
                        transitionDelay: animation.isVisible ? `${personIndex * 200}ms` : '0ms'
                      }}
                    >
                      <div className="w-full md:w-2/5 lg:w-1/3 flex-shrink-0">
                        <div className="w-72 h-80 mx-auto rounded-lg overflow-hidden relative">
                          <Image 
                            src={person.image} 
                            alt={person.name}
                            fill
                            className="object-cover object-top"
                          />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <h3 className="text-2xl font-noto-serif font-medium text-fase-navy mb-2">{person.name}</h3>
                        <p className="text-fase-gold font-semibold text-lg mb-2">{person.role}</p>
                        {person.company && (
                          <p className="text-fase-black mb-4">{person.company}</p>
                        )}
                        <div 
                          className="text-fase-black leading-relaxed text-lg space-y-4"
                          dangerouslySetInnerHTML={{ __html: person.bio.split('\n\n').map(p => `<p>${p}</p>`).join('') }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        );

      case 'contact':
        return (
          <div key={index}>
            {/* Blue ribbon separator */}
            <div ref={ribbonAnimations[index].elementRef} className="relative h-12">
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible ? (isEven ? 'scroll-visible-right' : 'scroll-visible-left') : (isEven ? 'scroll-hidden-right' : 'scroll-hidden-left')
              }`} style={{ width: '61.8%' }}></div>
            </div>

            {/* Contact Section */}
            <section ref={animation.elementRef} className="bg-white py-24 lg:py-32 2xl:py-40">
              <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
                <div className="max-w-2xl mx-auto">
                  <div className={`transition-all duration-700 ${
                    animation.isVisible ? 'scroll-visible' : 'scroll-hidden'
                  }`}>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-12 text-center">
                      {section.title}
                    </h2>
                    
                    <div className="space-y-8">
                      {/* Organization Name */}
                      <div className="text-center">
                        <h3 className="text-xl font-noto-serif font-medium text-fase-navy mb-8">
                          {section.content[0]}
                        </h3>
                      </div>
                      
                      {/* Contact Details */}
                      <div className="space-y-6">
                        {section.content.slice(1).map((item, index) => (
                          <div key={index} className="flex items-center justify-center">
                            {item.includes('@') ? (
                              <>
                                <svg className="w-6 h-6 text-fase-navy mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <a 
                                  href={`mailto:${item}`}
                                  className="text-lg text-fase-navy hover:text-fase-blue transition-colors"
                                >
                                  {item}
                                </a>
                              </>
                            ) : item.startsWith('+') ? (
                              <>
                                <svg className="w-6 h-6 text-fase-navy mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <a 
                                  href={`tel:${item}`}
                                  className="text-lg text-fase-navy hover:text-fase-blue transition-colors"
                                >
                                  {item}
                                </a>
                              </>
                            ) : (
                              <>
                                <svg className="w-6 h-6 text-fase-navy mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-lg text-fase-black">
                                  {item}
                                </span>
                              </>
                            )}
                          </div>
                        ))}
                        
                        {/* Keep the hardcoded email as fallback if not in content */}
                        {!section.content.some(item => item.includes('@')) && (
                          <div className="flex items-center justify-center">
                            <svg className="w-6 h-6 text-fase-navy mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a 
                              href="mailto:info@fasemga.com"
                              className="text-lg text-fase-navy hover:text-fase-blue transition-colors"
                            >
                              info@fasemga.com
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      case 'content':
        return (
          <div key={index}>
            {/* Blue ribbon separator */}
            <div ref={ribbonAnimations[index].elementRef} className="relative h-12">
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible ? (isEven ? 'scroll-visible-right' : 'scroll-visible-left') : (isEven ? 'scroll-hidden-right' : 'scroll-hidden-left')
              }`} style={{ width: '61.8%' }}></div>
            </div>
            {/* Content Section */}
            <section ref={animation.elementRef} className="bg-white py-24 lg:py-32 2xl:py-40">
              <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
                <div className="max-w-4xl mx-auto">
                  <div className={`transition-all duration-700 ${
                    animation.isVisible ? 'scroll-visible' : 'scroll-hidden'
                  }`}>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-noto-serif font-medium text-fase-navy mb-12 text-center">
                      {section.title}
                    </h2>
                    
                    <div className="prose prose-lg max-w-none text-fase-black">
                      {section.content.map((paragraph, idx) => {
                        // Check if paragraph contains an email address
                        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
                        const parts = paragraph.split(emailRegex);
                        
                        return (
                          <p key={idx} className="mb-6 text-lg leading-relaxed">
                            {parts.map((part, partIdx) => {
                              if (emailRegex.test(part)) {
                                return (
                                  <a 
                                    key={partIdx}
                                    href={`mailto:${part}`}
                                    className="text-fase-navy hover:text-fase-gold transition-colors underline"
                                  >
                                    {part}
                                  </a>
                                );
                              }
                              return part;
                            })}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      case 'pricing':
        return (
          <div key={index}>
            {/* Blue ribbon separator */}
            <div ref={ribbonAnimations[index].elementRef} className="relative h-12">
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible 
                  ? isEven ? 'w-4/5' : 'w-4/5' 
                  : 'w-0'
              }`}></div>
            </div>
            
            <section className="bg-white py-12 lg:py-16 2xl:py-20">
              <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
                <div ref={animation.elementRef} className={`transition-all duration-700 ${
                  animation.isVisible ? 'scroll-visible-up' : 'scroll-hidden-down'
                }`}>
                  <div className="text-center mb-12">
                    <h2 className="text-3xl lg:text-4xl xl:text-5xl font-noto-serif font-bold text-fase-navy mb-4">
                      {section.title}
                    </h2>
                    <p className="text-lg lg:text-xl text-fase-black max-w-3xl mx-auto">
                      {section.subtitle}
                    </p>
                  </div>
                  
                  <PricingAccordion />
                </div>
              </div>
            </section>
          </div>
        );

      case 'custom':
        return (
          <div key={index}>
            {/* Blue ribbon separator */}
            <div ref={ribbonAnimations[index].elementRef} className="relative h-12">
              <div className={`absolute ${isEven ? 'right-0' : 'left-0'} h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
                ribbonAnimations[index].isVisible ? (isEven ? 'scroll-visible-right' : 'scroll-visible-left') : (isEven ? 'scroll-hidden-right' : 'scroll-hidden-left')
              }`} style={{ width: '61.8%' }}></div>
            </div>

            {/* Custom Content Section */}
            <section ref={animation.elementRef} className="bg-white py-24 lg:py-32 2xl:py-40">
              <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
                <div className={`transition-all duration-700 ${
                  animation.isVisible ? 'scroll-visible' : 'scroll-hidden'
                }`}>
                  {section.content}
                </div>
              </div>
            </section>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-lato overflow-x-hidden">
      {/* Main Content Container */}
      <div className="flex-1 relative">
        <Header currentPage={currentPage} />

        {/* Hero Banner */}
        <section ref={bannerAnimation.elementRef} className="relative h-[33vh] flex items-center overflow-hidden">
          <Image
            src={bannerImage}
            alt={bannerImageAlt}
            fill
            className="object-cover"
            style={{ filter: 'brightness(0.7) contrast(1.1) saturate(1.1)' }}
            priority
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