'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function AboutPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'A Voice for Europe\'s insurance innovators',
      content: [
        'FASE is pan-European federation established to serve the needs of Europe\'s managing general agents, connecting them with insurance capacity providers, distributors, investors and service providers.',
        'We share best practices in a rapidly growing sector of the market, offering an array of informational and educational services for MGAs through webinars, bulletins and our monthly digital magazine, The Entrepreneurial Underwriter.'
      ],
      image: '/airplane.jpeg',
      imageAlt: 'European insurance innovators',
      imagePosition: 'right' as const
    },
    {
      type: 'quote' as const,
      quote: 'The MGA model is gaining momentum globally, and we expect this trend to continue, particularly in Europe. Well-managed and highly professional MGA associations can play a pivotal role in contributing to sector\'s growth. We see FASE stepping into this space to enhance and strengthen the MGA ecosystem across Europe.',
      author: 'Olaf Jonda',
      title: 'CEO, DUAL Europe'
    },
    {
      type: 'split' as const,
      title: 'Building connections across Europe',
      content: [
        'MGAs bring product innovation and a very high standard of customer service to the markets they serve. But they depend on close relationships with capacity providers – insurance and reinsurance companies and Lloyd\'s syndicates – to sustain their business.',
        'FASE offers opportunities for MGAs from across Europe to broaden their relationships with capacity providers and distributors through a series of events, including the pan-European MGA Rendezvous.'
      ],
      image: '/gettingAlong.jpeg',
      imageAlt: 'Professional networking event',
      imagePosition: 'right' as const
    },
    {
      type: 'cta' as const,
      title: 'Ready to Join FASE?',
      subtitle: undefined,
      description: 'Applications for FASE membership are open to MGAs that have been in business for more than a year and underwrite more than €500,000 in annual premium. Membership is also open to insurance and reinsurance companies seeking to partner with European MGAs, and to service providers that support the sector.',
      backgroundImage: '/corporate-towers-bg.png',
      buttons: [
        {
          text: 'Become a Member',
          href: '/join',
          variant: 'primary' as const
        },
        {
          text: 'Contact Us',
          href: '/contact',
          variant: 'secondary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="About FASE"
      bannerImage="/conference.jpeg"
      bannerImageAlt="Modern European cityscape"
      sections={sections}
      currentPage="about"
    />
  );
}