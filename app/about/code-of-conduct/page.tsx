'use client';

import { useTranslations } from 'next-intl';
import ContentPageLayout from '../../../components/ContentPageLayout';

export default function CodeOfConductPage() {
  const t = useTranslations('code_of_conduct');
  const sections = [
    {
      type: 'content' as const,
      title: t('intro.title'),
      content: [
        t('intro.content.paragraph1'),
        t('intro.content.paragraph2'),
        t('intro.content.paragraph3')
      ]
    },
    {
      type: 'accordion' as const,
      title: t('sections.title'),
      items: [
        {
          title: t('sections.legal.title'),
          content: t('sections.legal.content')
        },
        {
          title: t('sections.financial.title'),
          content: t('sections.financial.content')
        },
        {
          title: t('sections.inter_org.title'),
          content: t('sections.inter_org.content')
        },
        {
          title: t('sections.community.title'),
          content: t('sections.community.content')
        },
        {
          title: t('sections.insurers.title'),
          content: t('sections.insurers.content')
        },
        {
          title: t('sections.brokers.title'),
          content: t('sections.brokers.content')
        }
      ]
    },
    {
      type: 'content' as const,
      title: t('reporting.title'),
      content: [
        t('reporting.content.paragraph1')
      ]
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/regulatory.jpg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="code-of-conduct"
    />
  );
}