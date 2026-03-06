'use client';

import { useUnifiedAuth } from "../../contexts/UnifiedAuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "../../components/Button";
import ConsoleDashboard from "../../components/ConsoleDashboard";
import type { ConsoleTileData } from "../../components/ConsoleDashboard";
import ManageProfile from "../../components/ManageProfile";
import MemberMap from "../../components/MemberMap";
import MembershipDirectory from "../../components/MembershipDirectory";
import ContactButton from "../../components/ContactButton";
import { getUserAlerts, markAlertAsRead, dismissAlert, Alert, UserAlert } from "../../lib/unified-messaging";
import { usePortalTranslations } from "./hooks/usePortalTranslations";
import Image from "next/image";

// Simple markdown renderer for alert content
function renderMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    // Bold **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic *text*
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code `text`
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

export default function MemberContent() {
  const { user, member, loading, hasMemberAccess } = useUnifiedAuth();
  const { t, loading: translationsLoading, translations, locale } = usePortalTranslations();
  const [alerts, setAlerts] = useState<(Alert & UserAlert)[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  
  const router = useRouter();

  // Logo download function
  const downloadFASELogo = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Load alerts and messages
  useEffect(() => {
    const loadData = async () => {
      if (!user || !member) {
        return;
      }
      
      
      try {
        setLoadingAlerts(true);
        
        const userAlerts = await getUserAlerts(member.id); // Use Firestore account ID
        
        // Filter alerts by current locale
        const localeFilteredAlerts = userAlerts.filter(alert => 
          alert.locale === locale || !alert.locale // Show alerts with no locale (legacy) or matching locale
        );
        
        setAlerts(localeFilteredAlerts);
      } catch (error) {
      } finally {
        setLoadingAlerts(false);
      }
    };

    loadData();
  }, [user, member, locale]);


  // Alert handlers
  const handleMarkAlertAsRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      ));
    } catch (error) {
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await dismissAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
    }
  };




  if (loading || translationsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
        <div className="animate-pulse">
          <div className="h-8 bg-fase-cream rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-fase-cream rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // Clean status display - no bubbles
  const statusBadge = null; // Remove entirely

  // Get active alert count
  const unreadAlerts = alerts.filter(alert => !alert.isRead);

  // Dashboard tiles - filter out profile section for internal users
  const allDashboardTiles: ConsoleTileData[] = [
    {
      id: 'home',
      title: t('sections.home') || 'Home',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          {/* Entrepreneurial Underwriter Banner Ad */}
          <Link
            href="/member-portal/bulletin/february-2026"
            className="block rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow relative"
          >
            <object
              data="/bulletin/feb-2026/lloyds-ad.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH,0"
              type="application/pdf"
              className="w-full pointer-events-none"
              style={{ height: '400px' }}
            >
              <div className="bg-fase-navy text-white p-8 text-center">
                <p className="text-xl font-semibold">The Entrepreneurial Underwriter</p>
                <p className="text-fase-gold mt-2">Click to view</p>
              </div>
            </object>
            <div className="absolute inset-0" />
          </Link>

          {/* Member Benefits Section */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">{t('overview.welcome_title')}</h2>
            <p className="text-fase-black mb-6">{t('overview.benefits_intro')}</p>

            <div className="space-y-4">
              {/* Brand endorsement - moved to top */}
              <details className="group border border-gray-200 rounded-lg">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-fase-navy">{t('overview.brand.title')}</h3>
                  <svg className="w-5 h-5 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <p className="text-fase-black mb-4">
                    {t('overview.brand.description_1')}
                  </p>
                  <p className="text-fase-black mb-6">
                    {t('overview.brand.description_2')}
                  </p>

                  {/* FASE Logo section integrated here */}
                  <div className="border-t border-gray-100 pt-6">
                    <h4 className="text-lg font-semibold text-fase-navy mb-4">{t('logo_access.title')}</h4>
                    <p className="text-fase-black mb-6 leading-relaxed">
                      {t('logo_access.description')}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded">
                        <div className="flex items-center space-x-3">
                          <Image
                            src="/FASE-Logo-Lockup-RGB.png"
                            alt="FASE Logo Horizontal Lockup"
                            width={120}
                            height={32}
                            className="h-8 w-auto object-contain"
                          />
                          <span className="text-sm font-medium text-fase-navy">{t('logo_access.horizontal_logo')}</span>
                        </div>
                        <Button
                          onClick={() => downloadFASELogo('FASE-Logo-Lockup-RGB.png')}
                          variant="secondary"
                          size="small"
                        >
                          {t('logo_access.download')}
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded">
                        <div className="flex items-center space-x-3">
                          <Image
                            src="/FASE-Logo-Lockup-Stacked-RGB.png"
                            alt="FASE Logo Vertical Lockup"
                            width={80}
                            height={32}
                            className="h-8 w-auto object-contain"
                          />
                          <span className="text-sm font-medium text-fase-navy">{t('logo_access.vertical_logo')}</span>
                        </div>
                        <Button
                          onClick={() => downloadFASELogo('FASE-Logo-Lockup-Stacked-RGB.png')}
                          variant="secondary"
                          size="small"
                        >
                          {t('logo_access.download')}
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h5 className="text-base font-semibold text-fase-navy mb-3">{t('logo_access.directory_title')}</h5>
                      <p className="text-fase-black leading-relaxed mb-4">
                        {t('logo_access.directory_description')}
                      </p>
                      <ul className="space-y-2 text-fase-black">
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-fase-navy rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          {t('logo_access.directory_requirements.logo')}
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-fase-navy rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          {t('logo_access.directory_requirements.summary')}
                        </li>
                        <li className="flex items-start">
                          <span className="w-2 h-2 bg-fase-navy rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          {t('logo_access.directory_requirements.website')}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </details>

              {/* Unique access to a pan-European MGA community - moved down */}
              <details className="group border border-gray-200 rounded-lg">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-fase-navy">{t('overview.community.title')}</h3>
                  <svg className="w-5 h-5 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <p className="text-fase-black mb-4">
                    {t('overview.community.description_1')}
                  </p>
                  <p className="text-fase-black">
                    {t('overview.community.description_2')}
                  </p>
                </div>
              </details>

              {/* Capacity and distribution matching */}
              <details className="group border border-gray-200 rounded-lg">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-fase-navy">{t('overview.matching.title')}</h3>
                  <svg className="w-5 h-5 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <p className="text-fase-black mb-4">
                    {t('overview.matching.description_1')}
                  </p>
                  <p className="text-fase-black">
                    {t('overview.matching.description_2')}
                  </p>
                </div>
              </details>

              {/* Data and insights - with sub-sections */}
              <details className="group border border-gray-200 rounded-lg">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-fase-navy">{t('overview.data.title')}</h3>
                  <svg className="w-5 h-5 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <p className="text-fase-black mb-4">
                    {t('overview.data.description')}
                  </p>

                  <div className="space-y-3 ml-4">
                    {/* Regulatory analysis */}
                    <details className="group border border-gray-100 rounded-lg">
                      <summary className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-25 rounded-lg">
                        <h4 className="font-medium text-fase-navy">{t('overview.data.regulatory.title')}</h4>
                        <svg className="w-4 h-4 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="p-3 pt-0 border-t border-gray-50">
                        <p className="text-sm text-fase-black mb-3">
                          {t('overview.data.regulatory.description_1')}
                        </p>
                        <p className="text-sm text-fase-black">
                          {t('overview.data.regulatory.description_2')}
                        </p>
                      </div>
                    </details>

                    {/* Annual market report */}
                    <details className="group border border-gray-100 rounded-lg">
                      <summary className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-25 rounded-lg">
                        <h4 className="font-medium text-fase-navy">{t('overview.data.report.title')}</h4>
                        <svg className="w-4 h-4 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="p-3 pt-0 border-t border-gray-50">
                        <p className="text-sm text-fase-black">
                          {t('overview.data.report.description')}
                        </p>
                      </div>
                    </details>

                    {/* Webinar archive */}
                    <details className="group border border-gray-100 rounded-lg">
                      <summary className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-25 rounded-lg">
                        <h4 className="font-medium text-fase-navy">{t('overview.data.webinars.title')}</h4>
                        <svg className="w-4 h-4 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="p-3 pt-0 border-t border-gray-50">
                        <p className="text-sm text-fase-black">
                          {t('overview.data.webinars.description')}
                        </p>
                      </div>
                    </details>
                  </div>
                </div>
              </details>

              {/* Relationship building */}
              <details className="group border border-gray-200 rounded-lg">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-fase-navy">{t('overview.relationships.title')}</h3>
                  <svg className="w-5 h-5 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <p className="text-fase-black mb-4">
                    {t('overview.relationships.description_1')}
                  </p>
                  <p className="text-fase-black mb-4">
                    {t('overview.relationships.description_2')}
                  </p>
                  <p className="text-fase-black mb-4">
                    {t('overview.relationships.description_3')}
                  </p>
                  <p className="text-fase-black mb-4">
                    {t('overview.relationships.description_4')}
                  </p>
                  <p className="text-fase-black mb-4">
                    {t('overview.relationships.description_5')}
                  </p>
                  <p className="text-fase-black mb-6">
                    {t('overview.relationships.description_6')}
                  </p>

                  {/* Member discounts subsection */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-base font-semibold text-fase-navy mb-4">{t('overview.member_discounts.title')}</h4>
                    <p className="text-fase-black mb-4">
                      {t('overview.member_discounts.description_1')}
                    </p>
                    <p className="text-fase-black mb-4">
                      {t('overview.member_discounts.description_2')}
                    </p>
                    <p className="text-fase-black">
                      {t('overview.member_discounts.description_3')}
                    </p>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'bulletin',
      title: 'The Entrepreneurial Underwriter',
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-fase-light-gold rounded-lg p-6">
            <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">The Entrepreneurial Underwriter</h2>
            <p className="text-fase-black mb-6">
              FASE&apos;s monthly bulletin for the European delegated underwriting community, featuring market insights, member news, and industry analysis.
            </p>

            {/* Latest Edition */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-fase-navy p-4">
                <h3 className="text-lg font-semibold text-white">Latest Edition</h3>
              </div>
              <div className="p-6">
                <Link
                  href="/member-portal/bulletin/february-2026"
                  className="block group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-20 h-20 bg-fase-navy rounded flex items-center justify-center">
                      <span className="text-fase-gold font-noto-serif text-2xl font-bold">Feb</span>
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm text-gray-500 mb-1">February 2026</p>
                      <h4 className="text-lg font-semibold text-fase-navy group-hover:underline mb-2">
                        Inaugural Edition
                      </h4>
                      <p className="text-sm text-gray-600">
                        Lloyd&apos;s coverholder business in Europe, captive strategies for MGAs, MGA Rendezvous update, and FASE by the numbers.
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-fase-navy flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'map',
      title: t('sections.map'),
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3v10" />
        </svg>
      ),
      content: () => (
        <MemberMap key="member-map-instance" translations={{...(translations?.map || {}), locale}} />
      )
    },
    {
      id: 'directory',
      title: t('sections.directory'),
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      content: (
        <MembershipDirectory translations={{...(translations?.directory || {}), locale}} />
      )
    },
    {
      id: 'profile',
      title: t('sections.profile'),
      icon: (
        <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          {/* Company Management */}
          <ManageProfile />
        </div>
      )
    }
  ];

  // Filter out profile tile for internal users (unless they are account administrators)
  const dashboardTiles = member?.status === 'internal' && !member?.isAccountAdministrator
    ? allDashboardTiles.filter(tile => tile.id !== 'profile')
    : allDashboardTiles;

  // Construct title with personal name and company name (if applicable)
  const getWelcomeTitle = () => {
    if (!member?.personalName) {
      return t('portal.welcome_title');
    }
    
    const personalName = member?.personalName || "";
    const companyName = member?.organizationName;
    
    // All members are corporate
    if (personalName && companyName) {
      return t('portal.welcome_company', { name: personalName, company: companyName });
    } else if (personalName) {
      return t('portal.welcome_personal', { name: personalName });
    } else {
      return t('portal.welcome_title');
    }
  };

  return (
    <ConsoleDashboard
      title={getWelcomeTitle()}
      bannerImage="/education.jpg"
      bannerImageAlt={t('manage_profile.business_meeting_alt')}
      tiles={dashboardTiles}
      currentPage="member-portal"
      defaultActiveTile="home"
    />
  );
}