'use client';

import { useTranslations } from 'next-intl';
import ContentPageLayout from '../../components/ContentPageLayout';

export default function RendezvousPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'The MGA Rendezvous',
      content: [
        `FASE's annual conference, the MGA Rendezvous, offers European MGAs and insurers and reinsurers from around the world a unique opportunity to develop business opportunities together.

Over two days, the Rendezvous will bring MGAs, capacity providers and select service providers together in a structured format to build relationships and pursue profitable growth opportunities.

In 2026, the Rendezvous will take place at the Hotel Arts in Barcelona on May 11 and 12. To receive our brochure and updates on our plans for the Rendezvous, please register your interest below:`
      ],
      image: '/hotel_pool.jpeg',
      imageAlt: 'Hotel Arts Barcelona pool with Barcelona cityscape',
      imagePosition: 'right' as const,
      buttons: [
        {
          text: 'Register Your Interest',
          href: 'https://mga-rendezvous.fasemga.com/register',
          variant: 'primary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="The MGA Rendezvous"
      bannerImage="/hotel_pool.jpeg"
      bannerImageAlt="Hotel Arts Barcelona pool with Barcelona cityscape"
      sections={sections}
    />
  );
}