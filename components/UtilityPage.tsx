'use client';

import { ReactNode } from 'react';
import PageLayout from './PageLayout';

interface UtilityPageProps {
  // Header props
  title: string;
  subtitle?: string;
  logoElement?: ReactNode;
  statusBadge?: ReactNode;
  headerActions?: ReactNode;
  
  // Content props
  children: ReactNode;
  
  // Layout props
  currentPage?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl';
  backgroundClass?: string;
}

export default function UtilityPage({
  title,
  subtitle,
  logoElement,
  statusBadge,
  headerActions,
  children,
  currentPage,
  maxWidth = '7xl',
  backgroundClass = 'bg-gray-50'
}: UtilityPageProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl'
  };

  return (
    <PageLayout currentPage={currentPage}>
      <div className={`min-h-screen ${backgroundClass}`}>
        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-fase-navy to-fase-light-blue text-white py-16">
          <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Logo Section */}
                {logoElement && (
                  <div className="flex items-center justify-center">
                    {logoElement}
                  </div>
                )}

                {/* Title Section */}
                <div>
                  <h1 className="text-4xl md:text-5xl font-noto-serif font-bold mb-2">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-xl text-white/90">{subtitle}</p>
                  )}
                </div>
              </div>

              {/* Status Badge or Actions */}
              {(statusBadge || headerActions) && (
                <div className="text-right">
                  {statusBadge || headerActions}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
          {children}
        </div>
      </div>
    </PageLayout>
  );
}