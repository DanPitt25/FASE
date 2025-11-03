'use client';

import { useTranslations } from 'next-intl';
import ContentPageLayout from '../../components/ContentPageLayout';

export default function EventsPage() {
  const t = useTranslations('events');
  const sections = [
    {
      type: 'split' as const,
      title: t('intro.title'),
      content: [
        t('intro.content.paragraph1'),
        t('intro.content.paragraph2')
      ],
      image: '/hivan.jpg',
      imageAlt: t('intro.image_alt'),
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: t('features.title'),
      cards: [
        {
          title: t('features.cards.capacity.title'),
          description: t('features.cards.capacity.description'),
          image: '/consideration.jpg',
          imageAlt: t('features.cards.capacity.image_alt')
        },
        {
          title: t('features.cards.insights.title'),
          description: t('features.cards.insights.description'),
          image: '/training.jpg',
          imageAlt: t('features.cards.insights.image_alt')
        },
        {
          title: t('features.cards.development.title'),
          description: t('features.cards.development.description'),
          image: '/market.jpg',
          imageAlt: t('features.cards.development.image_alt')
        }
      ]
    },
    {
      type: 'cta' as const,
      title: t('cta.title'),
      subtitle: t('cta.subtitle'),
      description: t('cta.description'),
      backgroundImage: '/conferenceWood.jpg',
      buttons: [
        {
          text: t('cta.buttons.become_member'),
          href: '/join',
          variant: 'primary' as const
        },
        {
          text: t('cta.buttons.mga_rendezvous'),
          href: '/rendezvous',
          variant: 'secondary' as const
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
      currentPage="events"
    />
  );
}