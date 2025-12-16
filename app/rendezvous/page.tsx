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
      image: '/view.jpg',
      imageAlt: t('intro.image_alt'),
      imagePosition: 'right' as const,
      buttons: [
        {
          text: t('intro.button.text'),
          href: 'https://mgarendezvous.com/register',
          variant: 'primary' as const
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
      currentPage="rendezvous"
    />
  );
}