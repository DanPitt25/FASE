'use client';

import { useTranslations } from 'next-intl';
import ContentPageLayout from '../../../components/ContentPageLayout';

export default function MissionPage() {
  const t = useTranslations('mission');
  const sections = [
    {
      type: 'split' as const,
      title: t('intro.title'),
      content: [
        t('intro.content.paragraph1'),
        t('intro.content.paragraph2'),
        t('intro.content.paragraph3'),
        t('intro.content.paragraph4')
      ],
      image: '/wires.jpeg',
      imageAlt: t('intro.image_alt'),
      imagePosition: 'right' as const
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/nightCity.jpeg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="mission"
    />
  );
}