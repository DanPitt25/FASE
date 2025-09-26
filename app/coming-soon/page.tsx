'use client';

import { useState } from 'react';
import Image from 'next/image';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Brochure Viewer Component
function BrochureViewer({ isParentHovered }: { isParentHovered: boolean }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  
  // Brochure pages 1-6 with cache busting
  const pages = [
    '/brochure_pictures/1.png?v=3',
    '/brochure_pictures/2.png?v=3',
    '/brochure_pictures/3.png?v=3',
    '/brochure_pictures/4.png?v=3',
    '/brochure_pictures/5.png?v=3',
    '/brochure_pictures/6.png?v=3',
  ];
  
  const totalSections = 1; // One section per page now
  
  const nextSection = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      setCurrentPage(0); // Loop back to first page
    }
  };
  
  const prevSection = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    } else {
      setCurrentPage(pages.length - 1); // Loop to last page
    }
  };
  
  return (
    <div className="w-80 relative" style={{ margin: '0 auto' }}>
      {/* Desktop Arrows - always present but conditionally visible */}
      <button 
        onClick={prevSection}
        className={`hidden lg:block absolute -left-12 top-1/2 transform -translate-y-1/2 transition-all duration-300 hover:scale-110 ${
          isParentHovered ? 'opacity-60 hover:opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ zIndex: 10 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="#EBE8E4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button 
        onClick={nextSection}
        className={`hidden lg:block absolute -right-12 top-1/2 transform -translate-y-1/2 transition-all duration-300 hover:scale-110 ${
          isParentHovered ? 'opacity-60 hover:opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ zIndex: 10 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M9 6L15 12L9 18" stroke="#EBE8E4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Mobile Navigation Arrows - always visible */}
      <button 
        onClick={prevSection}
        className="lg:hidden absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-70 hover:opacity-100 transition-opacity"
        style={{ zIndex: 10 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button 
        onClick={nextSection}
        className="lg:hidden absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-70 hover:opacity-100 transition-opacity"
        style={{ zIndex: 10 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="relative overflow-hidden rounded-lg shadow-2xl">
        {/* Image container with smooth slide animation */}
        <div 
          className="flex transition-transform duration-500 ease-in-out cursor-pointer"
          style={{ transform: `translateX(-${currentPage * 100}%)` }}
          onClick={nextSection}
        >
          {pages.map((page, index) => (
            <div key={index} className="w-full lg:w-80 flex-shrink-0 p-2 lg:p-4">
              <Image 
                src={page}
                alt={`FASE Brochure Page ${index + 1}`}
                width={288}
                height={400}
                className="w-full lg:w-72 h-auto rounded transition-all duration-300"
                style={{
                  filter: 'brightness(1.1)',
                  objectFit: 'contain'
                }}
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Progress Dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {Array.from({ length: pages.length }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === currentPage 
                ? 'bg-white' 
                : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function ComingSoonPage() {
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    email: '',
    phone: ''
  });
  const [isBrochurePanelHovered, setIsBrochurePanelHovered] = useState(false);
  const [showBrochureModal, setShowBrochureModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Store the signup in Firestore
      await addDoc(collection(db, 'coming-soon-signups'), {
        ...formData,
        timestamp: new Date(),
        source: 'coming-soon-page'
      });
      
      // Clear form
      setFormData({
        name: '',
        organization: '',
        email: '',
        phone: ''
      });
      
      alert('Thanks for your interest! We\'ll be in touch soon.');
    } catch (error) {
      console.error('Error saving signup:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: '#15252F' }}>
      {/* Left Side - Brochure (Desktop) */}
      <div className="hidden lg:flex items-center justify-center p-8 transition-all duration-500 ease-in-out cursor-pointer brochure-panel" style={{ backgroundColor: '#2D5574', width: '25%' }}
           onMouseEnter={(e) => {
             e.currentTarget.style.width = '60%';
             setIsBrochurePanelHovered(true);
           }}
           onMouseLeave={(e) => {
             e.currentTarget.style.width = '25%';
             setIsBrochurePanelHovered(false);
           }}>
        <BrochureViewer isParentHovered={isBrochurePanelHovered} />
      </div>

      {/* Main Content Area */}
      <div className="w-full flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="max-w-md w-full">
          {/* FASE Logo */}
          <div className="text-center mb-8">
            <div className="mb-6">
              <Image 
                src="/fase-logo-stacked.png" 
                alt="FASE Logo" 
                width={120}
                height={120}
                className="mx-auto"
                priority
              />
            </div>
            <h1 className="text-4xl font-playfair font-light mb-2" style={{ color: '#EBE8E4' }}>
              Coming soon...
            </h1>
            <p className="font-light mb-4" style={{ color: '#E2A560' }}>
              Be the first to know when we launch
            </p>
            <button 
              className="lg:hidden mb-6 px-4 py-2 rounded-lg transition-colors border"
              style={{ 
                borderColor: '#E2A560',
                color: '#E2A560'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = '#E2A560';
                (e.target as HTMLElement).style.color = '#15252F';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = '#E2A560';
              }}
              onClick={() => setShowBrochureModal(true)}
            >
              View Our Brochure
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-colors text-white placeholder-gray-400 border-0"
                style={{ 
                  backgroundColor: '#2D5574'
                }}
              />
            </div>

            <div>
              <input
                type="text"
                name="organization"
                placeholder="Organization"
                value={formData.organization}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-colors text-white placeholder-gray-400 border-0"
                style={{ 
                  backgroundColor: '#2D5574'
                }}
              />
            </div>

            <div>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-colors text-white placeholder-gray-400 border-0"
                style={{ 
                  backgroundColor: '#2D5574'
                }}
              />
            </div>

            <div>
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-colors text-white placeholder-gray-400 border-0"
                style={{ 
                  backgroundColor: '#2D5574'
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2"
              style={{ 
                backgroundColor: '#E2A560', 
                color: '#15252F'
              }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#E6C06E'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#E2A560'}
            >
              Keep me updated
            </button>
          </form>

          <div className="text-center mt-8">
            <p className="text-sm" style={{ color: '#B46A33' }}>
              Questions?{' '}
              <a 
                href="mailto:info@fasemga.org" 
                className="hover:underline transition-colors"
                style={{ color: '#E2A560' }}
              >
                info@fasemga.org
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Brochure Modal */}
      {showBrochureModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2">
          <div className="bg-fase-navy rounded-lg w-full max-w-xs max-h-[95vh] overflow-hidden relative" style={{ backgroundColor: '#2D5574' }}>
            {/* Close button overlaying the brochure */}
            <button
              onClick={() => setShowBrochureModal(false)}
              className="absolute top-2 right-2 bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-20 hover:bg-black/80 transition-colors"
            >
              ✕
            </button>
            
            {/* Modal content - no padding, no title */}
            <BrochureViewer isParentHovered={true} />
          </div>
        </div>
      )}

    </div>
  );
}