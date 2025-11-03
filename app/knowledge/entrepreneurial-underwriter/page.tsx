'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';
import { useTranslations } from 'next-intl';

export default function EntrepreneurialUnderwriterPage() {
  const t = useTranslations('entrepreneurial_underwriter');
  
  const sections = [
    {
      type: 'split' as const,
      title: t('intro.title'),
      content: t.raw('intro.content'),
      image: '/computer.jpeg',
      imageAlt: t('intro.image_alt'),
      imagePosition: 'left' as const
    },
    {
      type: 'cards' as const,
      title: t('featured_content.title'),
      cards: [
        {
          title: t('featured_content.market_analysis.title'),
          description: t('featured_content.market_analysis.description'),
          image: '/market.jpg',
          imageAlt: t('featured_content.market_analysis.image_alt')
        },
        {
          title: t('featured_content.case_studies.title'),
          description: t('featured_content.case_studies.description'),
          image: '/consideration.jpg',
          imageAlt: t('featured_content.case_studies.image_alt')
        },
        {
          title: t('featured_content.expert_insights.title'),
          description: t('featured_content.expert_insights.description'),
          image: '/seated.jpg',
          imageAlt: t('featured_content.expert_insights.image_alt')
        }
      ]
    },
    {
      type: 'quote' as const,
      quote: t('quote.text'),
      author: t('quote.author'),
      title: t('quote.title')
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/consideration.jpg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="entrepreneurial-underwriter"
    />
  );
}