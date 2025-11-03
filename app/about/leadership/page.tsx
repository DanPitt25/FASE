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
          name: 'Olaf Jonda',
          role: 'CEO',
          company: 'DUAL Europe',
          bio: 'Olaf Jonda is chief executive officer at DUAL Europe. He was appointed to the role in 2022 and is responsible for leading DUAL Europe\'s management and underwriting teams\' growth and profitability, along with driving strategic vision across 13 countries. He is also a member of the DUAL Group Executive Committee.\n\nOlaf joined DUAL in 2011 as an underwriter and held several roles, including Head of Underwriting, before he was appointed MD of DUAL Deutschland in 2019. He started his career in insurance with Winterthur in 2002 and also worked at Creditreform with responsibility for rating companies. Olaf studied Business Administration at the University of Applied Sciences in Cologne.',
          image: '/cropped_Olaf_Jonda_b&w.jpg'
        },
        {
          name: 'Tim Quayle',
          role: 'CEO',
          company: 'OneAdvent',
          bio: 'Tim Quayle is chief executive officer at OneAdvent.\n\nTim began his insurance career developing policy administration and claims systems for intermediaries and insurers. In 2017 he joined a private equity-backed insurance group pursuing an MGA-focused strategy. He led a management buyout, forming OneAdvent in late 2023.\n\nOneAdvent\'s mission is to support MGAs through every stage of their lifecycle and has built a comprehensive suite of MGA services across multiple geographies. The platform successfully launched five MGAs in 2024 and is on-track to double that in 2025.',
          image: '/cropped_Tim_Quayle.jpg'
        },
        {
          name: 'Stuart McMurdo',
          role: 'CEO',
          company: 'Accredited Insurance Limited - Europe & UK',
          bio: 'Stuart McMurdo is chief executive officer, Accredited Insurance Limited - Europe & UK.\n\nStuart joined Accredited in October 2024, bringing over 30 years of insurance experience from across the UK, South Africa and Europe. Prior to joining he held several roles of increasing responsibility at SCOR, most recently as CEO of Reinsurance SCOR P&C and a member of the SCOR P&C Management Team.\n\nStuart brings a strong background in both reinsurance and leadership having spent time with Santam in South Africa and with Hannover Reinsurance Group in various management positions.',
          image: '/cropped_Stuart_McMurdo_b&w.jpg'
        },
        {
          name: 'Marc van der Veer',
          role: 'Managing Director Europe',
          company: 'Optio',
          bio: 'Marc van der Veer is managing director, Europe, at Optio.\n\nMarc is responsible for originating, orchestrating and managing European acquisitions for Optio. He joined Optio in August 2024, bringing more than 30 years of experience in the industry. He had previously served as chief executive officer, European Ventures, at Nexus Group.',
          image: '/cropped_Marc_van_der_Veer.jpg'
        },
        {
          name: 'Mike Keating',
          role: 'CEO',
          company: 'Managing General Agents\' Association',
          bio: 'Mike has been chief executive officer of the Managing General Agents\' Association since September 2020.\n\nHe began his career as an underwriter in the company market before joining AXA Commercial in 1999, where he managed strategic MGA and delegated authority partnerships. He later became Managing Director of AXA\'s Personal Lines business (excluding direct channels). In 2011, Mike joined the board of UK General, one of the UK\'s largest MGAs, where he led the Commercial portfolio and implemented a targeted strategy for small regional brokers across the UK.\n\nFrom 2016, he held executive roles in the broking sector, and later collaborated with West Hill Capital to launch the insurtech MGA start-up, Qlaims.\n\nMike\'s leadership and influence have been recognised on a global scale, with his inclusion in the Insurance Business Global 100 list for the second consecutive year in 2024.',
          image: '/cropped_Mike_Keating_b&w.jpg'
        },
        {
          name: 'Darío Spata',
          role: 'President',
          company: 'ASASE',
          bio: 'Darío is president of ASASE (Asociación de Agencias de Suscripción de España), the Spanish MGA association, a role he has held since April 2023.\n\nHe is founding partner of Iberian Insurance Group, one of the largest underwriting agencies in Spain. He has served as CEO of Iberian since November 2014.\n\nDarío was named 40 under 40 of the insurance sector in 2020, 2021 and 2022.',
          image: '/cropped_Dario_Spata_b&w.jpg'
        },
        {
          name: 'Enrico Bertagna',
          role: 'Managing Director',
          company: 'Bowood Europe',
          bio: 'Enrico Bertagna, an insurance executive with over 30 years of experience in the European P&C industry, is managing director of Bowood Europe, Howden\'s specialist binding authority/MGA division.\n\nOver the years he has had the opportunity to build enterprise value in a variety of positions in Lloyd\'s and the company market with particular focus on setting-up and running operations, managing broker/MGA/customer relationships and developing a network of professional connections at a global level. In these roles he has been responsible for managing and restructuring operations, leading the development/implementation of bespoke IT systems, developing human resources, building distribution networks and dealing with regulators. He also initiated, negotiated and closed a variety of business deals.\n\nEnrico\'s experience includes starting his career as a broker at Richards Longstaff in London and senior roles at Lloyd\'s of London, Allied World and Zurich Insurance.',
          image: '/enrico_bertagna.jpg'
        },
        {
          name: 'Martin Mankabady',
          role: 'M&A Partner',
          company: 'Eversheds Sutherland',
          bio: 'Martin Mankabady is a mergers & acquisitions partner within Eversheds Sutherland\'s Company Commercial Group. He advises clients in the financial services sector, in particular insurance.\n\nMartin advises on reorganisations, joint ventures, start-ups, commercial, and regulatory matters, as well as insurance products (including W&I and credit insurance).',
          image: '/cropped_Martin_Mankabady_b&w.jpg'
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