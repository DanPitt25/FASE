'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function KnowledgePage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Empowering Professional Excellence',
      content: [
        'FASE\'s knowledge platform provides comprehensive resources for professional development, regulatory guidance, and industry best practices across European MGA markets.',
        'Our curated content helps members stay current with evolving regulations, master new skills, and implement proven strategies for sustainable growth in delegated underwriting.'
      ],
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop',
      imageAlt: 'Professional education and learning',
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: 'Knowledge Resources',
      cards: [
        {
          title: 'Regulatory Guidance',
          description: 'Up-to-date information on European insurance regulations, compliance requirements, and regulatory changes affecting MGAs.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        },
        {
          title: 'Best Practice Guides',
          description: 'Proven strategies and methodologies for successful MGA operations, risk management, and business development.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          )
        },
        {
          title: 'Market Intelligence',
          description: 'Research reports, market analysis, and insights into European insurance trends and opportunities.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          )
        }
      ]
    },
    {
      type: 'split' as const,
      title: 'Professional Development Platform',
      content: [
        'We are developing interactive learning modules, expert-led webinars, and collaborative forums where MGA professionals can share insights and solutions.',
        'Members have access to exclusive research, case studies, and professional development opportunities designed specifically for the European delegated underwriting market.'
      ],
      image: '/training.jpg',
      imageAlt: 'Digital learning platform',
      imagePosition: 'left' as const
    },
  ];

  return (
    <ContentPageLayout
      title="Knowledge Base"
      bannerImage="/conference.jpeg"
      bannerImageAlt="Professional knowledge and learning"
      sections={sections}
      currentPage="knowledge"
    />
  );
}