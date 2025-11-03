'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Button from './Button';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { signOut } from '../lib/auth';
import { useTranslations } from 'next-intl';
import { useUnifiedAdmin } from '../hooks/useUnifiedAdmin';
import { getAvailableLocales, formatLocaleDisplayName } from '../lib/translations';

interface HeaderProps {
  currentPage?: string;
  onLoad?: () => void;
}

export default function Header({ currentPage = '', onLoad }: HeaderProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, member, loading, isAdmin, hasMemberAccess } = useUnifiedAuth();
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const tCommon = useTranslations('common');
  const tNav = useTranslations('navigation');
  const tAuth = useTranslations('auth');
  const tHeader = useTranslations('header'); // Keep for backward compatibility

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white shadow-lg border-b border-fase-light-gold">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex justify-between">
            {/* Left Side - Logo */}
            <div className="flex items-center py-2">
              <div className="flex-shrink-0 flex items-center">
                <a href="/" className="relative">
                  <Image 
                    src="/FASE-Logo-Lockup-RGB.png" 
                    alt="FASE Logo" 
                    width={280}
                    height={60}
                    className="h-15 w-auto object-contain"
                    priority
                    onLoad={handleImageLoad}
                  />
                </a>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex flex-col justify-center">
              {/* Top Row - Search and Language - Hidden on Mobile */}
              <div className="hidden md:flex items-center justify-end space-x-6 py-1">
                {user && (
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-fase-black">
                      {tAuth('logged_in_as')} {
                        member?.personalName 
                          ? `${member.personalName}${member.organizationName ? ` (${member.organizationName})` : ''}` 
                          : user.displayName || user.email?.split("@")[0]
                      }
                    </div>
                    {isAdmin && locale === 'en' && (
                      <a href="/admin-portal" className="text-xs text-fase-navy hover:text-fase-gold transition-colors duration-200 font-medium border border-fase-navy hover:border-fase-gold px-2 py-1 rounded">
                        Admin
                      </a>
                    )}
                  </div>
                )}
                
                {!user && (
                  <a 
                    href="/login" 
                    className="text-xs text-fase-navy hover:text-fase-gold transition-colors duration-200 font-medium border border-fase-navy hover:border-fase-gold px-2 py-1 rounded"
                  >
                    Member Login
                  </a>
                )}
                
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    placeholder={tCommon('search_placeholder')}
                    className="bg-fase-cream text-fase-black px-2 lg:px-4 py-1 pr-8 lg:pr-10 text-xs lg:text-sm w-32 lg:w-40 xl:w-48 focus:outline-none focus:ring-2 focus:ring-fase-navy border border-fase-light-gold"
                  />
                  <button
                    onClick={handleSearch}
                    className="absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 h-3 lg:h-4 w-3 lg:w-4 text-fase-navy hover:text-fase-gold cursor-pointer"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex items-center space-x-1 lg:space-x-2">
                  <span className="text-xs lg:text-sm text-fase-black">{tCommon('language_label')}</span>
                  <select 
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as 'en' | 'fr')}
                    className="bg-white text-fase-black text-xs lg:text-sm border border-fase-light-gold rounded px-1 lg:px-2 py-1 focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  >
                    <option value="en">{tCommon('english')}</option>
                    <option value="fr">{tCommon('french')}</option>
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
              <div className="hidden lg:flex items-center justify-between flex-1 py-1 ml-2 xl:ml-4">
                <div className="flex items-center space-x-1 lg:space-x-2 xl:space-x-4 2xl:space-x-6">
                  {/* About FASE Dropdown */}
                  <div className="relative group">
                    <span className={`px-2 lg:px-3 xl:px-4 py-3 text-xs lg:text-sm xl:text-base 2xl:text-lg flex items-center whitespace-nowrap cursor-pointer transition-all duration-200 ${
                      currentPage === 'about' || currentPage === 'people' || currentPage === 'leadership' || currentPage === 'news' ? 'text-white bg-fase-gold' : 'text-fase-black group-hover:bg-fase-gold group-hover:text-white'
                    }`}>
                      {tNav('about_fase')}
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg border border-fase-light-gold opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <a href="/about/leadership" className={`block px-4 py-3 text-sm hover:bg-fase-cream transition-all duration-200 ${
                        currentPage === 'leadership' ? 'text-white bg-fase-gold' : 'text-fase-black hover:text-fase-navy'
                      }`}>{tNav('leadership')}</a>
                      <a href="/about/people" className={`block px-4 py-3 text-sm hover:bg-fase-cream transition-all duration-200 ${
                        currentPage === 'people' ? 'text-white bg-fase-gold' : 'text-fase-black hover:text-fase-navy'
                      }`}>{tNav('management')}</a>
                      <a href="/about/news" className={`block px-4 py-3 text-sm hover:bg-fase-cream transition-all duration-200 ${
                        currentPage === 'news' ? 'text-white bg-fase-gold' : 'text-fase-black hover:text-fase-navy'
                      }`}>{tNav('news')}</a>
                    </div>
                  </div>

                  {/* Networking Dropdown */}
                  <div className="relative group">
                    <span className={`px-2 lg:px-3 xl:px-4 py-3 text-xs lg:text-sm xl:text-base 2xl:text-lg flex items-center whitespace-nowrap cursor-pointer transition-all duration-200 ${
                      currentPage === 'events' ? 'text-white bg-fase-gold' : 'text-fase-black group-hover:bg-fase-gold group-hover:text-white'
                    }`}>
                      {tNav('networking')}
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg border border-fase-light-gold opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-2">
                        <a href="/events" className={`block px-4 py-2 text-sm ${
                          currentPage === 'events' ? 'text-fase-navy bg-fase-cream font-medium' : 'text-fase-black hover:bg-fase-cream'
                        }`}>{tNav('events')}</a>
                        <a href="/networking/rendezvous" className={`block px-4 py-2 text-sm ${
                          currentPage === 'rendezvous' ? 'text-fase-navy bg-fase-cream font-medium' : 'text-fase-black hover:bg-fase-cream'
                        }`}>{tNav('rendezvous')}</a>
                      </div>
                    </div>
                  </div>

                  {/* Knowledge Dropdown */}
                  <div className="relative group">
                    <span className={`px-2 lg:px-3 xl:px-4 py-3 text-xs lg:text-sm xl:text-base 2xl:text-lg flex items-center whitespace-nowrap cursor-pointer transition-all duration-200 ${
                      currentPage === 'knowledge' || currentPage === 'entrepreneurial-underwriter' || currentPage === 'webinars' ? 'text-white bg-fase-gold' : 'text-fase-black group-hover:bg-fase-gold group-hover:text-white'
                    }`}>
                      {tNav('knowledge')}
                      <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg border border-fase-light-gold opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-2">
                        <a href="/knowledge/entrepreneurial-underwriter" className={`block px-4 py-2 text-sm ${
                          currentPage === 'entrepreneurial-underwriter' ? 'text-fase-navy bg-fase-cream font-medium' : 'text-fase-black hover:bg-fase-cream'
                        }`}>Entrepreneurial Underwriter</a>
                        <a href="/knowledge/webinars" className={`block px-4 py-2 text-sm ${
                          currentPage === 'webinars' ? 'text-fase-navy bg-fase-cream font-medium' : 'text-fase-black hover:bg-fase-cream'
                        }`}>Webinar Series</a>
                      </div>
                    </div>
                  </div>

                  {/* Member Portal */}
                  <a href="/member-portal" className={`px-2 lg:px-3 xl:px-4 py-3 text-xs lg:text-sm xl:text-base 2xl:text-lg whitespace-nowrap transition-all duration-200 ${
                    currentPage === 'member-portal' ? 'text-white bg-fase-gold' : 'text-fase-black hover:text-white hover:bg-fase-gold'
                  }`}>{tNav('member_portal')}</a>
                  
                  {/* Sponsors */}
                  <a href="/sponsors" className={`px-2 lg:px-3 xl:px-4 py-3 text-xs lg:text-sm xl:text-base 2xl:text-lg whitespace-nowrap transition-all duration-200 ${
                    currentPage === 'sponsors' ? 'text-white bg-fase-gold' : 'text-fase-black hover:text-white hover:bg-fase-gold'
                  }`}>Sponsors</a>
                  
                  {/* Contact */}
                  <a href="/contact" className={`px-2 lg:px-3 xl:px-4 py-3 text-xs lg:text-sm xl:text-base 2xl:text-lg whitespace-nowrap transition-all duration-200 ${
                    currentPage === 'contact' ? 'text-white bg-fase-gold' : 'text-fase-black hover:text-white hover:bg-fase-gold'
                  }`}>Contact</a>
                </div>
                {loading ? (
                  <div className="w-20 h-8 bg-fase-cream animate-pulse rounded"></div>
                ) : user ? (
                  <button
                    onClick={handleSignOut}
                    className="px-2 lg:px-3 py-2 text-xs lg:text-sm xl:text-base 2xl:text-lg font-medium text-fase-black hover:text-fase-navy"
                  >
                    {tAuth('sign_out')}
                  </button>
                ) : (
                  <Button href="/join" variant="primary" size="small" className="ml-4">{tNav('join_us')}</Button>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder={tCommon('search_placeholder')}
                className="w-full bg-fase-cream text-fase-black px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-fase-navy border border-fase-light-gold"
              />
              <button
                onClick={handleSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fase-navy hover:text-fase-gold cursor-pointer"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
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

            <div className="space-y-1">
              <div className="px-3 py-2 text-sm font-semibold text-fase-navy">{tNav('about_fase')}</div>
              <a href="/about/leadership" className={`block pl-6 pr-3 py-2 text-base font-medium ${
                currentPage === 'leadership' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
              }`}>Leadership</a>
              <a href="/about/people" className={`block pl-6 pr-3 py-2 text-base font-medium ${
                currentPage === 'people' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
              }`}>Management</a>
              <a href="/about/news" className={`block pl-6 pr-3 py-2 text-base font-medium ${
                currentPage === 'news' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
              }`}>News</a>
            </div>
            
            <div className="space-y-1">
              <div className="px-3 py-2 text-sm font-semibold text-fase-navy">{tNav('networking')}</div>
              <a href="/events" className={`block pl-6 pr-3 py-2 text-base font-medium ${
                currentPage === 'events' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
              }`}>Events</a>
              <a href="/networking/rendezvous" className={`block pl-6 pr-3 py-2 text-base font-medium ${
                currentPage === 'rendezvous' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
              }`}>Rendezvous</a>
            </div>
            
            <div className="space-y-1">
              <div className="px-3 py-2 text-sm font-semibold text-fase-navy">{tNav('knowledge')}</div>
              <a href="/knowledge/entrepreneurial-underwriter" className={`block pl-6 pr-3 py-2 text-base font-medium ${
                currentPage === 'entrepreneurial-underwriter' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
              }`}>Entrepreneurial Underwriter</a>
              <a href="/knowledge/webinars" className={`block pl-6 pr-3 py-2 text-base font-medium ${
                currentPage === 'webinars' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
              }`}>Webinar Series</a>
            </div>
            <a href="/member-portal" className={`block px-3 py-2 text-base font-medium ${
              currentPage === 'member-portal' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
            }`}>{tNav('member_portal')}</a>
            <a href="/sponsors" className={`block px-3 py-2 text-base font-medium ${
              currentPage === 'sponsors' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
            }`}>Sponsors</a>
            <a href="/contact" className={`block px-3 py-2 text-base font-medium ${
              currentPage === 'contact' ? 'text-fase-navy bg-fase-cream' : 'text-fase-black hover:text-fase-navy hover:bg-fase-cream'
            }`}>Contact</a>
            {loading ? (
              <div className="w-full h-10 bg-fase-cream animate-pulse rounded mt-2"></div>
            ) : user ? (
              <div className="mt-4 pt-4 border-t border-fase-light-gold">
                <div className="text-center text-sm text-fase-black mb-2">
                  {tAuth('signed_in_as')} {
                    member?.personalName 
                      ? `${member.personalName}${member.organizationName ? ` (${member.organizationName})` : ''}` 
                      : user.displayName || user.email?.split('@')[0]
                  }
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-center py-2 px-4 bg-fase-black text-white rounded hover:bg-fase-gold transition-colors"
                >
                  {tAuth('sign_out')}
                </button>
              </div>
            ) : (
              <Button href="/join" variant="primary" size="medium" className="w-full text-center mt-2">{tNav('join_us')}</Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}