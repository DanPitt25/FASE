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
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        },
        {
          title: 'Thought Leadership',
          description: 'Position your organization as an industry leader through speaking opportunities and content partnerships.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )
        },
        {
          title: 'Market Intelligence',
          description: 'Gain exclusive insights into European MGA market trends and opportunities through our research and events.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )
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
      image: '/AdobeStock_217797984.jpeg',
      imageAlt: 'Business partnership meeting',
      imagePosition: 'left' as const
    },
    {
      type: 'cta' as const,
      title: 'Ready to Partner?',
      subtitle: 'Connect with Europe\'s Leading MGA Community',
      description: 'Contact us to discuss partnership opportunities and learn how FASE can help you connect with Europe\'s most influential insurance professionals.',
      backgroundImage: '/corporate-towers-bg.png',
      buttons: [
        {
          text: 'Contact Us',
          href: '/contact',
          variant: 'primary' as const
        },
        {
          text: 'Learn More',
          href: '/about',
          variant: 'secondary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Partner with FASE"
      bannerImage="/AdobeStock_481244965.jpeg"
      bannerImageAlt="Strategic business partnership"
      sections={sections}
      currentPage="sponsors"
    />
  );
}