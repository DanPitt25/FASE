'use client';

import ContentPageLayout from '../../components/ContentPageLayout';

export default function AboutPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Who We Are',
      content: [
        'FASE is the premier organization representing Managing General Agents (MGAs) across Europe. We serve as a unified voice for the MGA community, providing networking opportunities, professional development, and market intelligence to our members.',
        'Our mission is to elevate awareness of the critical role that MGAs play in the insurance value chain while creating a forum for MGAs, capacity providers, and service providers to connect and do business together.'
      ],
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop',
      imageAlt: 'Professional business meeting',
      imagePosition: 'right' as const
    },
    {
      type: 'split' as const,
      title: 'Our Mission',
      content: [
        'FASE exists to elevate the profile and influence of Managing General Agents across Europe. Through strategic networking, professional development, and market intelligence, we strengthen the entire MGA ecosystem.',
        'We drive sustainable growth across European insurance markets by fostering collaboration, innovation, and excellence within our professional community.'
      ],
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
      imageAlt: 'European business district',
      imagePosition: 'left' as const
    },
    {
      type: 'cards' as const,
      title: 'Our Core Values',
      subtitle: 'The principles that guide everything we do as we build the future of European MGA collaboration.',
      cards: [
        {
          title: 'Professional Excellence',
          description: 'Setting the highest standards for professional conduct, market practices, and service delivery throughout our community.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          )
        },
        {
          title: 'Innovation & Growth',
          description: 'Championing forward-thinking approaches to insurance distribution and embracing digital transformation across the MGA landscape.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )
        },
        {
          title: 'Community & Collaboration',
          description: 'Building bridges between MGAs, insurers, and service providers to create a stronger, more connected European insurance ecosystem.',
          icon: (
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          )
        }
      ]
    },
    {
      type: 'cta' as const,
      title: 'Ready to Join FASE?',
      subtitle: 'Be Part of Europe\'s Leading MGA Community',
      description: 'Join the growing community of forward-thinking MGAs and industry partners building the future of European insurance distribution.',
      backgroundImage: '/corporate-towers-bg.png',
      buttons: [
        {
          text: 'Become a Member',
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
      title="About FASE"
      bannerImage="/AdobeStock_1406443128.jpeg"
      bannerImageAlt="Professional business meeting"
      sections={sections}
      currentPage="about"
    />
  );
}