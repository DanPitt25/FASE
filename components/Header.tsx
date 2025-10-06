'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Button from './Button';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { signOut } from '../lib/auth';
import { useTranslations } from 'next-intl';
import { useAdmin } from '../hooks/useAdmin';

interface HeaderProps {
  currentPage?: string;
  onLoad?: () => void;
}

export default function Header({ currentPage = '', onLoad }: HeaderProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { user, loading } = useAuth();
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const t = useTranslations('Header');
  const { isAdmin, loading: adminLoading } = useAdmin();

  const handleImageLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white shadow-lg border-b border-fase-light-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between">
            {/* Left Side - Logo */}
            <div className="flex items-center py-3">
              <div className="flex-shrink-0 flex items-center">
                <div className="relative w-16 h-16">
                  <Image 
                    src="/fase-logo-mark.png" 
                    alt="FASE Logo" 
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                    priority
                    onLoad={handleImageLoad}
                  />
                </div>
                <div className="border-l border-fase-light-gold h-14 mx-3"></div>
                <a href="/" className="text-4xl font-noto-serif font-bold text-fase-navy mx-3">FASE</a>
                <div className="border-l border-fase-light-gold h-14 mx-3"></div>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex flex-col justify-center">
              {/* Top Row - Search and Language - Hidden on Mobile */}
              <div className="hidden md:flex items-center justify-end space-x-6 py-1">
                {user && (
                  <div className="text-sm text-fase-black">
                    {t('logged_in_as')} {user.displayName || user.email?.split("@")[0]}
                  </div>
                )}
                
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t('search_placeholder')}
                    className="bg-fase-cream text-fase-black px-4 py-1 pr-10  text-sm w-48 focus:outline-none focus:ring-2 focus:ring-fase-navy border border-fase-light-gold"
                  />
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fase-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-fase-black">{t('language_label')}</span>
                  <select 
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as 'en' | 'fr')}
                    className="bg-white text-fase-black text-sm border border-fase-light-gold rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>

              {/* Mobile Menu Button */}
              <div className="flex items-center justify-end lg:hidden">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2  text-fase-black hover:text-fase-navy focus:outline-none focus:ring-2 focus:ring-fase-navy"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showMobileMenu ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>

              {/* Desktop Navigation Menu */}
              <div className="hidden lg:flex items-center justify-between flex-1 py-1 ml-4">
                <div className="flex items-center space-x-6">
                  <div className="relative group">
                    <a href="/about" className={`px-4 py-2 text-sm font-medium flex items-center whitespace-nowrap ${
                      currentPage === 'about' ? 'text-fase-navy' : 'text-fase-black hover:text-fase-navy'
                    }`}>
                      {t('about_us')}
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </a>
                    <div className="absolute left-0 mt-2 w-64 bg-white shadow-lg border border-fase-light-gold  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-2">
                        <a href="/what-is-an-mga" className="block px-4 py-2 text-sm text-fase-black hover:bg-fase-cream">What is an MGA?</a>
                        <a href="/about/who-we-are" className={`block px-4 py-2 text-sm ${
                          currentPage === 'who-we-are' ? 'text-fase-navy bg-fase-cream font-medium' : 'text-fase-black hover:bg-fase-cream'
                        }`}>Who We Are</a>
                        <a href="/about/advisory-board" className="block px-4 py-2 text-sm text-fase-black hover:bg-fase-cream">Advisory Board</a>
                        <a href="/about/membership-directory" className="block px-4 py-2 text-sm text-fase-black hover:bg-fase-cream">Membership Directory</a>
                        <a href="/about/affiliates" className="block px-4 py-2 text-sm text-fase-black hover:bg-fase-cream">Affiliates & Associates</a>
                        <a href="/about/sponsors" className="block px-4 py-2 text-sm text-fase-black hover:bg-fase-cream">Sponsors</a>
                      </div>
                    </div>
                  </div>

                  <a href="/join" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentPage === 'join' ? 'text-fase-navy' : 'text-fase-black hover:text-fase-navy'
                  }`}>{t('join_us')}</a>
                  <a href="/sponsorship" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentPage === 'sponsorship' ? 'text-fase-navy' : 'text-fase-black hover:text-fase-navy'
                  }`}>{t('sponsorship')}</a>
                  <a href="/events" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentPage === 'events' ? 'text-fase-navy' : 'text-fase-black hover:text-fase-navy'
                  }`}>{t('events')}</a>
                  <a href="/news" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentPage === 'news' ? 'text-fase-navy' : 'text-fase-black hover:text-fase-navy'
                  }`}>{t('news')}</a>
                  <a href="/member-portal" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentPage === 'member-portal' ? 'text-fase-navy' : 'text-fase-black hover:text-fase-navy'
                  }`}>{t('member_portal')}</a>
                  {!adminLoading && isAdmin && locale === 'en' && (
                    <a href="/admin-portal" className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                      currentPage === 'admin-portal' ? 'text-fase-navy' : 'text-fase-black hover:text-fase-navy'
                    }`}>Admin Portal</a>
                  )}
                </div>
                {loading ? (
                  <div className="w-20 h-8 bg-fase-cream animate-pulse rounded"></div>
                ) : user ? (
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-2 text-sm font-medium text-fase-black hover:text-fase-navy"
                  >
                    {t('sign_out')}
                  </button>
                ) : (
                  <Button href="/login" variant="primary" size="small">{t('sign_in')}</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="lg:hidden bg-white border-b border-fase-light-gold shadow-lg">
          <div className="px-4 py-2 space-y-1">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder={t('search_placeholder')}
                className="w-full bg-fase-cream text-fase-black px-4 py-2 pr-10  text-sm focus:outline-none focus:ring-2 focus:ring-fase-navy border border-fase-light-gold"
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fase-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="mb-4">
              <select 
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'fr')}
                className="w-full bg-white text-fase-black text-sm border border-fase-light-gold rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fase-navy"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <a href="/about" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'about' || currentPage === 'who-we-are' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
            }`}>{t('about_us')}</a>
            <a href="/join" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'join' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
            }`}>{t('join_us')}</a>
            <a href="/sponsorship" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'sponsorship' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
            }`}>{t('sponsorship')}</a>
            <a href="/events" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'events' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
            }`}>{t('events')}</a>
            <a href="/news" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'news' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
            }`}>{t('news')}</a>
            <a href="/member-portal" className={`block px-3 py-2 text-base font-medium  ${
              currentPage === 'member-portal' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
            }`}>{t('member_portal')}</a>
            {!adminLoading && isAdmin && locale === 'en' && (
              <a href="/admin-portal" className={`block px-3 py-2 text-base font-medium  ${
                currentPage === 'admin-portal' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
              }`}>Admin Portal</a>
            )}
            {loading ? (
              <div className="w-full h-10 bg-fase-cream animate-pulse rounded mt-2"></div>
            ) : user ? (
              <div className="mt-4 pt-4 border-t border-fase-light-gold">
                <div className="text-center text-sm text-fase-black mb-2">
                  {t('signed_in_as')} {user.displayName || user.email?.split('@')[0]}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-center py-2 px-4 bg-fase-black text-white rounded hover:bg-fase-gold transition-colors"
                >
                  {t('sign_out')}
                </button>
              </div>
            ) : (
              <Button href="/login" variant="primary" size="medium" className="w-full text-center mt-2">{t('sign_in')}</Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}