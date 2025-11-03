'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function EntrepreneurialUnderwriterPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'The Entrepreneurial Underwriter',
      content: [
        'Beginning in 2026, the Entrepreneurial Underwriter – our flagship publication – will gather insights and practical guidance for entrepreneurs who are shaping the future of European delegated underwriting.'
      ],
      image: '/computer.jpeg',
      imageAlt: 'Entrepreneurial underwriting insights',
      imagePosition: 'left' as const
    },
    {
      type: 'cards' as const,
      title: 'Featured Content',
      cards: [
        {
          title: 'Market Analysis',
          description: 'In-depth analysis of European delegated underwriting trends, regulatory developments, and emerging opportunities for MGAs.',
          image: '/market.jpg',
          imageAlt: 'Market analysis'
        },
        {
          title: 'Case Studies',
          description: 'Real-world examples of successful MGA strategies, innovative underwriting approaches, and effective capacity relationships.',
          image: '/consideration.jpg',
          imageAlt: 'Business case studies'
        },
        {
          title: 'Expert Insights',
          description: 'Perspectives from industry leaders on building sustainable MGA businesses and navigating European regulatory environments.',
          image: '/seated.jpg',
          imageAlt: 'Expert insights'
        }
      ]
    },
    {
      type: 'quote' as const,
      quote: 'Delegated authority underwriting has become the most entrepreneurial sector of the insurance market. Our goal at FASE is to marshal the resources to help entrepreneurial underwriters succeed.',
      author: 'William Pitt',
      title: 'Executive Director, FASE'
    }
  ];

  return (
    <ContentPageLayout
      title="Entrepreneurial Underwriter"
      bannerImage="/consideration.jpg"
      bannerImageAlt="Entrepreneurial underwriting"
      sections={sections}
      currentPage="entrepreneurial-underwriter"
    />
  );
}