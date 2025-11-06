'use client';

import { ReactNode } from 'react';
import Image from 'next/image';

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
  reverseLayout?: boolean;
}

export default function ContentHero({ 
  id = 'hero',
  children,
  fullHeight = true,
  backgroundImages = [],
  currentImageIndex = 0,
  className = '',
  reverseLayout = false
}: ContentHeroProps) {
  const heightClass = fullHeight 
    ? 'min-h-[calc(100vh-5.5rem)] flex items-center' 
    : 'py-20 lg:py-24 2xl:py-32';

  return (
    <section id={id} className={`relative ${heightClass} overflow-hidden ${className}`}>
      {/* Background Images Container - Desktop Only */}
      {backgroundImages.length > 0 && (
        <div className={`hidden md:block absolute top-0 h-full ${
          reverseLayout ? 'left-0 w-3/5' : 'right-0 w-3/5'
        }`}>
          {/* Images */}
          {backgroundImages.map((city, index) => (
            <div
              key={city.name}
              className={`absolute inset-0 transition-opacity duration-[8000ms] ease-in-out ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={city.image}
                alt={city.name}
                fill
                className="object-cover"
                style={{
                  filter: 'brightness(0.8) contrast(1.1) saturate(1.1)'
                }}
              />
            </div>
          ))}
          
          {/* Gradient Overlay - Inside the same container */}
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{
              background: reverseLayout 
                ? `linear-gradient(to right, 
                    transparent 0%, 
                    transparent 50%, 
                    rgba(255, 255, 255, 0.7) 70%, 
                    #ffffff 85%)`
                : `linear-gradient(to left, 
                    transparent 0%, 
                    transparent 50%, 
                    rgba(255, 255, 255, 0.7) 70%, 
                    #ffffff 85%)`
            }}
          ></div>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 relative z-10">
        {children}
      </div>
    </section>
  );
}