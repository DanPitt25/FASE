'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function LeadershipPage() {
  const sections = [
    {
      type: 'split' as const,
      title: 'Advisory Board',
      content: [
        'Our advisory board comprises distinguished industry leaders who guide FASE strategic direction and represent the diverse interests of the European MGA community.',
        'These experienced professionals bring decades of expertise in delegated underwriting, capacity provision, and regulatory affairs across European markets.'
      ],
      image: '/consideration.jpg',
      imageAlt: 'Business leadership and strategy',
      imagePosition: 'right' as const
    },
    {
      type: 'people' as const,
      title: 'Advisory Board Members',
      people: [
        {
          name: 'Olaf Jonder',
          role: 'CEO',
          company: 'DUAL Europe',
          bio: 'Olaf Jonder is chief executive officer at DUAL Europe. He was appointed to the role in 2022 and is responsible for leading DUAL Europe\'s management and underwriting teams\' growth and profitability, along with driving strategic vision across 13 countries. He is also a member of the DUAL Group Executive Committee.',
          image: '/cropped_Olaf_Jonder_b&w.jpg'
        },
        {
          name: 'Tim Quayle',
          role: 'CEO',
          company: 'OneAdvent',
          bio: 'Tim Quayle is chief executive officer at OneAdvent. Tim began his insurance career developing policy administration and claims systems for intermediaries and insurers. In 2017 he joined a private equity-backed insurance group pursuing an MGA-focused strategy. He led a management buyout, forming OneAdvent in late 2023.',
          image: '/cropped_Tim_Quayle.jpg'
        },
        {
          name: 'Stuart McMurdo',
          role: 'CEO',
          company: 'Accredited Insurance Limited - Europe & UK',
          bio: 'Stuart joined Accredited in October 2024, bringing over 30 years of insurance experience from across the UK, South Africa and Europe. Prior to joining he held several roles of increasing responsibility at SCOR, most recently as CEO of Reinsurance SCOR P&C and a member of the SCOR P&C Management Team.',
          image: '/cropped_Stuart_McMurdo_b&w.jpg'
        },
        {
          name: 'Marc van der Veer',
          role: 'Managing Director Europe',
          company: 'Optio',
          bio: 'Marc van der Veer is managing director, Europe, at Optio. Marc is responsible for originating, orchestrating and managing European acquisitions for Optio. He joined Optio in August 2024, bringing more than 30 years of experience in the industry. He had previously served as chief executive officer, European Ventures, at Nexus Group.',
          image: '/cropped_Marc_van_der_Veer.jpg'
        },
        {
          name: 'Mike Keating',
          role: 'CEO',
          company: 'Managing General Agents\' Association',
          bio: 'Mike has been chief executive officer of the Managing General Agents\' Association since September 2020. He began his career as an underwriter in the company market before joining AXA Commercial in 1999, where he managed strategic MGA and delegated authority partnerships.',
          image: '/cropped_Mike_Keating_b&w.jpg'
        },
        {
          name: 'Darío Spata',
          role: 'CEO & President of ASASE',
          company: 'Iberian Insurance Group',
          bio: 'Darío is president of ASASE (Asociación de Agencias de Suscripción de España), the Spanish MGA association, a role he has held since April 2023. He is founding partner of Iberian Insurance Group, one of the largest underwriting agencies in Spain. He has served as CEO of Iberian since November 2014.',
          image: '/cropped_Dario_Spata_b&w.jpg'
        },
        {
          name: 'Martin Mankabady',
          role: 'M&A Partner',
          company: 'Eversheds Sutherland',
          bio: 'Martin Mankabady is a mergers & acquisitions partner within Eversheds Sutherland\'s Company Commercial Group. He advises clients in the financial services sector, in particular insurance. Martin advises on reorganisations, joint ventures, start-ups, commercial, and regulatory matters, as well as insurance products.',
          image: '/cropped_Martin_Mankabady_b&w.jpg'
        },
        {
          name: 'Enrico Bertagna',
          role: 'Managing Director',
          company: 'Bowood Europe',
          bio: 'Enrico Bertagna, an insurance executive with over 30 years of experience in the European P&C industry, is managing director of Bowood Europe, Howden\'s specialist binding authority/MGA division. Over the years he has had the opportunity to build enterprise value in a variety of positions in Lloyd\'s and the company market.',
          image: '/market.jpg'
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Leadership"
      bannerImage="/seminar.jpg"
      bannerImageAlt="FASE leadership team"
      sections={sections}
      currentPage="leadership"
    />
  );
}