'use client';

import { useTranslations } from 'next-intl';
import ContentPageLayout from '../../../components/ContentPageLayout';

export default function NewsPage() {
  const t = useTranslations('news');
  const sections = [
    {
      type: 'split' as const,
      title: t('intro.title'),
      content: [
        t('intro.content.paragraph1'),
        t('intro.content.paragraph2')
      ],
      image: '/market.jpg',
      imageAlt: t('intro.image_alt'),
      imagePosition: 'left' as const
    },
    {
      type: 'cards' as const,
      title: t('latest_updates.title'),
      cards: [
        {
          title: t('latest_updates.cards.foundation.title'),
          description: t('latest_updates.cards.foundation.description'),
          image: '/motorcycle.jpeg',
          imageAlt: t('latest_updates.cards.foundation.image_alt')
        },
        {
          title: t('latest_updates.cards.advisory_board.title'),
          description: t('latest_updates.cards.advisory_board.description'),
          image: '/consideration.jpg',
          imageAlt: t('latest_updates.cards.advisory_board.image_alt')
        },
        {
          title: t('latest_updates.cards.platform_launch.title'),
          description: t('latest_updates.cards.platform_launch.description'),
          image: '/conference.jpeg',
          imageAlt: t('latest_updates.cards.platform_launch.image_alt')
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/conferenceWood.jpg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="news"
    />
  );
}