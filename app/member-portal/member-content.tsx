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
        
        setAlerts(userAlerts);
      } catch (error) {
      } finally {
        setLoadingAlerts(false);
      }
    };

    loadData();
  }, [user, member]);


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
                <div key={alert.id} className={`border rounded-lg p-4 ${
                  alert.type === 'error' ? 'bg-red-50 border-red-200' :
                  alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  alert.type === 'success' ? 'bg-green-50 border-green-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-medium ${
                      alert.type === 'error' ? 'text-red-900' :
                      alert.type === 'warning' ? 'text-yellow-900' :
                      alert.type === 'success' ? 'text-green-900' :
                      'text-blue-900'
                    }`}>
                      {alert.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        alert.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        alert.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {t(`alerts.priority.${alert.priority}`)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        alert.type === 'error' ? 'bg-red-100 text-red-800' :
                        alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        alert.type === 'success' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {t(`alerts.types.${alert.type}`)}
                      </span>
                    </div>
                  </div>
                  
                  <p className={`text-sm mb-3 ${
                    alert.type === 'error' ? 'text-red-800' :
                    alert.type === 'warning' ? 'text-yellow-800' :
                    alert.type === 'success' ? 'text-green-800' :
                    'text-blue-800'
                  }`}>
                    {alert.message}
                  </p>
                  
                  {alert.actionUrl && alert.actionText && (
                    <div className="mb-3">
                      <a
                        href={alert.actionUrl}
                        className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
                          alert.type === 'error' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                          alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                          alert.type === 'success' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                          'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                      >
                        {alert.actionText}
                      </a>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {alert.createdAt?.toDate?.()?.toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkAlertAsRead(alert.id)}
                          className={`text-xs font-medium ${
                            alert.type === 'error' ? 'text-red-600 hover:text-red-800' :
                            alert.type === 'warning' ? 'text-yellow-600 hover:text-yellow-800' :
                            alert.type === 'success' ? 'text-green-600 hover:text-green-800' :
                            'text-blue-600 hover:text-blue-800'
                          }`}
                        >
                          {t('alerts.mark_read')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDismissAlert(alert.id)}
                        className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                      >
                        {t('alerts.dismiss')}
                      </button>
                    </div>
                  </div>
                </div>
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
    if (!user?.displayName && !member?.personalName) {
      return t('portal.welcome_title');
    }
    
    const personalName = member?.personalName || user?.displayName || "";
    const companyName = member?.organizationName;
    
    if (personalName && companyName && member?.membershipType === 'corporate') {
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