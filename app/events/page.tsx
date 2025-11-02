'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function EventsPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'FASE Events',
      content: [
        'Our flagship networking event brings together MGAs, capacity providers, and selected service providers from across Europe to foster collaboration and grow business relationships.',
        'FASE events create opportunities for meaningful connections that drive the European delegated underwriting market forward.'
      ],
      image: '/seated.jpg',
      imageAlt: 'European business networking event',
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: 'Event Features',
      cards: [
        {
          title: 'Capacity Matching',
          description: 'Direct introductions between MGAs seeking capacity and providers looking for quality business opportunities across European markets.',
          image: '/consideration.jpg',
          imageAlt: 'Business matching'
        },
        {
          title: 'Market Insights',
          description: 'Expert panels and presentations on European regulatory developments, market trends, and emerging opportunities in delegated underwriting.',
          image: '/training.jpg',
          imageAlt: 'Market analysis'
        },
        {
          title: 'Professional Development',
          description: 'Educational sessions and workshops designed specifically for MGA professionals operating in the European marketplace.',
          image: '/market.jpg',
          imageAlt: 'Professional development'
        }
      ]
    },
    {
      type: 'cta' as const,
      title: 'Join Our Events',
      subtitle: 'Connect with the European MGA Community',
      description: 'Registration details and event schedules will be announced to FASE members. Become a member to secure your place at our premier networking events.',
      backgroundImage: '/conferenceWood.jpg',
      buttons: [
        {
          text: 'Become a Member',
          href: '/join',
          variant: 'primary' as const
        },
        {
          text: 'Learn More About Rendezvous',
          href: '/networking/rendezvous',
          variant: 'secondary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Events"
      bannerImage="/conferenceWood.jpg"
      bannerImageAlt="European cityscape and business district"
      sections={sections}
      currentPage="events"
    />
  );
}