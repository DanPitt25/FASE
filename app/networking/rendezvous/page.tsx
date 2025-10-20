'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function RendezvousPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Pan-European MGA Rendezvous',
      content: [
        'Our flagship networking event brings together MGAs, capacity providers, and selected service providers from across Europe to foster collaboration and grow business relationships.',
        'The Rendezvous creates opportunities for meaningful connections that drive the European delegated underwriting market forward.'
      ],
      image: '/AdobeStock_172545168.jpeg',
      imageAlt: 'European business networking event',
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: 'Event Features',
      subtitle: 'What to expect at the FASE Rendezvous',
      cards: [
        {
          title: 'Capacity Matching',
          description: 'Direct introductions between MGAs seeking capacity and providers looking for quality business opportunities across European markets.',
          image: '/AdobeStock_374018940.jpeg',
          imageAlt: 'Business matching'
        },
        {
          title: 'Market Insights',
          description: 'Expert panels and presentations on European regulatory developments, market trends, and emerging opportunities in delegated underwriting.',
          image: '/AdobeStock_481244965.jpeg',
          imageAlt: 'Market analysis'
        },
        {
          title: 'Professional Development',
          description: 'Educational sessions and workshops designed specifically for MGA professionals operating in the European marketplace.',
          image: '/AdobeStock_217797984.jpeg',
          imageAlt: 'Professional development'
        }
      ]
    },
    {
      type: 'cta' as const,
      title: 'Join the Rendezvous',
      subtitle: 'Connect with the European MGA Community',
      description: 'Registration details and event schedule will be announced to FASE members. Become a member to secure your place at this premier networking event.',
      backgroundImage: '/AdobeStock_1406443128.jpeg',
      buttons: [
        {
          text: 'Become a Member',
          href: '/join',
          variant: 'primary' as const
        },
        {
          text: 'Learn More',
          href: '/events',
          variant: 'secondary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Rendezvous"
      bannerImage="/AdobeStock_1606166593.jpeg"
      bannerImageAlt="Pan-European MGA networking"
      sections={sections}
      currentPage="rendezvous"
    />
  );
}