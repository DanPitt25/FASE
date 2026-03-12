import { NextRequest, NextResponse } from 'next/server';
import {
  getFASENewsArticles,
  getBulletinFeatureArticles,
  getMemberNews,
  Article,
} from '../../../../lib/content';

const SITE_URL = 'https://fasemga.com';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatRFC822Date(dateString: string): string {
  const date = new Date(dateString);
  return date.toUTCString();
}

function getArticleUrl(article: Article, edition?: string): string {
  // Member news links to external URL
  if (article.metadata.externalUrl) {
    return article.metadata.externalUrl;
  }

  // Bulletin articles link to member portal
  if (edition && (article.metadata.category === 'bulletin-feature' ||
                  article.metadata.category === 'bulletin-contributed')) {
    const editionPath = edition === '2026-02' ? 'february-2026' : edition;
    return `${SITE_URL}/member-portal/bulletin/${editionPath}/${article.slug}`;
  }

  // Default: public news
  return `${SITE_URL}/about/news/${article.slug}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'en';
  const edition = searchParams.get('edition'); // e.g., '2026-02' for bulletin content

  let articles: Article[] = [];
  let channelTitle = 'FASE - Fédération des Agences de Souscription Européennes';
  let channelDescription = 'News and insights from FASE, the pan-European MGA federation';

  if (edition) {
    // Bulletin feed: includes feature articles and member news
    const bulletinArticles = getBulletinFeatureArticles(edition, lang);
    const memberNews = getMemberNews(edition, lang);
    articles = [...bulletinArticles, ...memberNews].sort(
      (a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()
    );

    const editionName = edition === '2026-02' ? 'February 2026' : edition;
    channelTitle = `The Entrepreneurial Underwriter - ${editionName}`;
    channelDescription = `FASE member bulletin for ${editionName}`;
  } else {
    // Public feed: only FASE news
    articles = getFASENewsArticles(lang);
  }

  const feedUrl = `${SITE_URL}/api/feed/rss${edition ? `?edition=${edition}` : ''}${lang !== 'en' ? `${edition ? '&' : '?'}lang=${lang}` : ''}`;

  const items = articles.map(article => {
    const articleUrl = getArticleUrl(article, edition || undefined);
    const authorInfo = article.metadata.authorRole
      ? `${article.metadata.author}, ${article.metadata.authorRole}`
      : article.metadata.author;

    // For member news, use source as author
    const author = article.metadata.source || authorInfo;

    return `
    <item>
      <title>${escapeXml(article.metadata.title)}</title>
      <link>${articleUrl}</link>
      <description>${escapeXml(article.metadata.excerpt)}</description>
      <pubDate>${formatRFC822Date(article.metadata.date)}</pubDate>
      <guid isPermaLink="true">${articleUrl}</guid>
      <category>${escapeXml(article.metadata.category)}</category>
      <author>${escapeXml(author)}</author>
    </item>`;
  }).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>${lang}</language>
    <lastBuildDate>${formatRFC822Date(new Date().toISOString())}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
