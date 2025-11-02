'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function RendezvousPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Pan-European MGA Rendezvous',
      content: [
        'Our annual conference brings together MGAs, capacity providers and selected service providers to grow business within and across Europe. We are planning a comprehensive program that sets the standard for European MGA events.',
        'Our events are designed to foster the collaboration that MGAs depend on, recognizing that strong relationships with capacity providers – insurance and reinsurance companies and Lloyd\'s syndicates – are essential to sustain and grow their business.'
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
        },
        {
          text: 'View All Events',
          href: '/events',
          variant: 'secondary' as const
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