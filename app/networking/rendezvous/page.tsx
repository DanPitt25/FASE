'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function RendezvousPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Pan-European MGA Rendezvous',
      content: [
        'Over two days, our annual Spring conference will bring together MGAs, capacity providers and selected service providers to expand business opportunities across Europe. Our primary focus will be on fostering networking and relationship-building opportunities, but we are also planning an event programme that sets the standard for European MGA events.'
      ],
      image: '/conference.jpeg',
      imageAlt: 'European business conference',
      imagePosition: 'right' as const
    },
    {
      type: 'split' as const,
      title: 'Coming Soon',
      content: [
        'The FASE Rendezvous is currently in development. Join our community to be the first to know about this upcoming flagship networking opportunity.',
        'We are planning a comprehensive program designed to foster collaboration and growth across the European MGA ecosystem.'
      ],
      image: '/airplane.jpeg',
      imageAlt: 'Future networking event',
      imagePosition: 'left' as const,
      buttons: [
        {
          text: 'Join Us',
          href: '/join',
          variant: 'primary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Rendezvous"
      bannerImage="/airplane.jpeg"
      bannerImageAlt="Pan-European MGA networking"
      sections={sections}
      currentPage="rendezvous"
    />
  );
}