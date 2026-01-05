'use client';

import { useTranslations } from 'next-intl';
import ContentPageLayout from '../../../components/ContentPageLayout';

export default function LeadershipPage() {
  const t = useTranslations('leadership');
  const sections = [
    {
      type: 'split' as const,
      title: t('advisory_board.title'),
      content: [
        t('advisory_board.content.paragraph1'),
        t('advisory_board.content.paragraph2')
      ],
      image: '/consideration.jpg',
      imageAlt: t('advisory_board.image_alt'),
      imagePosition: 'right' as const
    },
    {
      type: 'people' as const,
      title: t('members.title'),
      people: [
        {
          name: 'Olaf Jonda',
          role: t('members.olaf_jonda.role'),
          company: t('members.olaf_jonda.company'),
          bio: t('members.olaf_jonda.bio'),
          image: '/cropped_Olaf_Jonda_b&w.jpg'
        },
        {
          name: 'Tim Quayle',
          role: t('members.tim_quayle.role'),
          company: t('members.tim_quayle.company'),
          bio: t('members.tim_quayle.bio'),
          image: '/cropped_Tim_Quayle.jpg'
        },
        {
          name: 'Stuart McMurdo',
          role: t('members.stuart_mcmurdo.role'),
          company: t('members.stuart_mcmurdo.company'),
          bio: t('members.stuart_mcmurdo.bio'),
          image: '/cropped_Stuart_McMurdo_b&w.jpg'
        },
        {
          name: 'Marc van der Veer',
          role: t('members.marc_van_der_veer.role'),
          company: t('members.marc_van_der_veer.company'),
          bio: t('members.marc_van_der_veer.bio'),
          image: '/cropped_Marc_van_der_Veer.jpg'
        },
        {
          name: 'Mike Keating',
          role: t('members.mike_keating.role'),
          company: t('members.mike_keating.company'),
          bio: t('members.mike_keating.bio'),
          image: '/cropped_Mike_Keating_b&w.jpg'
        },
        {
          name: 'Darío Spata',
          role: t('members.dario_spata.role'),
          company: t('members.dario_spata.company'),
          bio: t('members.dario_spata.bio'),
          image: '/cropped_Dario_Spata_b&w.jpg'
        },
        {
          name: 'Enrico Bertagna',
          role: t('members.enrico_bertagna.role'),
          company: t('members.enrico_bertagna.company'),
          bio: t('members.enrico_bertagna.bio'),
          image: '/enrico_bertagna.jpg'
        },
        {
          name: 'Martin Mankabady',
          role: t('members.martin_mankabady.role'),
          company: t('members.martin_mankabady.company'),
          bio: t('members.martin_mankabady.bio'),
          image: '/cropped_Martin_Mankabady_b&w.jpg'
        },
        {
          name: 'Valentina Visser',
          role: t('members.valentina_visser.role'),
          company: t('members.valentina_visser.company'),
          bio: t('members.valentina_visser.bio'),
          image: '/cropped_Valentina_Visser_b&w.jpg'
        },
        {
          name: 'Nicola Larizza',
          role: t('members.nicola_larizza.role'),
          company: t('members.nicola_larizza.company'),
          bio: t('members.nicola_larizza.bio'),
          image: '/cropped_Nicola_Larizza_b&w.jpg'
        },
        {
          name: 'Arjan Nollen',
          role: t('members.arjan_nollen.role'),
          company: t('members.arjan_nollen.company'),
          bio: t('members.arjan_nollen.bio'),
          image: '/arjan_nollen.jpg'
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title={t('page.title')}
      bannerImage="/seminar.jpg"
      bannerImageAlt={t('page.banner_alt')}
      sections={sections}
      currentPage="leadership"
    />
  );
}