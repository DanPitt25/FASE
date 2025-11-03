'use client';

import { useTranslations } from 'next-intl';
import ContentPageLayout from '../../components/ContentPageLayout';

export default function AboutPage() {
  const t = useTranslations('about');
  const sections = [
    {
      type: 'split' as const,
      title: t('voice_for_innovators.title'),
      content: [
        t('voice_for_innovators.content.paragraph1'),
        t('voice_for_innovators.content.paragraph2')
      ],
      image: '/airplane.jpeg',
      imageAlt: t('voice_for_innovators.image_alt'),
      imagePosition: 'right' as const
    },
    {
      type: 'quote' as const,
      quote: t('quote.text'),
      author: t('quote.author'),
      title: t('quote.title')
    },
    {
      type: 'split' as const,
      title: t('building_connections.title'),
      content: [
        t('building_connections.content.paragraph1'),
        t('building_connections.content.paragraph2')
      ],
      image: '/gettingAlong.jpeg',
      imageAlt: t('building_connections.image_alt'),
      imagePosition: 'right' as const
    },
    {
      type: 'cta' as const,
      title: t('cta.title'),
      subtitle: undefined,
      description: t('cta.description'),
      backgroundImage: '/corporate-towers-bg.png',
      buttons: [
        {
          text: t('cta.buttons.become_member'),
          href: '/join',
          variant: 'primary' as const
        },
        {
          text: t('cta.buttons.contact_us'),
          href: '/contact',
          variant: 'secondary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/conference.jpeg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="about"
    />
  );
}