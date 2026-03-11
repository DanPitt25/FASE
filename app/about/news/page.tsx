'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';

interface ArticleMetadata {
  title: string;
  date: string;
  excerpt: string;
  author?: string;
  authorRole?: string;
  bannerImage?: string;
  bannerImageAlt?: string;
  category?: string;
}

interface NewsArticle {
  slug: string;
  metadata: ArticleMetadata;
}

export default function NewsPage() {
  const t = useTranslations('news');
  const locale = useLocale();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArticles() {
      try {
        const baseArticleSlugs = [
          'am-best-partnership',
          'bridgehaven-partnership',
          'mga-rendezvous',
          'clyde-co-partnership',
          'fase-formation-announcement'
        ];

        const articlePromises = baseArticleSlugs.map(async (baseSlug) => {
          try {
            const localeSlug = locale === 'en' ? baseSlug : `${baseSlug}-${locale}`;
            let response = await fetch(`/news/${localeSlug}.md`);

            if (!response.ok && locale !== 'en') {
              response = await fetch(`/news/${baseSlug}.md`);
            }

            if (!response.ok) return null;

            const slug = response.url.includes(`${baseSlug}-${locale}`) ? localeSlug : baseSlug;

            const text = await response.text();
            const lines = text.split('\n');

            const metadata: Record<string, string> = {};

            if (lines[0] === '---') {
              for (let i = 1; i < lines.length; i++) {
                if (lines[i] === '---') {
                  break;
                }
                const [key, ...valueParts] = lines[i].split(':');
                if (key && valueParts.length) {
                  metadata[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
                }
              }
            }

            return { slug, metadata: metadata as unknown as ArticleMetadata };
          } catch (err) {
            console.error(`Failed to load article ${baseSlug}:`, err);
            return null;
          }
        });

        const loadedArticles = (await Promise.all(articlePromises))
          .filter(article => article !== null)
          .sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime());

        setArticles(loadedArticles);
      } catch (error) {
        console.error('Error loading articles:', error);
      } finally {
        setLoading(false);
      }
    }

    loadArticles();
  }, [locale]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="relative h-80 overflow-hidden">
          <Image
            src="/conferenceWood.jpg"
            alt={t('page.banner_alt')}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4">
              <h1 className="text-4xl md:text-5xl font-noto-serif font-bold text-white max-w-4xl">
                {t('page.title')}
              </h1>
            </div>
          </div>
        </div>

        {/* News Content */}
        <div className="bg-gray-50 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <p className="text-gray-600 mb-10 max-w-3xl">
                {t('intro.content.paragraph1')}
              </p>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fase-navy mx-auto"></div>
                  <p className="text-gray-500 mt-4">Loading articles...</p>
                </div>
              ) : articles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/about/news/${article.slug}`}
                      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
                    >
                      {article.metadata.bannerImage && (
                        <div className="aspect-video relative overflow-hidden">
                          <Image
                            src={article.metadata.bannerImage}
                            alt={article.metadata.bannerImageAlt || article.metadata.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <time className="text-sm text-gray-500" dateTime={article.metadata.date}>
                          {new Date(article.metadata.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </time>
                        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mt-2 mb-2 leading-snug line-clamp-2">
                          {article.metadata.title}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                          {article.metadata.excerpt}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No articles found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
