'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function EventsPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Connecting Europe\'s Insurance Community',
      content: [
        'FASE events bring together MGAs, capacity providers, distributors, and service partners from across Europe for meaningful networking and business development opportunities.',
        'Our conferences and meetings are designed to foster collaboration, share market insights, and strengthen the relationships that drive innovation in delegated underwriting.'
      ],
      image: 'https://images.unsplash.com/photo-1511795409834-432f7b76a8c0?w=600&h=400&fit=crop',
      imageAlt: 'Professional conference networking',
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: 'Event Types',
      subtitle: 'Diverse opportunities to connect, learn, and grow within the European MGA community.',
      cards: [
        {
          title: 'Annual Conference',
          description: 'Our flagship event bringing together industry leaders for strategic discussions, market insights, and extensive networking opportunities.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        },
        {
          title: 'Regional Meetups',
          description: 'Smaller, focused gatherings in key European markets for deeper conversations and local market insights.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )
        },
        {
          title: 'Digital Workshops',
          description: 'Online sessions focused on professional development, regulatory updates, and emerging market trends.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )
        }
      ]
    },
    {
      type: 'split' as const,
      title: 'Coming Soon',
      content: [
        'Our inaugural conference will be announced once FASE officially launches. We are planning a comprehensive program that will set the standard for European MGA events.',
        'Stay connected with FASE for updates on upcoming events, registration information, and exclusive member benefits.'
      ],
      image: '/AdobeStock_1606166593.jpeg',
      imageAlt: 'Business professionals planning',
      imagePosition: 'left' as const
    },
    {
      type: 'cta' as const,
      title: 'Stay Informed',
      subtitle: 'Be the First to Know About FASE Events',
      description: 'Join our community to receive exclusive updates about upcoming conferences, regional meetups, and professional development opportunities.',
      backgroundImage: '/corporate-towers-bg.png',
      buttons: [
        {
          text: 'Join FASE',
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
      title="Events"
      bannerImage="/AdobeStock_172545168.jpeg"
      bannerImageAlt="Professional conference setting"
      sections={sections}
      currentPage="events"
    />
  );
}