'use client';

import ContentPageLayout from '../../components/ContentPageLayout';
import { useTranslations } from 'next-intl';

export default function SponsorsPage() {
  const t = useTranslations('sponsors');
  
  const sections = [
    {
      type: 'split' as const,
      title: t('partnership_opportunities.title'),
      content: t.raw('partnership_opportunities.content'),
      image: '/glass.jpg',
      imageAlt: t('partnership_opportunities.image_alt'),
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: t('partnership_benefits.title'),
      subtitle: t('partnership_benefits.subtitle'),
      cards: [
        {
          title: t('partnership_benefits.network_access.title'),
          description: t('partnership_benefits.network_access.description'),
          image: '/seated.jpg',
          imageAlt: t('partnership_benefits.network_access.image_alt')
        },
        {
          title: t('partnership_benefits.thought_leadership.title'),
          description: t('partnership_benefits.thought_leadership.description'),
          image: '/airplane.jpeg',
          imageAlt: t('partnership_benefits.thought_leadership.image_alt')
        },
        {
          title: t('partnership_benefits.market_intelligence.title'),
          description: t('partnership_benefits.market_intelligence.description'),
          image: '/consideration.jpg',
          imageAlt: t('partnership_benefits.market_intelligence.image_alt')
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/training.jpg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="sponsors"
    />
  );
}