'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function LeadershipPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Advisory Board',
      content: [
        'Our advisory board comprises distinguished industry leaders who guide FASE strategic direction and represent the diverse interests of the European MGA community.',
        'These experienced professionals bring decades of expertise in delegated underwriting, capacity provision, and regulatory affairs across European markets.'
      ],
      image: '/consideration.jpg',
      imageAlt: 'Business leadership and strategy',
      imagePosition: 'right' as const
    },
    {
      type: 'people' as const,
      title: 'Advisory Board Members',
      people: [
        {
          name: 'Advisory Board Member',
          role: 'Position Title',
          company: 'Company Name',
          bio: 'Advisory board member biographies will be announced as appointments are confirmed. We are assembling a distinguished group of industry leaders to guide FASE strategic initiatives.',
          image: '/seated.jpg'
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Leadership"
      bannerImage="/seminar.jpg"
      bannerImageAlt="FASE leadership team"
      sections={sections}
      currentPage="leadership"
    />
  );
}