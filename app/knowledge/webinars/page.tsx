'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function WebinarsPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Expert-Led Webinar Series',
      content: [
        'Interactive learning sessions designed specifically for European MGA professionals, featuring industry experts and thought leaders.',
        'Our webinar series covers essential topics including regulatory compliance, market development, capacity relationships, and operational excellence.'
      ],
      image: '/AdobeStock_481244965.jpeg',
      imageAlt: 'Online learning and webinars',
      imagePosition: 'right' as const
    },
    {
      type: 'cards' as const,
      title: 'Upcoming Webinars',
      subtitle: 'Professional development opportunities for FASE members',
      cards: [
        {
          title: 'European Regulatory Update',
          description: 'Comprehensive overview of regulatory developments affecting MGAs across European jurisdictions, with practical implementation guidance.',
          image: '/AdobeStock_217797984.jpeg',
          imageAlt: 'Regulatory compliance'
        },
        {
          title: 'Capacity Relationship Management',
          description: 'Best practices for building and maintaining strong relationships with insurance companies, reinsurers, and Lloyd\'s syndicates.',
          image: '/AdobeStock_374018940.jpeg',
          imageAlt: 'Business relationships'
        },
        {
          title: 'Digital Transformation in MGAs',
          description: 'Leveraging technology to improve underwriting efficiency, customer experience, and operational performance in delegated underwriting.',
          image: '/AdobeStock_172545168.jpeg',
          imageAlt: 'Digital transformation'
        }
      ]
    },
    {
      type: 'accordion' as const,
      title: 'Webinar Information',
      subtitle: 'Everything you need to know about our webinar series',
      items: [
        {
          title: 'Who can attend?',
          content: 'Webinars are exclusive to FASE members and cover topics specifically relevant to European MGA professionals and their capacity partners.'
        },
        {
          title: 'How do I register?',
          content: 'Members receive webinar invitations via email with registration links. All sessions are recorded for later viewing through the member portal.'
        },
        {
          title: 'What topics are covered?',
          content: 'Our curriculum includes regulatory updates, market intelligence, operational best practices, technology implementation, and capacity relationship management.'
        },
        {
          title: 'Are materials provided?',
          content: 'Yes, all attendees receive presentation materials, relevant resources, and access to recorded sessions through the FASE member portal.'
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Webinar Series"
      bannerImage="/AdobeStock_999103753.jpeg"
      bannerImageAlt="FASE webinar series"
      sections={sections}
      currentPage="webinars"
    />
  );
}