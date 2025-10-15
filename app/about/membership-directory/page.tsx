'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function MembershipDirectoryPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Connect with Europe\'s MGA Community',
      content: [
        'FASE\'s member directory showcases the diverse community of MGAs, capacity providers, and service partners across Europe. Discover new business opportunities and connect with industry professionals.',
        'Our comprehensive directory features advanced search capabilities, detailed member profiles, and direct connection tools to help you build meaningful business relationships.'
      ],
      image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=400&fit=crop',
      imageAlt: 'Professional networking directory',
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: 'Directory Features',
      subtitle: 'Comprehensive tools to help you connect with the right partners and opportunities.',
      cards: [
        {
          title: 'Advanced Search',
          description: 'Filter by location, specialties, member type, lines of business, and more to find exactly the partners you need.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )
        },
        {
          title: 'Direct Connection',
          description: 'Access member contact information and website links to establish direct business connections.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        },
        {
          title: 'Market Intelligence',
          description: 'Access member market data, lines of business, and geographic presence to identify opportunities.',
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
      title: 'Growing European Network',
      content: [
        'Our directory represents a growing network of insurance professionals from across Europe, with members spanning 20+ countries and covering diverse specialties and markets.',
        'From traditional insurance lines to emerging risks and technologies, FASE members represent the full spectrum of European delegated underwriting expertise.'
      ],
      image: '/AdobeStock_374018940.jpeg',
      imageAlt: 'European business network',
      imagePosition: 'left' as const
    },
    {
      type: 'cta' as const,
      title: 'Access the Directory',
      subtitle: 'Connect with Europe\'s Leading Insurance Professionals',
      description: 'Join FASE to access our comprehensive member directory and start building valuable business relationships across European markets.',
      backgroundImage: '/corporate-towers-bg.png',
      buttons: [
        {
          text: 'View Directory',
          href: '/directory',
          variant: 'primary' as const
        },
        {
          text: 'Join FASE',
          href: '/join',
          variant: 'secondary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Member Directory"
      bannerImage="/AdobeStock_217797984.jpeg"
      bannerImageAlt="Professional business directory"
      sections={sections}
      currentPage="membership-directory"
    />
  );
}