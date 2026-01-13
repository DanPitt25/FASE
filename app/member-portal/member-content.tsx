'use client';

import { useUnifiedAuth } from "../../contexts/UnifiedAuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Button from "../../components/Button";
import DashboardLayout from "../../components/DashboardLayout";
import ManageProfile from "../../components/ManageProfile";
import MemberMap from "../../components/MemberMap";
import MembershipDirectory from "../../components/MembershipDirectory";
import ContactButton from "../../components/ContactButton";
import { usePortalTranslations } from "./hooks/usePortalTranslations";
import Image from "next/image";

export default function MemberContent() {
  const { user, member, loading, hasMemberAccess } = useUnifiedAuth();
  const { t, loading: translationsLoading, translations, locale } = usePortalTranslations();

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
  const statusBadge = null;

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