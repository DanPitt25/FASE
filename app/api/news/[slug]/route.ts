import { NextRequest, NextResponse } from 'next/server';
import { getNewsArticleBySlug, getAllNewsArticleSlugs } from '../../../../lib/content';

const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'it', 'nl'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en';

  const article = getNewsArticleBySlug(slug, locale);

  if (!article) {
    return NextResponse.json(
      { error: 'Article not found' },
      { status: 404 }
    );
  }

  // Check which language versions exist for this article
  const availableLocales = SUPPORTED_LOCALES.filter(lang => {
    const localeArticle = getNewsArticleBySlug(slug, lang);
    // Article exists if we get content AND it's actually in that language
    // (not just falling back to English)
    return localeArticle && (lang === 'en' || localeArticle.metadata.language === lang);
  });

  return NextResponse.json({
    ...article,
    availableLocales,
  });
}
