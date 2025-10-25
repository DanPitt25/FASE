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
      title: 'News Categories',
      cards: [
        {
          title: 'Market Updates',
          description: 'Latest developments in European insurance markets, including regulatory changes, market opportunities, and industry trends.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )
        },
        {
          title: 'FASE Updates',
          description: 'News about FASE activities, member highlights, upcoming events, and organizational developments.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          )
        },
        {
          title: 'Industry Insights',
          description: 'Expert analysis, thought leadership, and perspectives on the future of delegated underwriting in Europe.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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