'use client';

import { useTranslations } from 'next-intl';
import ContentPageLayout from '../../components/ContentPageLayout';

export default function RendezvousPage() {
  const t = useTranslations('rendezvous');
  const sections = [
    {
      type: 'split' as const,
      title: t('intro.title'),
      content: [
        t('intro.content.paragraph1')
      ],
      image: '/conference.jpeg',
      imageAlt: t('intro.image_alt'),
      imagePosition: 'right' as const
    },
    {
      type: 'split' as const,
      title: t('coming_soon.title'),
      content: [
        t('coming_soon.content.paragraph1'),
        t('coming_soon.content.paragraph2')
      ],
      image: '/airplane.jpeg',
      imageAlt: t('coming_soon.image_alt'),
      imagePosition: 'left' as const,
      buttons: [
        {
          text: t('coming_soon.button.text'),
          href: '/join',
          variant: 'primary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/airplane.jpeg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="rendezvous"
    />
  );
}