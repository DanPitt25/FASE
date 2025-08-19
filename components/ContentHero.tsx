'use client';

import { ReactNode } from 'react';

interface ContentHeroProps {
  id?: string;
  children: ReactNode;
  fullHeight?: boolean;
  backgroundImages?: {
    name: string;
    image: string;
  }[];
  currentImageIndex?: number;
  className?: string;
}

export default function ContentHero({ 
  id = 'hero',
  children,
  fullHeight = true,
  backgroundImages = [],
  currentImageIndex = 0,
  className = ''
}: ContentHeroProps) {
  const heightClass = fullHeight 
    ? 'min-h-[calc(100vh-120px)] min-h-[calc(100svh-120px)] md:min-h-[calc(100vh-80px)] flex items-center' 
    : 'py-20';

  return (
    <section id={id} className={`relative ${heightClass} overflow-hidden ${className}`}>
      {/* Background Images - Desktop Only */}
      {backgroundImages.length > 0 && (
        <div className="hidden md:block absolute right-0 top-0 w-3/5 h-full">
          {backgroundImages.map((city, index) => (
            <div
              key={city.name}
              className={`absolute inset-0 transition-opacity duration-[8000ms] ease-in-out ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={city.image}
                alt={city.name}
                className="w-full h-full object-cover"
                style={{
                  filter: 'brightness(0.8) contrast(1.1) saturate(1.1)'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Smooth Gradient Overlay */}
      {backgroundImages.length > 0 && (
        <div 
          className="absolute inset-0" 
          style={{
            background: `linear-gradient(to right, 
              #f8f8f8 0%, 
              #f8f8f8 40%, 
              rgba(248, 248, 248, 0.8) 50%, 
              rgba(248, 248, 248, 0.4) 60%, 
              rgba(248, 248, 248, 0.1) 70%, 
              transparent 80%)`
          }}
        ></div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {children}
      </div>
    </section>
  );
}