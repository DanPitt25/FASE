import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type ArticleCategory =
  | 'fase-news'
  | 'bulletin-feature'
  | 'bulletin-contributed'
  | 'member-news';

export interface ArticleMetadata {
  title: string;
  date: string;
  excerpt: string;
  author: string;
  authorRole?: string;
  bannerImage?: string;
  bannerImageAlt?: string;
  language: string;
  primarySlug: string;
  category: ArticleCategory;
  edition?: string;
  externalUrl?: string;
  source?: string;
}

export interface Article {
  slug: string;
  metadata: ArticleMetadata;
  content: string;
}

const CONTENT_DIRECTORY = path.join(process.cwd(), 'public', 'content');
const NEWS_DIRECTORY = path.join(CONTENT_DIRECTORY, 'news');
const BULLETIN_DIRECTORY = path.join(CONTENT_DIRECTORY, 'bulletin');

function getLocalizedSlug(baseSlug: string, locale: string): string {
  return locale === 'en' ? baseSlug : `${baseSlug}-${locale}`;
}

function parseArticleFile(filePath: string, slug: string): Article | null {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      metadata: {
        title: data.title || '',
        date: data.date ? String(data.date) : '',
        excerpt: data.excerpt || '',
        author: data.author || '',
        authorRole: data.authorRole,
        bannerImage: data.bannerImage,
        bannerImageAlt: data.bannerImageAlt,
        language: data.language || 'en',
        primarySlug: data.primarySlug || slug,
        category: data.category || 'fase-news',
        edition: data.edition,
        externalUrl: data.externalUrl,
        source: data.source,
      },
      content,
    };
  } catch {
    return null;
  }
}

function getSlugsFromDirectory(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];

  const files = fs.readdirSync(directory);
  const slugs = new Set<string>();

  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;

    // Extract base slug (remove locale suffix and extension)
    const baseName = file.replace(/\.(md|mdx)$/, '');
    const localeMatch = baseName.match(/^(.+)-(?:fr|de|es|it|nl)$/);
    const baseSlug = localeMatch ? localeMatch[1] : baseName;
    slugs.add(baseSlug);
  }

  return Array.from(slugs);
}

function getArticleFromDirectory(directory: string, slug: string, locale: string = 'en'): Article | null {
  const localizedSlug = getLocalizedSlug(slug, locale);

  // Try .md first, then .mdx
  for (const ext of ['.md', '.mdx']) {
    const localizedPath = path.join(directory, `${localizedSlug}${ext}`);
    const article = parseArticleFile(localizedPath, slug);
    if (article) return article;
  }

  // Fall back to English if localized version doesn't exist
  if (locale !== 'en') {
    for (const ext of ['.md', '.mdx']) {
      const englishPath = path.join(directory, `${slug}${ext}`);
      const article = parseArticleFile(englishPath, slug);
      if (article) return article;
    }
  }

  return null;
}

// ============ NEWS FUNCTIONS ============

export function getAllNewsArticleSlugs(): string[] {
  return getSlugsFromDirectory(NEWS_DIRECTORY);
}

export function getNewsArticleBySlug(slug: string, locale: string = 'en'): Article | null {
  return getArticleFromDirectory(NEWS_DIRECTORY, slug, locale);
}

export function getAllNewsArticles(locale: string = 'en'): Article[] {
  const slugs = getAllNewsArticleSlugs();
  const articles: Article[] = [];

  for (const slug of slugs) {
    const article = getNewsArticleBySlug(slug, locale);
    if (article) {
      articles.push(article);
    }
  }

  return articles.sort((a, b) =>
    new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()
  );
}

export function getFASENewsArticles(locale: string = 'en'): Article[] {
  return getAllNewsArticles(locale).filter(
    article => article.metadata.category === 'fase-news'
  );
}

// ============ BULLETIN FUNCTIONS ============

export function getEditions(): string[] {
  if (!fs.existsSync(BULLETIN_DIRECTORY)) return [];

  return fs.readdirSync(BULLETIN_DIRECTORY)
    .filter(name => {
      const fullPath = path.join(BULLETIN_DIRECTORY, name);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort()
    .reverse(); // Most recent first
}

export function getBulletinArticleSlugs(edition: string): string[] {
  const editionDir = path.join(BULLETIN_DIRECTORY, edition);
  return getSlugsFromDirectory(editionDir);
}

export function getBulletinArticleBySlug(edition: string, slug: string, locale: string = 'en'): Article | null {
  const editionDir = path.join(BULLETIN_DIRECTORY, edition);
  return getArticleFromDirectory(editionDir, slug, locale);
}

export function getBulletinArticles(edition: string, locale: string = 'en'): Article[] {
  const slugs = getBulletinArticleSlugs(edition);
  const articles: Article[] = [];

  for (const slug of slugs) {
    const article = getBulletinArticleBySlug(edition, slug, locale);
    if (article) {
      articles.push(article);
    }
  }

  return articles.sort((a, b) =>
    new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()
  );
}

export function getBulletinFeatureArticles(edition: string, locale: string = 'en'): Article[] {
  return getBulletinArticles(edition, locale).filter(
    article => article.metadata.category === 'bulletin-feature' ||
               article.metadata.category === 'bulletin-contributed'
  );
}

export function getMemberNews(edition: string, locale: string = 'en'): Article[] {
  return getBulletinArticles(edition, locale).filter(
    article => article.metadata.category === 'member-news'
  );
}

// ============ LEGACY COMPATIBILITY ============
// Keep old function names working for existing code

export function getAllArticleSlugs(): string[] {
  return getAllNewsArticleSlugs();
}

export function getArticleBySlug(slug: string, locale: string = 'en'): Article | null {
  return getNewsArticleBySlug(slug, locale);
}

export function getAllArticles(locale: string = 'en'): Article[] {
  return getAllNewsArticles(locale);
}

export function getArticlesByCategory(category: ArticleCategory, locale: string = 'en'): Article[] {
  return getAllNewsArticles(locale).filter(
    article => article.metadata.category === category
  );
}

export function getLatestArticles(count: number = 10, locale: string = 'en'): Article[] {
  return getAllNewsArticles(locale).slice(0, count);
}
