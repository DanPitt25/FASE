'use client';

import { useUnifiedAuth } from "../../contexts/UnifiedAuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "../../components/Button";
import DashboardLayout from "../../components/DashboardLayout";
import ManageProfile from "../../components/ManageProfile";
import MemberMap from "../../components/MemberMap";
import MembershipDirectory from "../../components/MembershipDirectory";
import ContactButton from "../../components/ContactButton";
import { getUserAlerts, markAlertAsRead, dismissAlert, Alert, UserAlert } from "../../lib/unified-messaging";
import { usePortalTranslations } from "./hooks/usePortalTranslations";

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

  // Dashboard sections
  const dashboardSections = [
    {
      id: 'overview',
      title: t('sections.overview'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-fase-light-gold rounded-lg p-6">
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
                          <img 
                            src="/FASE-Logo-Lockup-RGB.png" 
                            alt="FASE Logo Horizontal Lockup" 
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
                          <img 
                            src="/FASE-Logo-Lockup-Stacked-RGB.png" 
                            alt="FASE Logo Vertical Lockup" 
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
                        {t('logo_access.directory_description')} <ContactButton email="admin@fasemga.com" className="text-fase-navy hover:text-fase-navy underline font-medium">admin@fasemga.com</ContactButton>:
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
                  <p className="text-fase-black">
                    {t('overview.matching.description_1')}
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
      id: 'rendezvous',
      title: 'MGA Rendezvous 2026',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-fase-light-gold rounded-lg p-6">
            <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Reserve Your MGA Rendezvous Passes</h2>
            <p className="text-fase-black mb-6">
              As a FASE member, you receive a 50% discount on MGA Rendezvous passes. Reserve your passes now at member rates for the premier European MGA conference in Barcelona, May 11-12, 2026.
            </p>

            <div className="bg-fase-cream rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-fase-navy mb-4">Member Pricing (50% discount)</h3>
              <ul className="space-y-2 text-fase-black">
                <li>• MGAs: €800 → €400</li>
                <li>• Carriers & brokers: €1,100 → €550</li>
                <li>• Service providers: €1,400 → €700</li>
              </ul>
              <p className="text-sm text-gray-600 mt-4 italic">
                All prices exclude 21% Dutch VAT
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-fase-navy mb-4">Event Details</h3>
              <div className="space-y-3 text-fase-black">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-fase-navy mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="font-medium">May 11-12, 2026</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-fase-navy mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-medium">Hotel Arts Barcelona</p>
                    <p className="text-sm text-gray-600">Barcelona, Spain</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <a
                href={`https://mgarendezvous.com/register?email=${encodeURIComponent(user?.email || '')}&member=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-fase-navy text-white font-semibold rounded-lg hover:bg-fase-orange transition-colors"
              >
                Purchase Passes at Member Rates
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
              <p className="text-sm text-gray-600 mt-3">
                You'll be taken to the MGA Rendezvous registration page where you can verify your FASE membership and complete your purchase.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'alerts',
      title: t('sections.alerts'),
      icon: (
        <div className="relative">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 19c-5 0-8-2.5-8-6 0-5 4-9 9-9s9 4 9 9c0 .5-.1 1-.2 1.5" />
          </svg>
          {unreadAlerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              !
            </span>
          )}
        </div>
      ),
      content: (
        <div className="space-y-6">
          {loadingAlerts ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('alerts.no_alerts')}</h3>
              <p className="text-fase-black">{t('alerts.no_alerts_desc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <article 
                  key={alert.id} 
                  className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                    !alert.isRead ? 'border-fase-navy/20 bg-gray-50/30' : ''
                  }`}
                >
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy leading-tight">
                          {alert.title}
                        </h3>
                        {!alert.isRead && (
                          <span className="inline-block mt-1 text-xs font-medium text-fase-navy/70">
                            Unread
                          </span>
                        )}
                      </div>
                      
                      <span className="text-xs text-gray-500 ml-4">
                        {alert.createdAt?.toDate?.()?.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="px-6 py-4">
                    <div 
                      className="prose prose-sm prose-gray max-w-none leading-relaxed text-fase-black"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(alert.message) }}
                    />
                  </div>
                  
                  {/* Action button */}
                  {alert.actionUrl && alert.actionText && (
                    <div className="px-6 pb-4">
                      <a
                        href={alert.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-fase-navy hover:bg-gray-800 rounded transition-colors duration-200"
                      >
                        {alert.actionText}
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  
                  {/* Footer Actions */}
                  <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
                    <div className="flex justify-end space-x-4">
                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkAlertAsRead(alert.id)}
                          className="text-xs font-medium text-gray-600 hover:text-fase-navy transition-colors duration-200"
                        >
                          {t('alerts.mark_read')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDismissAlert(alert.id)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors duration-200"
                      >
                        {t('alerts.dismiss')}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'map',
      title: t('sections.map'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3v10" />
        </svg>
      ),
      content: (
        <MemberMap translations={{...(translations?.map || {}), locale}} />
      )
    },
    {
      id: 'directory',
      title: t('sections.directory'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <DashboardLayout
      title={getWelcomeTitle()}
      subtitle={user?.email || t('portal.email_subtitle')}
      bannerImage="/education.jpg"
      bannerImageAlt={t('manage_profile.business_meeting_alt')}
      sections={dashboardSections}
      currentPage="member-portal"
      statusBadge={statusBadge}
      defaultActiveSection="overview"
    />
  );
}