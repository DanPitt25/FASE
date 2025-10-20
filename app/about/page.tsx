'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function AboutPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'A Voice for Europe\'s Insurance Innovators',
      content: [
        'FASE launched as a pan-European federation to serve the needs of Europe\'s managing general agents, connecting them with insurance capacity providers, distributors, investors and service providers.',
        'We share best practices in a rapidly growing sector of the market, offering a wide array of informational and educational services for MGAs through webinars, bulletins and our monthly digital magazine, The Entrepreneurial Underwriter.'
      ],
      image: '/AdobeStock_1606166593.jpeg',
      imageAlt: 'European insurance innovators',
      imagePosition: 'right' as const
    },
    {
      type: 'split' as const,
      title: 'Our Mission & Market Impact',
      content: [
        'FASE represents the interests of MGAs doing business across Europe, including the European Economic Area, the United Kingdom, Switzerland, eastern European countries not currently within the EEA, and Turkey. Our mission is to provide a forum for MGAs to expand relationships with capacity providers, distributors, investors, and service providers.',
        'More than 600 MGAs currently do business in Europe, transacting at least €18 billion in annual premium and growing at double digit rates. In recent years, many large MGAs have attracted substantial private equity investments, drawn by their fee-based revenue model, advanced risk pricing capabilities, and strong growth potential in underserved insurance markets.'
      ],
      image: '/AdobeStock_374018940.jpeg',
      imageAlt: 'European market growth and investment',
      imagePosition: 'left' as const
    },
    {
      type: 'quote' as const,
      quote: 'As our members look to grow their business, they are sometimes hampered by regulatory obstacles, data gaps, and capacity constraints. FASE can help.',
      author: 'Dario Spata',
      title: 'President, ASASE'
    },
    {
      type: 'split' as const,
      title: 'Leadership & Governance',
      content: [
        'FASE is managed by an executive team guided by an advisory board comprising representatives of MGAs and national MGA associations, alongside representatives of major capacity providers.',
        'Our advisory board includes leaders from established associations like the MGAA (UK), ASASE (Spain), and industry executives from across Europe, ensuring diverse perspectives and expertise guide our strategic direction.'
      ],
      image: '/AdobeStock_172545168.jpeg',
      imageAlt: 'Business leadership meeting',
      imagePosition: 'left' as const
    },
    {
      type: 'split' as const,
      title: 'Building Connections Across Europe',
      content: [
        'MGAs bring product innovation and a very high standard of customer service to the markets they serve. But they depend on close relationships with capacity providers – insurance and reinsurance companies and Lloyd\'s syndicates – to sustain their business.',
        'FASE offers opportunities for MGAs from across Europe to broaden their relationships with capacity providers and distributors through a series of events, including the pan-European MGA Rendezvous.'
      ],
      image: '/AdobeStock_481244965.jpeg',
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
      bannerImage="/AdobeStock_999103753.jpeg"
      bannerImageAlt="Modern European cityscape"
      sections={sections}
      currentPage="about"
    />
  );
}