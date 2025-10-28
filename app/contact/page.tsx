'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function ContactPage() {
  const sections = [
    {
      type: 'contact' as const,
      title: 'Contact Information',
      content: [
        'Federation of European MGAs (FASE)'
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Contact Us"
      bannerImage="/airplane.jpeg"
      bannerImageAlt="Professional communication and contact"
      sections={sections}
      currentPage="contact"
    />
  );
}