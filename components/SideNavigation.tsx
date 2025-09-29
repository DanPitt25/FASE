'use client';

import { useState, useEffect } from 'react';

interface NavigationSection {
  name: string;
  id: string;
}

interface SideNavigationProps {
  sections: NavigationSection[];
}

export default function SideNavigation({ sections }: SideNavigationProps) {
  const [showNavPanel, setShowNavPanel] = useState(false);
  const [currentSection, setCurrentSection] = useState(sections[0]?.id || '');

  // Track current section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 3;
      
      // Find which section is currently in view
      let foundSection = sections[0]?.id || '';
      
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
    <>
      {/* Collapsible Navigation Sidebar */}
      <div className={`fixed top-0 left-0 h-full transition-all duration-300 ${showNavPanel ? 'w-80' : 'w-0'} overflow-hidden bg-white border-r border-fase-silver z-40`}>
        <div className="w-80 h-full">
          <div className="p-6">
            {/* Panel Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-noto-serif font-bold text-fase-navy">Navigation</h2>
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
                    if (section.id === sections[0]?.id) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      document.getElementById(section.id)?.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                      });
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
                      : 'bg-fase-navy text-white group-hover:bg-fase-navy'
                  }`}>
                    {index + 1}
                  </div>
                  <span className={`text-base font-medium transition-colors ${
                    currentSection === section.id 
                      ? 'text-white' 
                      : 'text-fase-navy group-hover:text-fase-navy'
                  }`}>
                    {section.name}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Menu Toggle Tab - Hidden on mobile, shown on desktop */}
      <button
        onClick={() => setShowNavPanel(!showNavPanel)}
        className="hidden md:flex fixed top-1/2 left-0 transform -translate-y-1/2 z-50 bg-white/90 backdrop-blur-sm pl-2 pr-4 py-8 shadow-lg border border-l-0 border-fase-silver hover:bg-white transition-all duration-200 flex-col items-center space-y-2"
      >
        <div className="flex flex-col space-y-1">
          <div className="w-1.5 h-1.5 bg-fase-navy "></div>
          <div className="w-1.5 h-1.5 bg-fase-navy "></div>
          <div className="w-1.5 h-1.5 bg-fase-navy "></div>
        </div>
        <span className="text-xs font-medium text-fase-navy transform rotate-90 whitespace-nowrap">NAV</span>
      </button>

      {/* Content offset when nav is open */}
      <div className={`transition-all duration-300 ${showNavPanel ? 'md:ml-80' : 'ml-0'}`}>
        {/* This div will contain the page content */}
      </div>
    </>
  );
}