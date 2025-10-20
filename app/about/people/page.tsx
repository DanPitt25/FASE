'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function PeoplePage() {
  const sections = [
    {
      type: 'people' as const,
      title: 'Executive Team',
      people: [
        {
          name: 'William Pitt',
          role: 'Executive Director',
          bio: `William founded FASE in 2025 to address a widely recognized need for a pan-European body to represent Europe's fast-growing, but little understood, MGA sector.

Prior to establishing FASE, William led research and consulting projects at Lexicon Associates and Conning. He is the author of <i>The MGA Revolution: How MGAs are reshaping the insurance value chain</i>, published by Lexicon Associates in November 2024. He previously led consulting initiatives for Conning in the United States and was the author of Conning's annual MGA studies.

Prior to joining Conning in 2021, he served for twelve years as global chief marketing officer at Beazley. Earlier in his career, he held senior marketing and business development roles at Marsh & McLennan Companies and Lloyd's.

William has written extensively on insurance for publications including the <i>Wall Street Journal</i>, <i>Harvard Business Review</i>, <i>Institutional Investor</i>, <i>the Insurer</i>, and <i>Corriere della Sera</i>. He is the author of <i>More Equal than Others: a Director's Guide to EU Competition Policy</i>, published by Director Books.`,
          image: '/WilliamPitt.jpg'
        },
        {
          name: 'Aline Sullivan',
          role: 'Chief Operating Officer',
          bio: `Aline is responsible for the efficient delivery of all member services, working closely with members to address their needs. She has deep experience in business communications, educational programmes, and event management.

Aline is a partner at Lexicon Associates, a research and consulting business she founded in 2009. She has worked with Evercore Wealth Management and Evercore Trust Company since 2009 as the outsourced head of communications and the editor of the firm's quarterly journal, <i>Independent Thinking</i>; she earlier led communications for Aviva Investors, U.S. Trust and The Private Bank of Bank of America.

Her articles on investing have featured in the <i>New York Times</i>, the <i>International Herald Tribune</i>, the <i>Financial Times</i>, <i>Worth</i>, <i>Bloomberg</i>, <i>Barron's</i> and the <i>Wall Street Journal</i>.`,
          image: '/AlineSullivan.png'
        }
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Our People"
      bannerImage="/AdobeStock_999103753.jpeg"
      bannerImageAlt="FASE leadership and team"
      sections={sections}
      currentPage="people"
    />
  );
}