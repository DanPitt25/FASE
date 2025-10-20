'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function EventsPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Pan-European MGA Rendezvous',
      content: [
        'Our annual conference brings together MGAs, capacity providers and selected service providers to grow business within and across Europe. We are planning a comprehensive program that sets the standard for European MGA events.',
        'Our events are designed to foster the collaboration that MGAs depend on, recognizing that strong relationships with capacity providers – insurance and reinsurance companies and Lloyd\'s syndicates – are essential to sustain and grow their business.'
      ],
      image: '/AdobeStock_172545168.jpeg',
      imageAlt: 'European business conference',
      imagePosition: 'right' as const
    },
    {
      type: 'split' as const,
      title: 'Coming Soon',
      content: [
        'FASE events are currently in development. Join our community to be the first to know about upcoming conferences, networking opportunities, and professional development events.',
        'We are planning a comprehensive calendar of events designed to foster collaboration and growth across the European MGA ecosystem.'
      ],
      image: '/AdobeStock_481244965.jpeg',
      imageAlt: 'Future events and networking',
      imagePosition: 'left' as const,
      buttons: [
        {
          text: 'Join Us',
          href: '/join',
          variant: 'primary' as const
        },
        {
          text: 'Contact',
          href: '/contact',
          variant: 'secondary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Events"
      bannerImage="/AdobeStock_999103753.jpeg"
      bannerImageAlt="European cityscape and business district"
      sections={sections}
      currentPage="events"
    />
  );
}