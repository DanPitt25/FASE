'use client';

import ContentPageLayout from '../../components/ContentPageLayout';
import { useTranslations } from 'next-intl';

export default function WebinarsPage() {
  const t = useTranslations('webinars');
  
  const sections = [
    {
      type: 'split' as const,
      title: t('intro.title'),
      content: t.raw('intro.content'),
      image: '/seminar.jpg',
      imageAlt: t('intro.image_alt'),
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: t('upcoming_webinars.title'),
      cards: [
        {
          title: t('upcoming_webinars.regulatory_hurdles.title'),
          description: t('upcoming_webinars.regulatory_hurdles.description'),
          image: '/regulatory.jpg',
          imageAlt: t('upcoming_webinars.regulatory_hurdles.image_alt')
        },
        {
          title: t('upcoming_webinars.capital_structures.title'),
          description: t('upcoming_webinars.capital_structures.description'),
          image: '/conferenceWood.jpg',
          imageAlt: t('upcoming_webinars.capital_structures.image_alt')
        },
        {
          title: t('upcoming_webinars.ai_promise_peril.title'),
          description: t('upcoming_webinars.ai_promise_peril.description'),
          image: '/data.jpg',
          imageAlt: t('upcoming_webinars.ai_promise_peril.image_alt')
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
      currentPage="webinars"
    />
  );
}