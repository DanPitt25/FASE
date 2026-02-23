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
  author: string;
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

async function loadArticle(locale: string): Promise<ArticleContent | null> {
  const slug = locale === 'en' ? 'captives' : `captives-${locale}`;

  try {
    const response = await fetch(`/bulletin/feb-2026/articles/${slug}.md`);
    if (!response.ok) {
      // Fall back to English
      if (locale !== 'en') {
        const enResponse = await fetch('/bulletin/feb-2026/articles/captives.md');
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
      category: metadata.category || 'Contributed Article',
      author: metadata.author || 'Mark Elliott, Polo Insurance Managers'
    },
    html
  };
}

async function getAvailableLanguages(): Promise<string[]> {
  const languages = ['en', 'fr', 'de', 'es', 'it', 'nl'];
  const available: string[] = [];

  for (const lang of languages) {
    const slug = lang === 'en' ? 'captives' : `captives-${lang}`;
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

export default function CaptivesArticle() {
  const { user, loading } = useUnifiedAuth();
  const router = useRouter();
  const locale = useLocale();
  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [currentLocale, setCurrentLocale] = useState(locale);
  const [articleLoading, setArticleLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/member-portal/bulletin/february-2026/captives');
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
        <div className="relative h-[45vh] min-h-[360px] overflow-hidden">
          <Image
            src="/consideration.jpg"
            alt="Strategic considerations"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-4xl mx-auto px-6 pb-10 w-full">
              <Link
                href="/member-portal/bulletin/february-2026"
                className="inline-flex items-center text-white/70 hover:text-white text-sm mb-4"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                February 2026 Edition
              </Link>
              <p className="text-fase-gold text-xs font-semibold uppercase tracking-widest mb-3">
                {article?.metadata.category || 'Contributed Article'}
              </p>
              <h1 className="text-3xl md:text-4xl font-noto-serif font-bold text-white leading-snug mb-3">
                {article?.metadata.title || 'Seven Reasons to Consider a Captive'}
              </h1>
              <p className="text-white/70">By {article?.metadata.author || 'Mark Elliott, Polo Insurance Managers'}</p>
            </div>
          </div>
        </div>

        {/* Language Selector */}
        {availableLanguages.length > 1 && (
          <div className="bg-gray-50 border-b border-gray-200 py-4">
            <div className="max-w-4xl mx-auto px-6">
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
        <article className="max-w-4xl mx-auto px-6 py-10">
          {article?.html ? (
            <div
              className="prose prose-lg max-w-none
                prose-headings:font-noto-serif prose-headings:text-fase-navy
                prose-h2:text-xl prose-h2:font-semibold prose-h2:pt-6 prose-h2:pb-2
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-strong:text-fase-navy
                prose-a:text-fase-navy prose-a:hover:text-fase-gold
                prose-ul:text-gray-600 prose-ul:space-y-2
                prose-li:text-gray-600
                prose-hr:border-gray-200 prose-hr:my-10"
              dangerouslySetInnerHTML={{ __html: article.html }}
            />
          ) : (
            <div className="text-gray-700 leading-relaxed space-y-6">
              <p className="text-lg text-gray-800">
                Loading article content...
              </p>
            </div>
          )}

          {/* Back link */}
          <div className="mt-8">
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
