'use client';

import ContentPageLayout from '../../components/ContentPageLayout';
import { useTranslations } from 'next-intl';

export default function ContactPage() {
  const t = useTranslations('contact');
  
  const sections = [
    {
      type: 'contact' as const,
      title: t('contact_info.title'),
      content: t.raw('contact_info.content')
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/airplane.jpeg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="contact"
    />
  );
}