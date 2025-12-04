'use client';

import { useTranslations } from 'next-intl';
import ContentPageLayout from '../../components/ContentPageLayout';

export default function PrivacyPolicyPage() {
  const t = useTranslations('register_form.data_notice');
  
  const sections = [
    {
      type: 'custom' as const,
      content: (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-noto-serif font-medium text-fase-navy mb-4">
              {t('data_protection_notice')}
            </h2>
            
            <p className="mb-6 text-fase-black">
              {t('controller')}
            </p>
            
            <p className="mb-6 text-fase-black">
              {t('purpose')}
            </p>
            
            <h3 className="text-xl font-noto-serif font-medium text-fase-navy mb-4">
              {t('legal_basis.title')}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-6 text-fase-black">
              <li><strong>{t('legal_basis.contractual')}</strong></li>
              <li><strong>{t('legal_basis.legitimate')}</strong></li>
              <li><strong>{t('legal_basis.legal')}</strong></li>
              <li><strong>{t('legal_basis.consent')}</strong></li>
            </ul>
            
            <h3 className="text-xl font-noto-serif font-medium text-fase-navy mb-4">
              {t('data_sharing_title')}
            </h3>
            <p className="mb-6 text-fase-black">
              {t('sharing')}
            </p>
            
            <h3 className="text-xl font-noto-serif font-medium text-fase-navy mb-4">
              {t('retention_title')}
            </h3>
            <p className="mb-6 text-fase-black">
              {t('retention')}
            </p>
            
            <h3 className="text-xl font-noto-serif font-medium text-fase-navy mb-4">
              {t('rights.title')}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-6 text-fase-black">
              <li>{t('rights.access')}</li>
              <li>{t('rights.rectify')}</li>
              <li>{t('rights.erase')}</li>
              <li>{t('rights.restrict')}</li>
              <li>{t('rights.portability')}</li>
              <li>{t('rights.withdraw')}</li>
              <li>{t('rights.complain')}</li>
            </ul>
            
            <h3 className="text-xl font-noto-serif font-medium text-fase-navy mb-4">
              {t('contact_title')}
            </h3>
            <p className="text-fase-black">
              {t('contact')}
            </p>
          </div>
        </div>
      )
    }
  ];
  
  return (
    <ContentPageLayout 
      title={t('page_title')}
      bannerImage="/corporate-building-bg.png"
      bannerImageAlt="Privacy policy background"
      sections={sections}
      currentPage="privacy"
    />
  );
}