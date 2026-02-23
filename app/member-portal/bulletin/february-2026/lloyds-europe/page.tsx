'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { marked } from 'marked';
import { useUnifiedAuth } from '../../../../../contexts/UnifiedAuthContext';
import PageLayout from '../../../../../components/PageLayout';
import Image from 'next/image';
import Link from 'next/link';

interface ArticleMetadata {
  title: string;
  category: string;
}

interface ArticleContent {
  metadata: ArticleMetadata;
  html: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands'
};

function ChartModal({
  isOpen,
  onClose,
  src,
  alt,
  title
}: {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  title: string;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-fase-navy">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <Image
            src={src}
            alt={alt}
            width={838}
            height={600}
            className="w-full h-auto"
          />
        </div>
        <div className="px-5 py-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
          Source: Lloyd&apos;s
        </div>
      </div>
    </div>
  );
}

function ChartFigure({
  src,
  alt,
  title,
  caption
}: {
  src: string;
  alt: string;
  title: string;
  caption: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <figure
        className="group cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative overflow-hidden rounded border border-gray-200 bg-white">
          <Image
            src={src}
            alt={alt}
            width={838}
            height={500}
            className="w-full h-auto transition-transform group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-fase-navy text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
              Click to expand
            </span>
          </div>
        </div>
        <figcaption className="mt-2 text-xs text-gray-500">{caption}</figcaption>
      </figure>
      <ChartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        src={src}
        alt={alt}
        title={title}
      />
    </>
  );
}

async function loadArticle(locale: string): Promise<ArticleContent | null> {
  const slug = locale === 'en' ? 'lloyds-europe' : `lloyds-europe-${locale}`;

  try {
    const response = await fetch(`/bulletin/feb-2026/articles/${slug}.md`);
    if (!response.ok) {
      // Fall back to English
      if (locale !== 'en') {
        const enResponse = await fetch('/bulletin/feb-2026/articles/lloyds-europe.md');
        if (!enResponse.ok) return null;
        const text = await enResponse.text();
        return parseMarkdown(text);
      }
      return null;
    }
    const text = await response.text();
    return parseMarkdown(text);
  } catch {
    return null;
  }
}

function parseMarkdown(text: string): ArticleContent {
  const lines = text.split('\n');
  const metadata: Record<string, string> = {};
  let metadataEnd = 0;

  if (lines[0] === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        metadataEnd = i + 1;
        break;
      }
      const colonIndex = lines[i].indexOf(':');
      if (colonIndex > 0) {
        const key = lines[i].slice(0, colonIndex).trim();
        const value = lines[i].slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
        metadata[key] = value;
      }
    }
  }

  const content = lines.slice(metadataEnd).join('\n');
  const html = marked(content) as string;

  return {
    metadata: {
      title: metadata.title || '',
      category: metadata.category || 'Feature'
    },
    html
  };
}

async function getAvailableLanguages(): Promise<string[]> {
  const languages = ['en', 'fr', 'de', 'es', 'it', 'nl'];
  const available: string[] = [];

  for (const lang of languages) {
    const slug = lang === 'en' ? 'lloyds-europe' : `lloyds-europe-${lang}`;
    try {
      const response = await fetch(`/bulletin/feb-2026/articles/${slug}.md`);
      if (response.ok) {
        available.push(lang);
      }
    } catch {
      // Not available
    }
  }

  return available;
}

