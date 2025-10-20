'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function EntrepreneurialUnderwriterPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'The Entrepreneurial Underwriter',
      content: [
        'Dedicated content for MGAs and delegated underwriting professionals who drive innovation and growth in the European insurance marketplace.',
        'Explore insights, case studies, and practical guidance specifically designed for entrepreneurial professionals shaping the future of European delegated underwriting.'
      ],
      image: '/AdobeStock_481244965.jpeg',
      imageAlt: 'Entrepreneurial underwriting insights',
      imagePosition: 'left' as const
    },
    {
      type: 'cards' as const,
      title: 'Featured Content',
      subtitle: 'Resources for entrepreneurial underwriting professionals',
      cards: [
        {
          title: 'Market Analysis',
          description: 'In-depth analysis of European delegated underwriting trends, regulatory developments, and emerging opportunities for MGAs.',
          image: '/AdobeStock_217797984.jpeg',
          imageAlt: 'Market analysis'
        },
        {
          title: 'Case Studies',
          description: 'Real-world examples of successful MGA strategies, innovative underwriting approaches, and effective capacity relationships.',
          image: '/AdobeStock_374018940.jpeg',
          imageAlt: 'Business case studies'
        },
        {
          title: 'Expert Insights',
          description: 'Perspectives from industry leaders on building sustainable MGA businesses and navigating European regulatory environments.',
          image: '/AdobeStock_172545168.jpeg',
          imageAlt: 'Expert insights'
        }
      ]
    },
    {
      type: 'quote' as const,
      quote: 'The entrepreneurial spirit of MGAs drives innovation across European insurance markets, creating value for capacity providers and end customers alike.',
      author: 'William Pitt',
      title: 'Executive Director, FASE'
    }
  ];

  return (
    <ContentPageLayout
      title="Entrepreneurial Underwriter"
      bannerImage="/AdobeStock_999103753.jpeg"
      bannerImageAlt="Entrepreneurial underwriting"
      sections={sections}
      currentPage="entrepreneurial-underwriter"
    />
  );
}