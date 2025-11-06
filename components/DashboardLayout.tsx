'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import PageLayout from './PageLayout';

interface DashboardSection {
  id: string;
  title: string;
  icon: ReactNode;
  content: ReactNode;
}

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  bannerImage?: string;
  bannerImageAlt?: string;
  sections: DashboardSection[];
  currentPage: string;
  headerActions?: ReactNode;
  statusBadge?: ReactNode;
  defaultActiveSection?: string;
}

export default function DashboardLayout({
  title,
  subtitle,
  bannerImage,
  bannerImageAlt,
  sections,
  currentPage,
  headerActions,
  statusBadge,
  defaultActiveSection
}: DashboardLayoutProps) {
  const [activeSection, setActiveSection] = useState(defaultActiveSection || sections[0]?.id);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const activeTab = sections.find(section => section.id === activeSection);

  return (
    <PageLayout currentPage={currentPage}>
      <main className="flex-1 bg-white">
        {/* Hero Banner */}
        {bannerImage && (
          <section ref={sectionRef} className="relative h-[20vh] flex items-center overflow-hidden">
            <Image
              src={bannerImage}
              alt={bannerImageAlt || ''}
              fill
              className="object-cover"
              style={{ filter: 'brightness(0.7) contrast(1.1) saturate(1.1)' }}
            />
            <div className="absolute inset-0 bg-fase-navy/40"></div>
            <div className="relative z-10 w-full h-full flex items-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
              <div className={`w-3/4 lg:w-3/5 xl:w-1/2 transition-all duration-700 ${
                isVisible ? 'scroll-visible-left' : 'scroll-hidden-left'
              }`}>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-noto-serif font-medium text-white leading-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-lg text-white/90 mt-2">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* No Banner - Simple Header */}
        {!bannerImage && (
          <section className="bg-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl md:text-5xl font-noto-serif font-medium text-fase-navy mb-2">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-lg text-fase-black">
                      {subtitle}
                    </p>
                  )}
                </div>
                {(headerActions || statusBadge) && (
                  <div className="flex items-center space-x-4">
                    {statusBadge}
                    {headerActions}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Blue Ribbon Separator */}
        <div className="relative bg-white">
          <div 
            className="absolute left-0 top-0 h-2 bg-fase-navy transform rotate-1 origin-left"
            style={{ width: '85%' }}
          />
        </div>

        {/* Dashboard Content */}
        <section 
          ref={sectionRef}
          className={`bg-white py-8 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            {/* Tab Navigation */}
            <div className="border-b border-fase-light-gold mb-8">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 transition-colors ${
                      activeSection === section.id
                        ? 'border-fase-navy text-fase-navy'
                        : 'border-transparent text-fase-black hover:text-fase-navy hover:border-fase-light-gold'
                    }`}
                  >
                    {section.icon}
                    <span>{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Active Section Content */}
            <div className="min-h-[500px]">
              {activeTab?.content}
            </div>
          </div>
        </section>

        {/* Bottom Blue Ribbon */}
        <div className="relative bg-white">
          <div 
            className="absolute right-0 bottom-0 h-2 bg-fase-navy transform -rotate-1 origin-right"
            style={{ width: '75%' }}
          />
        </div>
      </main>
    </PageLayout>
  );
}