'use client';

import { useState, useEffect } from 'react';

export default function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Always show on page load with small delay for smoother appearance
    setTimeout(() => setIsVisible(true), 500);
  }, []);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm transition-all duration-300 ${
        isClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-white rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-fase-navy to-fase-navy/90 px-4 py-3 flex items-center justify-between">
          <span className="text-white font-medium text-sm">New Event</span>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-noto-serif font-medium text-fase-navy mb-2">
            MGA Rendezvous 2026
          </h3>
          <p className="text-fase-black text-sm mb-4 leading-relaxed">
            Registration is now open for the pan-European MGA networking event in Barcelona, 11-12 May 2026.
          </p>
          <div className="flex gap-3">
            <a
              href="https://mgarendezvous.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-fase-navy text-white text-center py-2 px-4 text-sm font-medium hover:bg-fase-gold transition-colors rounded"
            >
              Learn More
            </a>
            <button
              onClick={handleDismiss}
              className="text-fase-black/60 hover:text-fase-black text-sm transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