export default function LloydsEuropeArticle() {
  const { user, loading } = useUnifiedAuth();
  const router = useRouter();
  const locale = useLocale();
  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [currentLocale, setCurrentLocale] = useState(locale);
  const [articleLoading, setArticleLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/member-portal/bulletin/february-2026/lloyds-europe');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function load() {
      setArticleLoading(true);
      const [content, languages] = await Promise.all([
        loadArticle(locale),
        getAvailableLanguages()
      ]);
      setArticle(content);
      setAvailableLanguages(languages);
      setCurrentLocale(locale);
      setArticleLoading(false);
    }

    if (user) {
      load();
    }
  }, [locale, user]);

  if (loading || articleLoading) {
    return (
      <PageLayout currentPage="member-portal">
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout currentPage="member-portal">
      <main className="min-h-screen bg-white">
        {/* Hero */}
        <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
          <Image
            src="/bulletin/feb-2026/lloyds-building.jpg"
            alt="Lloyd's of London"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-5xl mx-auto px-6 pb-12 w-full">
              <Link
                href="/member-portal/bulletin/february-2026"
                className="inline-flex items-center text-white/60 hover:text-white text-sm mb-6 transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                February 2026
              </Link>
              <p className="text-fase-gold text-xs font-semibold uppercase tracking-widest mb-3">
                {article?.metadata.category || 'Feature'}
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-noto-serif font-bold text-white leading-tight max-w-3xl">
                {article?.metadata.title || "Lloyd's in Europe: Coverholder Business Growing Fast After 123 Years"}
              </h1>
            </div>
          </div>
        </div>

        {/* Language Selector */}
        {availableLanguages.length > 1 && (
          <div className="bg-gray-50 border-b border-gray-200 py-4">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="font-medium">Also available in:</span>
                <div className="flex items-center space-x-3">
                  {availableLanguages.map((lang, index) => (
                    <div key={lang} className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          loadArticle(lang).then(content => {
                            if (content) {
                              setArticle(content);
                              setCurrentLocale(lang);
                            }
                          });
                        }}
                        className={`hover:underline ${
                          lang === currentLocale
                            ? 'text-fase-navy font-semibold'
                            : 'text-fase-navy'
                        }`}
                      >
                        {LANGUAGE_NAMES[lang]}
                      </button>
                      {index < availableLanguages.length - 1 && (
                        <span className="text-gray-300">•</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Article Content */}
        <article className="max-w-5xl mx-auto px-6">

          {/* Two column layout: Text | Charts */}
          <div className="py-10">
            <div className="lg:grid lg:grid-cols-5 lg:gap-16">
              {/* Text column */}
              <div className="lg:col-span-3">
                {article?.html ? (
                  <div
                    className="prose prose-lg max-w-none
                      prose-headings:font-noto-serif prose-headings:text-fase-navy
                      prose-h2:text-2xl prose-h2:font-semibold prose-h2:pt-4
                      prose-p:text-gray-700 prose-p:leading-relaxed
                      prose-strong:text-fase-navy
                      prose-a:text-fase-navy prose-a:hover:text-fase-gold
                      prose-ul:text-gray-600 prose-ul:space-y-2
                      prose-li:text-gray-600
                      prose-hr:border-gray-100 prose-hr:my-6"
                    dangerouslySetInnerHTML={{ __html: article.html }}
                  />
                ) : (
                  <div className="text-gray-700 leading-relaxed space-y-6">
                    <p className="text-xl text-gray-800">
                      Loading article content...
                    </p>
                  </div>
                )}
              </div>

              {/* Charts column */}
              <div className="lg:col-span-2 mt-10 lg:mt-0 space-y-8">
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-pie-chart.png"
                  alt="Lloyd's Binder Business breakdown by class"
                  title="Lloyd's Binder Business, EEA + Switzerland, 2025"
                  caption="Binder business by class. Total: €1.685bn"
                />
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-coverholder-count.png"
                  alt="Number of Lloyd's coverholders by country"
                  title="Accredited Lloyd's Coverholders by Country, 2025"
                  caption="Number of accredited coverholders by market"
                />
                <ChartFigure
                  src="/bulletin/feb-2026/lloyds-penetration.png"
                  alt="Coverholder penetration by market"
                  title="Coverholder Penetration by Market, 2025"
                  caption="Penetration ranges from 61% (Italy) to 8% (Switzerland)"
                />
              </div>
            </div>
          </div>

          {/* Back link */}
          <div className="pb-12">
            <Link
              href="/member-portal/bulletin/february-2026"
              className="inline-flex items-center text-fase-navy text-sm font-medium hover:underline"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to February 2026 Edition
            </Link>
          </div>
        </article>
      </main>
    </PageLayout>
  );
}
