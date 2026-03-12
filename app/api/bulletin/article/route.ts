import { NextRequest, NextResponse } from 'next/server';
import { getBulletinArticleBySlug } from '../../../../lib/content';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const edition = searchParams.get('edition');
  const slug = searchParams.get('slug');
  const locale = searchParams.get('locale') || 'en';

  if (!edition || !slug) {
    return NextResponse.json(
      { error: 'Missing edition or slug parameter' },
      { status: 400 }
    );
  }

  const article = getBulletinArticleBySlug(edition, slug, locale);

  if (!article) {
    return NextResponse.json(
      { error: 'Article not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(article);
}
