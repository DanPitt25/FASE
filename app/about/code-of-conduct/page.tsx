'use client';

import ContentPageLayout from '../../../components/ContentPageLayout';

export default function CodeOfConductPage() {
  const sections = [
    {
      type: 'content' as const,
      title: 'FASE Code of Conduct',
      content: [
        'FASE supports the highest professional and ethical standards, as described in this Code of Conduct, and requires that all members commit annually to upholding these standards as a condition of their membership.',
        'Members hereby undertake to act in a legal, fair and ethical manner in all their dealings with all parties.',
        'Members undertake to cooperate fully and at all times with FASE in its enforcement of this Code.'
      ]
    },
    {
      type: 'accordion' as const,
      title: 'Code of Conduct Sections',
      items: [
        {
          title: '1. Legal responsibilities',
          content: 'Members will comply with all applicable laws and regulations in the locations in which they do business. Should this legal responsibility conflict with another duty described in this Code, this legal responsibility will take priority.\n\nMembers will bring to the attention of the FASE Business Conduct Committee any circumstances of which they become aware involving:\n\n• A member being in breach of any regulatory requirement and\n\n• Any circumstance that may reasonably lead to sanctions against the member or a member of their staff or directors by the relevant regulatory authorities\n\nMembers will provide all reasonable lawful assistance to regulatory, professional and law enforcement organization in the discharge of their duties, whether in respect of themselves, another Member or a non-member.'
        },
        {
          title: '2. Financial Responsibilities',
          content: 'Members should always meet their financial obligations on time. This includes, but it not limited to, payment of debts, premium due to insurers, returns due to brokers and insureds, sums due to employees.\n\nMembers must comply with applicable solvency or like requirements.'
        },
        {
          title: '3. Inter-organisational Responsibilities',
          content: 'Members will compete fairly and honourably in the markets in which they operate.\n\nThis includes, but is not limited to:\n\n• making no statement about fellow Members, competitors or other market participants, privately or publicly, which they do not honestly believe to be true and relevant based on the best information reasonably available to them;\n\n• entering into any agreement intended to diminish competition within the market.'
        },
        {
          title: '4. Community Responsibilities',
          content: 'FASE members must conduct themselves in a manner befitting the privileges of membership.\n\nMembers will not only comply with their obligations under law pertaining to discrimination, but in all their dealings will take reasonable steps not to cause a detriment to any person or organisation arising from race, sex, sexual orientation, gender reassignment, pregnancy and maternity, married or civil partnership status, religion or belief, age and disability.\n\nMembers are encouraged to take part in civic, charitable and philanthropic activities which contribute to the promotion of the good standing of the insurance sector, its contribution to the public good and the welfare of those who work in it.\n\nMembers will encourage continuing education and training for staff.'
        },
        {
          title: '5. Relationships with Insurers',
          content: 'Members will deal fairly and honestly when acting on behalf of insurers. In particular they should:\n\n• faithfully execute the underwriting guidelines of the insurers they represent;\n\n• act in the utmost good faith and gather all data necessary to make a proper underwriting decision before putting an insurer on risk;\n\n• keep themselves up to date on the laws and regulations in all areas in which they have authority, and advise insurers accordingly of the impact of such laws and regulations as they affect their relationship.'
        },
        {
          title: '6. Relationships with Brokers and Agents (or Insureds if operating directly)',
          content: 'Members should deal fairly and honestly with brokers, agents or insureds (if operating directly), and in so doing will:\n\n• consider at all times the financial stability of insurers with which the Member places business;\n\n• make no false or misleading representation of what coverage is being provided, or the limitations or exclusions to coverage or impose limitations or exclusions such that the policy provides no effective benefit to the insured.\n\nMembers should be able to demonstrate that they have carefully considered the insurers that they represent as underwriting agents and place their and their brokers\' customers\' business with.\n\nEffective and appropriate due diligence is a key part of the process that Members should perform on the insurance companies they represent as security for the policies they provide. There is a risk to customers in the event that an insurer fails and is unable to pay valid claims.\n\nFASE expects MGA Members to be able to demonstrate that suitable due diligence has been performed on the insurers that they represent and offer as insurance security.\n\nMembers should provide clear and unambiguous detail of the name and address of the insurer in all the relevant documentation provided for brokers and policyholders. We expect Members to positively avoid giving the policyholder the impression that the MGA is the insurer and obscure the name of the insurer behind the MGA. It is important that customers can make an informed decision on where their insurance is being placed.'
        }
      ]
    },
    {
      type: 'content' as const,
      title: 'Reporting Breaches',
      content: [
        'All notices of potential breach made under this Code should be made to the Business Conduct Committee at conduct@fasemga.com.'
      ]
    }
  ];

  return (
    <ContentPageLayout
      title="Code of Conduct"
      bannerImage="/regulatory.jpg"
      bannerImageAlt="Professional standards and regulatory compliance"
      sections={sections}
      currentPage="code-of-conduct"
    />
  );
}