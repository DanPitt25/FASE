'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function MissionPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Our mission & market impact',
      content: [
        'FASE represents the interests of MGAs doing business across Europe, including the European Economic Area, the United Kingdom, Switzerland, eastern European countries not currently within the EEA, and Turkey.',
        'Our mission is to provide a forum and a voice for MGAs across Europe:',
        '• A forum for MGAs to expand relationships with capacity providers, distributors, investors, and service providers.',
        '• A voice to raise awareness of the crucial role MGAs play in building a dynamic, innovative and responsive European insurance market.',
        'More than 600 MGAs currently do business in Europe, transacting at least €18 billion in annual premium and frequently growing at high double-digit rates. Powerful growth drivers have spurred the rapid expansion of MGA markets globally. But within Europe, there are local brakes on the sector\'s growth. A vibrant European MGA federation can help accelerate the market\'s development.'
      ],
      image: '/wires.jpeg',
      imageAlt: 'European insurance network connections',
      imagePosition: 'right' as const
    }
  ];

  return (
    <ContentPageLayout
      title="Mission"
      bannerImage="/nightCity.jpeg"
      bannerImageAlt="Modern European business landscape"
      sections={sections}
      currentPage="mission"
    />
  );
}