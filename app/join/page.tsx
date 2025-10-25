'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function JoinPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Membership Applications',
      content: [
        'FASE membership is open to MGAs that have been in business for more than a year and underwrite more than €500,000 in annual premium.',
        'Membership is also open to insurance and reinsurance companies seeking to partner with European MGAs, and to service providers that support the sector.'
      ],
      image: '/AdobeStock_172545168.jpeg',
      imageAlt: 'European business meeting',
      imagePosition: 'right' as const
    },
    {
      type: 'accordion' as const,
      title: 'FASE Member Benefits',
      items: [
        {
          title: 'Pan-European Representation',
          content: 'Join a unified voice advocating for MGAs and delegated underwriting across Europe.'
        },
        {
          title: 'Networking & Collaboration',
          content: 'Connect with MGA leaders, insurers, reinsurers, and service providers throughout Europe and beyond.'
        },
        {
          title: 'Annual MGA Rendezvous',
          content: 'Exclusive access to our flagship event — bringing together MGA professionals, market influencers, and partners from around the world.'
        },
        {
          title: 'Educational & Insight Sessions',
          content: 'Participate in workshops, webinars, and panels on regulatory trends, innovation, and best practices.'
        },
        {
          title: 'Industry Intelligence',
          content: 'Receive regular updates on European MGA market developments, opportunities, and challenges.'
        },
        {
          title: 'Community Growth',
          content: 'Be part of one of the fastest-growing MGA associations globally, building influence and visibility.'
        },
        {
          title: 'Access to Resources',
          content: 'Members-only content including reports, benchmarking studies, and policy briefings.'
        },
        {
          title: 'LinkedIn Community Access',
          content: 'Stay connected with peers through our growing online professional network.'
        },
        {
          title: 'Recognition & Credibility',
          content: 'Strengthen your market reputation as part of a respected, forward-looking MGA association.'
        },
        {
          title: 'Opportunities for Collaboration',
          content: 'Shape the future of delegated underwriting through working groups and cross-border initiatives.'
        }
      ]
    },
    {
      type: 'cards' as const,
      title: 'Membership Categories',
      subtitle: 'Three distinct membership types to serve the European MGA ecosystem.',
      cards: [
        {
          title: 'MGA Member',
          description: 'Full membership for Managing General Agents operating in Europe. Includes voting rights, committee participation, and full access to resources.',
          image: '/AdobeStock_172545168.jpeg',
          imageAlt: 'MGA business meeting'
        },
        {
          title: 'Market Practitioner',
          description: 'For capacity providers, insurers, and reinsurers working with MGAs. Access to market intelligence, networking, and industry insights.',
          image: '/AdobeStock_374018940.jpeg',
          imageAlt: 'Market analysis and data'
        },
        {
          title: 'Supplier',
          description: 'For service providers supporting the MGA ecosystem. Business development access, sponsorship opportunities, and market visibility.',
          image: '/AdobeStock_481244965.jpeg',
          imageAlt: 'Service provider collaboration'
        }
      ]
    },
    {
      type: 'split' as const,
      title: 'Application Process',
      content: [
        'To begin your application, complete our membership form with your organisation details and business information.',
        'Applications are reviewed by the FASE membership committee to ensure alignment with our community standards and objectives.'
      ],
      image: '/AdobeStock_481244965.jpeg',
      imageAlt: 'Application process',
      imagePosition: 'left' as const,
      buttons: [
        {
          text: 'Join',
          href: '/register',
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
      title="Join FASE"
      bannerImage="/AdobeStock_999103753.jpeg"
      bannerImageAlt="Join FASE membership"
      sections={sections}
      currentPage="join"
    />
  );
}