'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from './Header';
import Footer from './Footer';

interface FormLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBackToSite?: boolean;
}

export default function FormLayout({ 
  children, 
  title, 
  subtitle,
  showBackToSite = true 
}: FormLayoutProps) {
  return (
    <div className="flex min-h-screen bg-white font-lato">
      {/* Main Content Container */}
      <div className="flex-1 relative">
        {/* Minimal Header for Forms */}
        <header className="bg-white border-b border-fase-light-gold">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className="flex items-center justify-between h-20">
              {/* Logo and Title */}
              <div className="flex items-center space-x-4">
                <Link href="/" className="flex items-center space-x-3">
                  <Image 
                    src="/fase-logo-mark.png" 
                    alt="FASE Logo" 
                    width={40}
                    height={40}
                    className="h-10 w-auto object-contain"
                  />
                  <span className="text-2xl font-noto-serif font-bold text-fase-navy">FASE</span>
                </Link>
              </div>
              
              {/* Back to Site Link */}
              {showBackToSite && (
                <Link 
                  href="/" 
                  className="text-sm text-fase-navy hover:text-fase-blue transition-colors"
                >
                  ← Back to Site
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Form Content */}
        <main className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow-xl border border-fase-light-gold overflow-hidden">
              {/* Form Header */}
              <div className="bg-white border-b border-fase-light-gold px-6 py-8 text-center">
                <h1 className="text-2xl font-noto-serif font-bold text-fase-navy mb-2">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-fase-black text-sm max-w-md mx-auto">
                    {subtitle}
                  </p>
                )}
              </div>
              
              {/* Form Body */}
              <div className="bg-white px-6 py-8">
                {children}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}