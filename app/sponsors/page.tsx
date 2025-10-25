'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function SponsorsPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Strategic Partnership Opportunities',
      content: [
        'Partner with FASE to connect with Europe\'s leading MGAs, capacity providers, and insurance professionals. Our sponsorship opportunities provide direct access to key decision-makers across European insurance markets.',
        'From conference sponsorship to thought leadership platforms, we offer tailored partnership packages that align with your business objectives and market reach goals.'
      ],
      image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=400&fit=crop',
      imageAlt: 'Professional conference and networking',
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: 'Partnership Benefits',
      subtitle: 'Connect with Europe\'s most influential MGA community through strategic partnership opportunities.',
      cards: [
        {
          title: 'Network Access',
          description: 'Direct access to C-level executives from Europe\'s leading MGAs and capacity providers through exclusive networking events.',
          image: '/seated.jpg',
          imageAlt: 'Executive networking event'
        },
        {
          title: 'Thought Leadership',
          description: 'Position your organization as an industry leader through speaking opportunities and content partnerships.',
          image: '/airplane.jpeg',
          imageAlt: 'Industry leadership conference'
        },
        {
          title: 'Market Intelligence',
          description: 'Gain exclusive insights into European MGA market trends and opportunities through our research and events.',
          image: '/consideration.jpg',
          imageAlt: 'Market analysis and research'
        }
      ]
    },
    {
      type: 'split' as const,
      title: 'Partnership Packages',
      content: [
        'We offer flexible partnership packages designed to meet diverse business objectives and budgets. From title sponsorship of our annual conference to targeted digital marketing opportunities.',
        'Each partnership is tailored to provide maximum value and ROI, ensuring your organization gains meaningful exposure and connects with the right audience in European insurance markets.'
      ],
      image: '/market.jpg',
      imageAlt: 'Business partnership meeting',
      imagePosition: 'left' as const
    },
  ];

  return (
    <ContentPageLayout
      title="Partner with FASE"
      bannerImage="/training.jpg"
      bannerImageAlt="Strategic business partnership"
      sections={sections}
      currentPage="sponsors"
    />
  );
}