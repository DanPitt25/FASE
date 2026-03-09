'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import PageLayout from './PageLayout';

export interface ConsoleTileData {
  id: string;
  title: string;
  icon: ReactNode;
  content: ReactNode | (() => ReactNode);
  badge?: number | string;
  statusText?: string;
}

export type AdminSection = 'view' | 'manage';

interface AdminConsoleDashboardProps {
  title: string;
  bannerImage?: string;
  bannerImageAlt?: string;
  viewTiles: ConsoleTileData[];
  manageTiles: ConsoleTileData[];
  currentPage: string;
  defaultSection?: AdminSection;
  defaultActiveTile?: string;
}

export default function AdminConsoleDashboard({
  title,
  bannerImage,
  bannerImageAlt,
  viewTiles,
  manageTiles,
  currentPage,
  defaultSection = 'view',
  defaultActiveTile,
}: AdminConsoleDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>(defaultSection);
  const [activeTileId, setActiveTileId] = useState<string>(
    defaultActiveTile || (defaultSection === 'view' ? viewTiles[0]?.id : manageTiles[0]?.id)
  );

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

  const currentTiles = activeSection === 'view' ? viewTiles : manageTiles;
  const activeContent = currentTiles.find(tile => tile.id === activeTileId);

  // When switching sections, select first tile if current tile doesn't exist in new section
  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    const tiles = section === 'view' ? viewTiles : manageTiles;
    const currentTileExists = tiles.some(t => t.id === activeTileId);
    if (!currentTileExists && tiles.length > 0) {
      setActiveTileId(tiles[0].id);
    }
  };

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
            {/* Left Sidebar */}
            <div className="lg:w-64 xl:w-72 bg-white border-r border-gray-200 p-4 lg:self-stretch">
              <div className="lg:sticky lg:top-4">
                {/* Section Toggle */}
                <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => handleSectionChange('view')}
                    className={`
                      flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-fase-navy focus:ring-offset-1
                      ${activeSection === 'view'
                        ? 'bg-fase-navy text-white shadow-sm'
                        : 'text-gray-600 hover:text-fase-navy hover:bg-gray-200'
                      }
                    `}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionChange('manage')}
                    className={`
                      flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-fase-navy focus:ring-offset-1
                      ${activeSection === 'manage'
                        ? 'bg-fase-navy text-white shadow-sm'
                        : 'text-gray-600 hover:text-fase-navy hover:bg-gray-200'
                      }
                    `}
                  >
                    Manage
                  </button>
                </div>

                {/* Tiles Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {currentTiles.map((tile, index) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => setActiveTileId(tile.id)}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className={`
                        relative p-3 rounded-lg border text-left transition-all duration-200
                        opacity-0 animate-tile-entrance
                        focus:outline-none focus:ring-2 focus:ring-fase-navy focus:ring-offset-2
                        ${activeTileId === tile.id
                          ? 'border-fase-navy bg-fase-navy text-white'
                          : 'border-gray-200 bg-white text-fase-navy hover:border-fase-navy/30 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div className={`w-5 h-5 flex-shrink-0 ${activeTileId === tile.id ? 'text-fase-gold' : 'text-fase-navy'}`}>
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
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 p-4 lg:p-6 xl:p-8 bg-gray-50">
              <div key={activeTileId} className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 min-h-[500px]">
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
