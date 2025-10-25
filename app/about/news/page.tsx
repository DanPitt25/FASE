'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function NewsPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'FASE News & Updates',
      content: [
        'Stay informed about FASE developments, industry insights, and opportunities for professional growth and collaboration across the European MGA community.',
        'Our news platform serves as your primary source for European delegated underwriting industry information, regulatory updates, and organizational announcements.'
      ],
      image: '/market.jpg',
      imageAlt: 'Industry news and updates',
      imagePosition: 'left' as const
    },
    {
      type: 'cards' as const,
      title: 'Latest Updates',
      cards: [
        {
          title: 'FASE Foundation',
          description: 'William Pitt establishes FASE to serve the rapidly growing European MGA sector, addressing the need for pan-European representation and collaboration.',
          image: '/seated.jpg',
          imageAlt: 'FASE foundation announcement'
        },
        {
          title: 'Advisory Board Formation',
          description: 'Distinguished industry leaders join FASE advisory board to guide strategic direction and represent diverse MGA community interests.',
          image: '/consideration.jpg',
          imageAlt: 'Advisory board formation'
        },
        {
          title: 'Membership Platform Launch',
          description: 'FASE member portal goes live, providing registration, directory services, and exclusive resources for European MGA professionals.',
          image: '/training.jpg',
          imageAlt: 'Platform launch'
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="News"
      bannerImage="/conferenceWood.jpg"
      bannerImageAlt="FASE news and updates"
      sections={sections}
      currentPage="news"
    />
  );
}