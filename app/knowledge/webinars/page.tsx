'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function WebinarsPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Expert-Led Webinar Series',
      content: [
        'Our webinar series focusses on the most press needs of European MGA professionals featuring industry experts and thought leaders. Areas of focus will include regulatory challenges, recruitment, data management issues, and professional standards.'
      ],
      image: '/seminar.jpg',
      imageAlt: 'Online learning and webinars',
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: 'Upcoming Webinars',
      cards: [
        {
          title: 'Regulatory Hurdles',
          description: 'Market by market analysis of the regulatory landscape for MGAs and how to overcome regulatory barriers.',
          image: '/regulatory.jpg',
          imageAlt: 'Regulatory compliance'
        },
        {
          title: 'Capital Structures and Incentives',
          description: 'Advice on how to optimise alignment with capacity providers to secure durable capacity.',
          image: '/conferenceWood.jpg',
          imageAlt: 'Business relationships'
        },
        {
          title: 'AI: The Promise and the Peril',
          description: 'AI promises huge gains for MGAs in operational efficiency, risk pricing, and improving the broker and customer experience. But some use cases are more speculative than others.',
          image: '/data.jpg',
          imageAlt: 'Digital transformation'
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Webinar Series"
      bannerImage="/training.jpg"
      bannerImageAlt="FASE webinar series"
      sections={sections}
      currentPage="webinars"
    />
  );
}