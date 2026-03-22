'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';

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

  const bannerAnimation = useScrollAnimation();
  const ribbonAnimation = useScrollAnimation();
  const contentAnimation = useScrollAnimation();

  useEffect(() => {
    async function loadArticles() {
      try {
        const baseArticleSlugs = [
          'insurtech-uk-partnership',
          'loro-partnership',
          'accredited-partnership',
          'accelerant-partnership',
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
    <div className="flex min-h-screen bg-white font-lato overflow-x-hidden">
      <div className="flex-1 relative">
        <Header currentPage="news" />

        {/* Hero Banner - matching ContentPageLayout */}
        <section ref={bannerAnimation.elementRef} className="relative h-[33vh] flex items-center overflow-hidden">
          <Image
            src="/conferenceWood.jpg"
            alt={t('page.banner_alt')}
            fill
            className="object-cover"
            style={{ filter: 'brightness(0.7) contrast(1.1) saturate(1.1)' }}
            priority
          />
          <div className="absolute inset-0 bg-fase-navy/40"></div>
          <div className="relative z-10 w-full h-full flex items-center px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className={`w-1/4 transition-all duration-700 ${
              bannerAnimation.isVisible ? 'scroll-visible-left' : 'scroll-hidden-left'
            }`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-noto-serif font-medium text-white leading-tight">
                {t('page.title')}
              </h1>
            </div>
          </div>
        </section>

        {/* Blue ribbon separator */}
        <div ref={ribbonAnimation.elementRef} className="relative h-12">
          <div className={`absolute right-0 h-12 bg-fase-navy shadow-lg transition-all duration-700 ${
            ribbonAnimation.isVisible ? 'scroll-visible-right' : 'scroll-hidden-right'
          }`} style={{ width: '61.8%' }}></div>
        </div>

        {/* News Content */}
        <section ref={contentAnimation.elementRef} className="bg-white py-24 lg:py-32 2xl:py-40">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
            <div className="max-w-6xl mx-auto">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fase-navy mx-auto"></div>
                  <p className="text-gray-500 mt-4">Loading articles...</p>
                </div>
              ) : articles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {articles.map((article, index) => (
                    <Link
                      key={article.slug}
                      href={`/about/news/${article.slug}`}
                      className={`group transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 block ${
                        contentAnimation.isVisible ? 'scroll-visible' : 'scroll-hidden'
                      }`}
                      style={{
                        transitionDelay: contentAnimation.isVisible ? `${index * 100}ms` : '0ms'
                      }}
                    >
                      <div className="bg-white border border-gray-200 shadow-lg overflow-hidden h-full transition-shadow duration-300 group-hover:shadow-2xl">
                        {article.metadata.bannerImage && (
                          <div className="relative h-48">
                            <Image
                              src={article.metadata.bannerImage}
                              alt={article.metadata.bannerImageAlt || article.metadata.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        )}
                        <div className="p-6">
                          <time className="text-sm text-gray-500" dateTime={article.metadata.date}>
                            {new Date(article.metadata.date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </time>
                          <h3 className="text-xl font-noto-serif font-medium text-fase-navy mt-3 mb-3 leading-snug line-clamp-2">
                            {article.metadata.title}
                          </h3>
                          <p className="text-fase-black leading-relaxed text-sm line-clamp-3">
                            {article.metadata.excerpt}
                          </p>
                        </div>
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
        </section>

        <Footer />
      </div>
    </div>
  );
}
