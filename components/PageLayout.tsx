'use client';

import { useState, ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface PageLayoutProps {
  children: ReactNode;
  currentPage?: string;
}

export default function PageLayout({ 
  children, 
  currentPage
}: PageLayoutProps) {
  const [headerLoaded, setHeaderLoaded] = useState(false);

  return (
    <div className={`min-h-screen bg-fase-light-blue font-lato transition-opacity duration-300 overflow-x-hidden ${headerLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Header currentPage={currentPage} onLoad={() => setHeaderLoaded(true)} />
      
      {/* Main Content */}
      <div>
        {children}
        
        <Footer />
      </div>
    </div>
  );
}