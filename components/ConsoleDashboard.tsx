'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PageLayout from './PageLayout';

export interface ConsoleTileData {
  id: string;
  title: string;
  icon: ReactNode;
  content?: ReactNode | (() => ReactNode);
  badge?: number | string;
  statusText?: string;
  href?: string; // If set, clicking the tile navigates to this URL instead of showing content
}

interface ConsoleDashboardProps {
  title: string;
  bannerImage?: string;
  bannerImageAlt?: string;
  tiles: ConsoleTileData[];
  currentPage: string;
  defaultActiveTile?: string;
  activeTile?: string;
  onActiveTileChange?: (tileId: string) => void;
}

export default function ConsoleDashboard({
  title,
  bannerImage,
  bannerImageAlt,
  tiles,
  currentPage,
  defaultActiveTile,
  activeTile: controlledActiveTile,
  onActiveTileChange
}: ConsoleDashboardProps) {
  const [internalActiveTile, setInternalActiveTile] = useState(defaultActiveTile || tiles[0]?.id);

  // Use controlled activeTile if provided, otherwise use internal state
  const activeTile = controlledActiveTile !== undefined ? controlledActiveTile : internalActiveTile;

  const handleTileChange = (tileId: string) => {
    if (onActiveTileChange) {
      onActiveTileChange(tileId);
    } else {
      setInternalActiveTile(tileId);
    }
  };

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

  const activeContent = tiles.find(tile => tile.id === activeTile);

  return (
    <PageLayout currentPage={currentPage}>
      <main className="flex-1 bg-gray-50">
        {/* Hero Banner */}
        {bannerImage && (
          <section ref={sectionRef} className="relative h-[15vh] min-h-[120px] flex items-center overflow-hidden">
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
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-noto-serif font-medium text-white leading-tight">
                  {title}
                </h1>
              </div>
            </div>
          </section>
        )}

        {/* No Banner - Simple Header */}
        {!bannerImage && (
          <section className="bg-white py-8 border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy">
                {title}
              </h1>
            </div>
          </section>
        )}

        {/* Console Layout - Sidebar + Content */}
        <section
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex flex-col lg:flex-row min-h-[calc(100vh-200px)]">
            {/* Left Sidebar - Menu Grid */}
            <div className="lg:w-64 xl:w-72 bg-white border-r border-gray-200 p-4 lg:self-stretch">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:sticky lg:top-4">
                {tiles.map((tile, index) => {
                  const tileClassName = `
                    relative p-3 rounded-lg border text-left transition-all duration-200
                    opacity-0 animate-tile-entrance
                    focus:outline-none focus:ring-2 focus:ring-fase-navy focus:ring-offset-2
                    ${activeTile === tile.id
                      ? 'border-fase-navy bg-fase-navy text-white'
                      : 'border-gray-200 bg-white text-fase-navy hover:border-fase-navy/30 hover:bg-gray-50'
                    }
                  `;

                  const tileContent = (
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`w-5 h-5 flex-shrink-0 ${activeTile === tile.id ? 'text-fase-gold' : 'text-fase-navy'}`}>
                        {tile.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <div className="font-medium text-sm truncate">{tile.title}</div>
                      </div>

                      {/* Badge */}
                      {tile.badge !== undefined && tile.badge !== 0 && (
                        <span className="flex-shrink-0 min-w-[18px] px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full text-center">
                          {tile.badge}
                        </span>
                      )}

                      {/* External link indicator for href tiles */}
                      {tile.href && (
                        <svg className="w-4 h-4 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </div>
                  );

                  // If tile has href, render as Link; otherwise render as button
                  if (tile.href) {
                    return (
                      <Link
                        key={tile.id}
                        href={tile.href}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className={tileClassName}
                      >
                        {tileContent}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => handleTileChange(tile.id)}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className={tileClassName}
                    >
                      {tileContent}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 p-4 lg:p-6 xl:p-8 bg-gray-50">
              <div key={activeTile} className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 min-h-[500px]">
                {activeContent?.content && (
                  typeof activeContent.content === 'function'
                    ? activeContent.content()
                    : activeContent.content
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageLayout>
  );
}
