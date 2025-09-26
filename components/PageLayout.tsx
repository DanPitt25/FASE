'use client';

import { useState, ReactNode } from 'react';
import Header from './Header';
import SideNavigation from './SideNavigation';
import Footer from './Footer';

interface NavigationSection {
  name: string;
  id: string;
}

interface PageLayoutProps {
  children: ReactNode;
  currentPage?: string;
  sections?: NavigationSection[];
  showSideNav?: boolean;
}

export default function PageLayout({ 
  children, 
  currentPage, 
  sections = [],
  showSideNav = true 
}: PageLayoutProps) {
  const [headerLoaded, setHeaderLoaded] = useState(false);
  const [showNavPanel, setShowNavPanel] = useState(false);

  return (
    <div className={`min-h-screen bg-fase-paper font-lato transition-opacity duration-300 ${headerLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Header currentPage={currentPage} onLoad={() => setHeaderLoaded(true)} />
      
      {showSideNav && sections.length > 0 && (
        <>
          {/* Side Navigation */}
          <div className={`fixed top-0 left-0 h-full transition-all duration-300 ${showNavPanel ? 'w-80' : 'w-0'} overflow-hidden bg-white border-r border-fase-silver z-40`}>
            <div className="w-80 h-full">
              <div className="p-6">
                {/* Panel Header */}
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-playfair font-bold text-fase-navy">Navigation</h2>
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
                        const element = document.getElementById(section.id);
                        if (element) {
                          const headerHeight = 80; // Approximate header height
                          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                          window.scrollTo({
                            top: elementPosition - headerHeight,
                            behavior: 'smooth'
                          });
                        }
                      }}
                      className="w-full flex items-center space-x-3 p-3 transition-all duration-200 group hover:bg-fase-pearl"
                    >
                      <div className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-fase-navy text-white group-hover:bg-fase-navy">
                        {index + 1}
                      </div>
                      <span className="text-base font-medium text-fase-navy group-hover:text-fase-navy">
                        {section.name}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Menu Toggle Tab */}
          <button
            onClick={() => setShowNavPanel(!showNavPanel)}
            className="hidden md:flex fixed top-1/2 left-0 transform -translate-y-1/2 z-50 bg-white/90 backdrop-blur-sm pl-2 pr-4 py-8 shadow-lg border border-l-0 border-fase-silver hover:bg-white transition-all duration-200 flex-col items-center space-y-2"
          >
            <div className="flex flex-col space-y-1">
              <div className="w-1.5 h-1.5 bg-fase-navy"></div>
              <div className="w-1.5 h-1.5 bg-fase-navy"></div>
              <div className="w-1.5 h-1.5 bg-fase-navy"></div>
            </div>
            <span className="text-xs font-medium text-fase-navy transform rotate-90 whitespace-nowrap">NAV</span>
          </button>
        </>
      )}
      
      {/* Main Content */}
      <div className={`transition-all duration-300 ${showSideNav && showNavPanel ? 'md:ml-80' : 'ml-0'}`}>
        {children}
        
        <Footer />
      </div>
    </div>
  );
}