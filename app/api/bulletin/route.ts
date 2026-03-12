import { NextRequest, NextResponse } from 'next/server';
import { getBulletinFeatureArticles, getMemberNews, getEditions } from '../../../lib/content';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const edition = searchParams.get('edition');
  const locale = searchParams.get('locale') || 'en';
  const type = searchParams.get('type'); // 'articles', 'member-news', or 'editions'

  // List available editions
  if (type === 'editions' || !edition) {
    const editions = getEditions();
    return NextResponse.json({ editions });
  }

  // Get member news for an edition
  if (type === 'member-news') {
    const memberNews = getMemberNews(edition, locale);
    return NextResponse.json(
      memberNews.map(({ slug, metadata }) => ({ slug, metadata }))
    );
  }

  // Default: get feature articles for an edition
  const articles = getBulletinFeatureArticles(edition, locale);
  return NextResponse.json(
    articles.map(({ slug, metadata }) => ({ slug, metadata }))
  );
}
