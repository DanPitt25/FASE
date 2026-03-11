import { NextRequest, NextResponse } from 'next/server';
import { getAllArticles, getArticlesByCategory, ArticleCategory } from '../../../lib/content';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en';
  const category = searchParams.get('category') as ArticleCategory | null;

  const articles = category
    ? getArticlesByCategory(category, locale)
    : getAllArticles(locale);

  // Return only metadata (no content) for list view
  const articlesWithoutContent = articles.map(({ slug, metadata }) => ({
    slug,
    metadata,
  }));

  return NextResponse.json(articlesWithoutContent, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
