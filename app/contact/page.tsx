'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function ContactPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Get in Touch',
      content: [
        'We welcome inquiries from MGAs, capacity providers, service partners, and industry professionals interested in joining Europe\'s premier delegated underwriting community.',
        'Whether you have questions about membership, partnership opportunities, or want to learn more about FASE, our team is here to help you connect with the future of European insurance.'
      ],
      image: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=600&h=400&fit=crop',
      imageAlt: 'Professional communication',
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: 'Contact Information',
      subtitle: 'Multiple ways to connect with the FASE team and learn more about our community.',
      cards: [
        {
          title: 'General Inquiries',
          description: 'For general questions about FASE, membership information, or how to get involved with our community.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )
        },
        {
          title: 'Partnership Opportunities',
          description: 'Interested in sponsorship or partnership opportunities? Contact our business development team.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
            </svg>
          )
        },
        {
          title: 'Media & Press',
          description: 'Media inquiries, press releases, and interview requests. Connect with our communications team.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
            </svg>
          )
        }
      ]
    },
    {
      type: 'split' as const,
      title: 'Join the Conversation',
      content: [
        'FASE is building the future of European delegated underwriting through collaboration, innovation, and professional excellence. We invite you to be part of this exciting journey.',
        'Stay connected with us for updates on our official launch, upcoming events, and opportunities to shape the future of the European MGA community.'
      ],
      image: '/AdobeStock_374018940.jpeg',
      imageAlt: 'Professional networking',
      imagePosition: 'left' as const
    },
    {
      type: 'cta' as const,
      title: 'Ready to Connect?',
      subtitle: 'Start Your Journey with FASE',
      description: 'Whether you\'re interested in membership, partnerships, or simply want to learn more about our community, we\'d love to hear from you.',
      backgroundImage: '/corporate-towers-bg.png',
      buttons: [
        {
          text: 'Join FASE',
          href: '/join',
          variant: 'primary' as const
        },
        {
          text: 'Email Us',
          href: 'mailto:info@fasemga.com',
          variant: 'secondary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Contact Us"
      bannerImage="/AdobeStock_1606166593.jpeg"
      bannerImageAlt="Professional communication and contact"
      sections={sections}
      currentPage="contact"
    />
  );
}