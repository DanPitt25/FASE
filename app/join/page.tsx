'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function JoinPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Membership applications',
      content: [
        'FASE membership is open to MGAs that have been in business for more than a year and underwrite more than €500,000 in annual premium.',
        'Membership is also open to insurance and reinsurance companies seeking to partner with European MGAs, and to service providers that support the sector.'
      ],
      image: '/seated.jpg',
      imageAlt: 'European business meeting',
      imagePosition: 'right' as const
    },
    {
      type: 'accordion' as const,
      title: 'FASE member benefits',
      items: [
        {
          title: 'Pan-European representation',
          content: 'Join a unified voice advocating for MGAs and delegated underwriting across Europe.'
        },
        {
          title: 'Networking & collaboration',
          content: 'Connect with MGA leaders, insurers, reinsurers, and service providers throughout Europe and beyond.'
        },
        {
          title: 'Annual MGA Rendezvous',
          content: 'Exclusive access to our flagship event — bringing together MGA professionals, market influencers, and partners from around the world.'
        },
        {
          title: 'Educational & insight sessions',
          content: 'Participate in workshops, webinars, and panels on regulatory trends, innovation, and best practices.'
        },
        {
          title: 'Industry intelligence',
          content: 'Receive regular updates on European MGA market developments, opportunities, and challenges.'
        },
        {
          title: 'Recognition & credibility',
          content: 'Strengthen your market reputation as part of a respected, forward-looking MGA association.'
        },
        {
          title: 'Opportunities for collaboration',
          content: 'Shape the future of delegated underwriting through working groups and cross-border initiatives.'
        }
      ]
    },
    {
      type: 'cards' as const,
      title: 'Membership categories',
      subtitle: 'Three distinct membership types reflect the diversity of the MGA ecosystem.',
      cards: [
        {
          title: 'MGA',
          description: 'MGAs transacting business in Europe for at least a year and with premium income in excess of €500,000.',
          image: '/seated.jpg',
          imageAlt: 'MGA business meeting',
          href: '/register?type=MGA',
          actionText: 'Apply as MGA'
        },
        {
          title: 'Carrier',
          description: 'Insurance or reinsurance companies or Lloyd\'s Managing Agencies transacting business with MGAs.',
          image: '/consideration.jpg',
          imageAlt: 'Market analysis and data',
          href: '/register?type=carrier',
          actionText: 'Apply as Carrier'
        },
        {
          title: 'Service provider',
          description: 'Service providers active within the MGA ecosystem.',
          image: '/training.jpg',
          imageAlt: 'Service provider collaboration',
          href: '/register?type=provider',
          actionText: 'Apply as Service Provider'
        }
      ]
    },
    {
      type: 'split' as const,
      title: 'Application process',
      content: [
        'To begin your application, complete our membership form with your organisation details and business information.',
        'Applications are reviewed by the FASE membership committee to ensure alignment with our community standards and objectives.'
      ],
      image: '/training.jpg',
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
      bannerImage="/conference.jpeg"
      bannerImageAlt="Join FASE membership"
      sections={sections}
      currentPage="join"
    />
  );
}