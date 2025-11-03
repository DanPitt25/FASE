'use client';

import ContentPageLayout from '../../components/ContentPageLayout';
import { useTranslations } from 'next-intl';

export default function JoinPage() {
  const t = useTranslations('join');
  
  const sections = [
    {
      type: 'split' as const,
      title: t('membership_applications.title'),
      content: t.raw('membership_applications.content'),
      image: '/seated.jpg',
      imageAlt: t('membership_applications.image_alt'),
      imagePosition: 'right' as const
    },
    {
      type: 'accordion' as const,
      title: t('member_benefits.title'),
      items: t.raw('member_benefits.items')
    },
    {
      type: 'cards' as const,
      title: t('membership_categories.title'),
      subtitle: t('membership_categories.subtitle'),
      cards: [
        {
          title: t('membership_categories.mga.title'),
          description: t('membership_categories.mga.description'),
          image: '/gettingAlong.jpeg',
          imageAlt: t('membership_categories.mga.image_alt'),
          href: '/register?type=MGA',
          actionText: t('membership_categories.mga.action_text')
        },
        {
          title: t('membership_categories.carrier.title'),
          description: t('membership_categories.carrier.description'),
          image: '/conference.jpeg',
          imageAlt: t('membership_categories.carrier.image_alt'),
          href: '/register?type=carrier',
          actionText: t('membership_categories.carrier.action_text')
        },
        {
          title: t('membership_categories.service_provider.title'),
          description: t('membership_categories.service_provider.description'),
          image: '/glass.jpg',
          imageAlt: t('membership_categories.service_provider.image_alt'),
          href: '/register?type=provider',
          actionText: t('membership_categories.service_provider.action_text')
        }
      ]
    },
    {
      type: 'split' as const,
      title: t('application_process.title'),
      content: t.raw('application_process.content'),
      image: '/motorcycle.jpeg',
      imageAlt: t('application_process.image_alt'),
      imagePosition: 'left' as const,
      buttons: [
        {
          text: t('application_process.buttons.join'),
          href: '/register',
          variant: 'primary' as const
        },
        {
          text: t('application_process.buttons.contact_us'),
          href: '/contact',
          variant: 'secondary' as const
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/conference.jpeg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="join"
    />
  );
}