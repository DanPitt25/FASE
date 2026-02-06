'use client';

import { useTranslations } from 'next-intl';
import ContentPageLayout from '../../../components/ContentPageLayout';

export default function PeoplePage() {
  const t = useTranslations('people');
  const sections = [
    {
      type: 'people' as const,
      title: t('executive_team.title'),
      people: [
        {
          name: t('members.william_pitt.name'),
          role: t('members.william_pitt.role'),
          bio: t('members.william_pitt.bio'),
          image: '/WilliamPitt.jpg'
        },
        {
          name: t('members.aline_sullivan.name'),
          role: t('members.aline_sullivan.role'),
          bio: t('members.aline_sullivan.bio'),
          image: '/AlineSullivan.png'
        },
        {
          name: t('members.sandra_stojak.name'),
          role: t('members.sandra_stojak.role'),
          bio: t('members.sandra_stojak.bio'),
          image: '/SandraStojak.png'
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/glass.jpg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="people"
    />
  );
}