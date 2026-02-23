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

interface MemberNewsItem {
  id: string;
  memberName: string;
  memberLogo?: string;
  title: string;
  date: string;
  excerpt: string;
  link?: string;
}

// Sample member news data - in production this would come from Firestore
const sampleMemberNews: MemberNewsItem[] = [
  {
    id: '1',
    memberName: 'Axeria',
    memberLogo: '/members/axeria.png',
    title: 'Axeria Expands Property Portfolio with New Lloyd\'s Facility',
    date: '2026-02-10',
    excerpt: 'Axeria has secured a new Lloyd\'s facility to expand its property underwriting capacity across Continental Europe, strengthening its position in the commercial property market.',
    link: 'https://axeria.com/news'
  },
  {
    id: '2',
    memberName: 'Noma Underwriting',
    memberLogo: '/members/noma.png',
    title: 'Noma Underwriting Launches Innovative Cyber Product for SMEs',
    date: '2026-02-05',
    excerpt: 'Noma Underwriting has introduced a new cyber insurance product specifically designed for small and medium enterprises, featuring simplified underwriting and competitive pricing.',
    link: 'https://nomaunderwriting.com/news'
  },
  {
    id: '3',
    memberName: 'Rokstone',
    memberLogo: '/members/rokstone.png',
    title: 'Rokstone Achieves Record Growth in European Markets',
    date: '2026-01-28',
    excerpt: 'Rokstone has reported record growth across its European operations, with significant expansion in the German and French markets during 2025.',
  },
  {
    id: '4',
    memberName: 'Pen Underwriting',
    memberLogo: '/members/pen.png',
    title: 'Pen Underwriting Appoints New Head of European Operations',
    date: '2026-01-20',
    excerpt: 'Pen Underwriting has announced the appointment of a new Head of European Operations to lead the company\'s strategic expansion across the continent.',
  },
];

type TabType = 'fase-news' | 'member-news';

export default function NewsPage() {
  const t = useTranslations('news');
  const locale = useLocale();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('fase-news');

  useEffect(() => {
    async function loadArticles() {
      try {
        const baseArticleSlugs = ['am-best-partnership', 'bridgehaven-partnership', 'mga-rendezvous', 'clyde-co-partnership', 'fase-formation-announcement', 'sample-press-release'];

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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <nav className="flex justify-center">
                <button
                  onClick={() => setActiveTab('fase-news')}
                  className={`px-8 py-5 text-base font-medium border-b-2 transition-colors ${
                    activeTab === 'fase-news'
                      ? 'border-fase-navy text-fase-navy'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  FASE News
                </button>
                <button
                  onClick={() => setActiveTab('member-news')}
                  className={`px-8 py-5 text-base font-medium border-b-2 transition-colors ${
                    activeTab === 'member-news'
                      ? 'border-fase-navy text-fase-navy'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Member News
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-50 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">

              {/* FASE News Tab */}
              {activeTab === 'fase-news' && (
                <div>
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
              )}

              {/* Member News Tab */}
              {activeTab === 'member-news' && (
                <div>
                  <p className="text-gray-600 mb-10 max-w-3xl">
                    Updates and announcements from FASE member organisations across Europe.
                  </p>

                  <div className="space-y-4">
                    {sampleMemberNews.map((item) => (
                      <article
                        key={item.id}
                        className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row gap-6"
                      >
                        {/* Member Logo */}
                        <div className="flex-shrink-0 flex items-start justify-center md:w-28">
                          {item.memberLogo ? (
                            <div className="w-20 h-20 relative bg-white rounded border border-gray-100 p-2 flex items-center justify-center">
                              <Image
                                src={item.memberLogo}
                                alt={item.memberName}
                                width={64}
                                height={64}
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 bg-fase-navy rounded flex items-center justify-center">
                              <span className="text-white font-semibold text-xl">
                                {item.memberName.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-grow min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-sm font-medium text-fase-navy">
                              {item.memberName}
                            </span>
                            <span className="text-gray-300">|</span>
                            <time className="text-sm text-gray-500" dateTime={item.date}>
                              {new Date(item.date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </time>
                          </div>
                          <h3 className="text-lg font-noto-serif font-semibold text-gray-900 mb-2">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed mb-3">
                            {item.excerpt}
                          </p>
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-fase-navy text-sm font-medium hover:underline"
                            >
                              Read more
                              <svg className="ml-1.5 w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Submit News CTA */}
                  <div className="mt-10 bg-white rounded-lg border border-gray-100 shadow-sm p-8 text-center">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">
                      Share Your News
                    </h3>
                    <p className="text-gray-600 mb-5 max-w-lg mx-auto">
                      FASE members can submit company news and announcements for inclusion in this section.
                    </p>
                    <a
                      href="mailto:media@fasemga.com?subject=Member News Submission"
                      className="inline-flex items-center px-5 py-2.5 bg-fase-navy text-white rounded font-medium text-sm hover:bg-fase-navy/90 transition-colors"
                    >
                      Submit News
                    </a>
                  </div>
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
