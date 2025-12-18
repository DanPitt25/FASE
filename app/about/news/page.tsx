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
  bannerImage?: string;
  bannerImageAlt?: string;
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
        // For now, manually list the known articles
        // In a real app, you'd have an API endpoint that lists all markdown files
        const baseArticleSlugs = ['mga-rendezvous', 'clyde-co-partnership', 'fase-formation-announcement', 'sample-press-release'];
        
        const articlePromises = baseArticleSlugs.map(async (baseSlug) => {
          try {
            // Try to load the article in the current locale first
            const localeSlug = locale === 'en' ? baseSlug : `${baseSlug}-${locale}`;
            let response = await fetch(`/news/${localeSlug}.md`);
            
            // If not found in current locale, fall back to English
            if (!response.ok && locale !== 'en') {
              response = await fetch(`/news/${baseSlug}.md`);
            }
            
            if (!response.ok) return null;
            
            const slug = response.url.includes(`${baseSlug}-${locale}`) ? localeSlug : baseSlug;
            
            const text = await response.text();
            const lines = text.split('\n');
            
            // Extract frontmatter
            let metadataEnd = 0;
            const metadata: any = {};
            
            if (lines[0] === '---') {
              for (let i = 1; i < lines.length; i++) {
                if (lines[i] === '---') {
                  metadataEnd = i + 1;
                  break;
                }
                const [key, ...valueParts] = lines[i].split(':');
                if (key && valueParts.length) {
                  metadata[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
                }
              }
            }
            
            return { slug, metadata };
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
        <div className="relative h-96 overflow-hidden">
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
              <h1 className="text-4xl md:text-6xl font-noto-serif font-bold mb-4 text-white max-w-4xl">
                {t('page.title')}
              </h1>
            </div>
          </div>
        </div>

        {/* Intro Section */}
        <div className="bg-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-noto-serif font-bold text-fase-navy mb-8">
                {t('intro.title')}
              </h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  {t('intro.content.paragraph1')}
                </p>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {t('intro.content.paragraph2')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Updates Section */}
        <div className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-noto-serif font-bold text-fase-navy mb-12 text-center">
                {t('latest_updates.title')}
              </h2>
              
              {loading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading articles...</p>
                </div>
              ) : articles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {articles.map((article) => (
                    <Link 
                      key={article.slug}
                      href={`/about/news/${article.slug}`}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
                    >
                      {article.metadata.bannerImage && (
                        <div className="aspect-video relative overflow-hidden">
                          <Image 
                            src={article.metadata.bannerImage}
                            alt={article.metadata.bannerImageAlt || article.metadata.title}
                            fill
                            className="object-cover transition-transform duration-200 hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="text-sm text-gray-500 mb-3">
                          <time dateTime={article.metadata.date}>
                            {new Date(article.metadata.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </time>
                        </div>
                        <h3 className="text-xl font-noto-serif font-bold text-fase-navy mb-3 leading-tight line-clamp-2">
                          {article.metadata.title}
                        </h3>
                        <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
                          {article.metadata.excerpt}
                        </p>
                        <div className="flex items-center text-fase-navy font-medium text-sm group">
                          <span className="group-hover:underline">Read more</span>
                          <svg className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">No articles found.</p>
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