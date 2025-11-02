'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function NewsPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Staying Connected to European Insurance Markets',
      content: [
        'FASE provides timely news and insights about the European MGA landscape, regulatory developments, and market trends that impact our community.',
        'Our news platform will keep members informed about industry developments, FASE activities, and opportunities for professional growth and collaboration.'
      ],
      image: '/conference.jpeg',
      imageAlt: 'Business news and analysis',
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: 'Upcoming Announcements',
      cards: [
        {
          title: 'Inaugural Webinar Series',
          description: 'FASE will launch its first educational webinar series, featuring expert panels on European regulatory frameworks and best practices for MGA operations across EU markets.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )
        },
        {
          title: 'Pan-European Rendezvous',
          description: 'Details about FASE\'s flagship networking event will be announced soon, bringing together MGAs, capacity providers, and service companies from across Europe.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        },
        {
          title: 'Member Spotlights',
          description: 'Regular features highlighting FASE members, their innovative approaches to underwriting, and their contributions to the European insurance landscape.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          )
        }
      ]
    },
    {
      type: 'split' as const,
      title: 'Coming Soon',
      content: [
        'News and updates will be available once FASE is officially launched. We are preparing a comprehensive news platform that will serve as your primary source for European MGA industry information.',
        'Stay connected with FASE for the latest developments in delegated underwriting, regulatory updates, and exclusive member insights.'
      ],
      image: '/earlyMorning.jpg',
      imageAlt: 'Digital news platform',
      imagePosition: 'left' as const
    }
  ];

  return (
    <ContentPageLayout
      title="News"
      bannerImage="/consideration.jpg"
      bannerImageAlt="Business news and media"
      sections={sections}
      currentPage="news"
    />
  );
}