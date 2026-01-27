import { Article } from '../lib/types';

export const articles: Article[] = [
  {
    slug: 'european-mga-market-reaches-record-premium',
    title: 'European MGA Market Reaches Record Premium Volume',
    standfirst: 'Delegated authority premiums in Europe surpassed €45bn in 2025, driven by Lloyd\'s expansion and new carrier entrants.',
    content: `
The European managing general agent sector has achieved another year of record growth, with total delegated authority premiums reaching €45.2 billion in 2025.

The figures represent a 12% year-on-year increase, outpacing the broader European insurance market which grew at approximately 4% during the same period.

## Key Growth Drivers

Lloyd's of London's expansion into continental European markets through its Brussels platform has provided MGAs with enhanced access to specialist capacity. Meanwhile, traditional carriers facing legacy system constraints have increasingly turned to MGAs as their preferred route to market.

Germany remained the largest market by premium volume, with €11.4bn written through delegated authority arrangements. France followed at €9.2bn, while the Spanish market showed the fastest growth at 18% year-on-year.

## Outlook

Carrier appetite for MGA partnerships shows no signs of abating. A survey of 50 major capacity providers found that 78% plan to increase their allocation to delegated authority business over the next three years.
    `,
    category: 'analysis',
    author: {
      name: 'Sarah Mitchell',
      role: 'Senior Market Analyst',
    },
    publishedAt: '2026-01-18T09:00:00Z',
  },
  {
    slug: 'the-talent-battleground',
    title: 'Why Underwriting Talent Is the New Battleground',
    standfirst: 'As the sector matures, the competition for experienced underwriters has intensified. Successful MGAs are rethinking their approach.',
    content: `
The European MGA sector's growth has created an acute talent shortage. With delegated authority business outpacing traditional insurance growth, the demand for skilled underwriters has far outstripped supply.

Research indicates that the European specialty insurance market will need an additional 8,000 qualified underwriters by 2028 to maintain current service levels. Yet insurance programmes at European universities are producing fewer than 2,000 graduates annually.

## Reimagining Recruitment

Forward-thinking MGAs are taking innovative approaches. Several have established graduate programmes that provide accelerated paths to underwriting authority, combining technical training with mentorship from experienced professionals.

Others are looking beyond traditional insurance backgrounds, recruiting from banking, consulting, and technology. These hires bring fresh perspectives and transferable skills.

## Retention

Retention has become equally critical. MGAs report that equity participation, flexible working arrangements, and clear advancement paths are now baseline expectations for senior underwriters.
    `,
    category: 'opinion',
    author: {
      name: 'William Pitt',
      role: 'Executive Director, FASE',
    },
    publishedAt: '2026-01-15T14:30:00Z',
  },
  {
    slug: 'navigating-eiopa-guidelines',
    title: 'Navigating the New EIOPA Outsourcing Guidelines',
    standfirst: 'Updated European regulatory guidance on delegated underwriting creates new compliance obligations for MGAs and carriers.',
    content: `
EIOPA has finalised its updated guidelines on outsourcing and delegated underwriting arrangements. These guidelines, which take effect in March 2026, will significantly impact how MGAs and their carrier partners structure their relationships.

## Key Requirements

The guidelines introduce several new obligations:

Enhanced Due Diligence: Carriers must conduct comprehensive assessments of MGA capabilities before entering into delegated authority arrangements.

Ongoing Monitoring: The guidelines mandate continuous monitoring of delegated activities, with carriers required to maintain visibility into underwriting decisions and portfolio composition.

Exit Planning: All parties must maintain documented exit strategies ensuring policyholders would not be disadvantaged if an arrangement were terminated.

## Preparing Now

MGAs should begin preparing for the March deadline. Priority actions include reviewing all delegated authority agreements and implementing enhanced data reporting capabilities.

FASE is developing member resources including template agreements and compliance checklists.
    `,
    category: 'analysis',
    author: {
      name: 'Dr. Elena Vasquez',
      role: 'Regulatory Affairs Advisor',
    },
    publishedAt: '2026-01-10T08:00:00Z',
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}

export function getArticlesByCategory(category: Article['category']): Article[] {
  return articles.filter((article) => article.category === category);
}

export function getLatestArticles(count: number = 10): Article[] {
  return [...articles]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, count);
}
