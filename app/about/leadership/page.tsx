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
      image: '/AdobeStock_374018940.jpeg',
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
          image: '/AdobeStock_172545168.jpeg'
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Leadership"
      bannerImage="/AdobeStock_999103753.jpeg"
      bannerImageAlt="FASE leadership team"
      sections={sections}
      currentPage="leadership"
    />
  );
}