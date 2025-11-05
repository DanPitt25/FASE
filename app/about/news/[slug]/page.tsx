'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { marked } from 'marked';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';

interface ArticleMetadata {
  title: string;
  date: string;
  excerpt: string;
  author?: string;
}

export default function NewsArticlePage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('news');
  const [article, setArticle] = useState<{ metadata: ArticleMetadata; content: string } | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<{code: string, name: string, slug: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadArticle() {
      try {
        const currentSlug = params.slug as string;
        
        // Check if we should redirect to locale-specific version
        if (locale !== 'en' && !currentSlug.endsWith(`-${locale}`)) {
          // Try to load the locale-specific version
          const localeSlug = `${currentSlug}-${locale}`;
          const localeResponse = await fetch(`/news/${localeSlug}.md`);
          if (localeResponse.ok) {
            // Redirect to locale-specific version
            router.replace(`/about/news/${localeSlug}`);
            return;
          }
        }
        
        const response = await fetch(`/news/${currentSlug}.md`);
        if (!response.ok) throw new Error('Article not found');
        
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
        
        const content = lines.slice(metadataEnd).join('\n');
        const htmlContent = marked(content);
        
        console.log('Parsed metadata:', metadata);
        console.log('Content length:', content.length);
        
        setArticle({ metadata, content: htmlContent });

        // Check for available languages
        // First determine the base slug (remove language suffix if present)
        const articleSlug = params.slug as string;
        const baseSlug = articleSlug.replace(/-(?:fr|es|de|nl|it)$/, '');
        
        const languages = [
          { code: 'en', name: 'English', slug: baseSlug },
          { code: 'fr', name: 'Français', slug: `${baseSlug}-fr` },
          { code: 'es', name: 'Español', slug: `${baseSlug}-es` },
          { code: 'de', name: 'Deutsch', slug: `${baseSlug}-de` },
          { code: 'nl', name: 'Nederlands', slug: `${baseSlug}-nl` },
          { code: 'it', name: 'Italiano', slug: `${baseSlug}-it` }
        ];

        const availableLangs = [];
        for (const lang of languages) {
          try {
            const langResponse = await fetch(`/news/${lang.slug}.md`);
            if (langResponse.ok) {
              availableLangs.push(lang);
            }
          } catch (err) {
            // Language version doesn't exist, skip
          }
        }
        
        setAvailableLanguages(availableLangs);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (params.slug) {
      loadArticle();
    }
  }, [params.slug, locale, router]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-white">
          <div className="container mx-auto px-4 py-16">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !article) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-white">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center">
              <h1 className="text-3xl font-noto-serif font-bold text-fase-navy mb-4">Article Not Found</h1>
              <p className="text-fase-black mb-8">The article you&apos;re looking for doesn&apos;t exist.</p>
              <Link 
                href="/about/news" 
                className="inline-flex items-center px-6 py-3 bg-fase-navy text-white rounded-lg hover:bg-blue-800 transition-colors"
              >
                Back to News
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white">
        {/* Hero Banner with Title */}
        {article.metadata.bannerImage ? (
          <div className="relative h-96 overflow-hidden">
            <img 
              src={article.metadata.bannerImage} 
              alt={article.metadata.bannerImageAlt || article.metadata.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            <div className="absolute inset-0 flex items-center">
              <div className="container mx-auto px-4">
                <nav className="mb-6">
                  <Link 
                    href="/about/news" 
                    className="text-white/80 hover:text-white transition-colors inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to News
                  </Link>
                </nav>
                <h1 className="text-4xl md:text-6xl font-noto-serif font-bold mb-4 text-white max-w-4xl">{article.metadata.title}</h1>
                <div className="flex flex-wrap items-center text-white/80 text-sm space-x-4">
                  <time>{new Date(article.metadata.date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</time>
                  {article.metadata.author && (
                    <span>By {article.metadata.author}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Fallback for articles without banner images
          <div className="bg-gradient-to-r from-fase-navy to-blue-800 text-white py-16">
            <div className="container mx-auto px-4">
              <nav className="mb-6">
                <Link 
                  href="/about/news" 
                  className="text-blue-200 hover:text-white transition-colors inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to News
                </Link>
              </nav>
              <h1 className="text-4xl md:text-5xl font-noto-serif font-bold mb-4">{article.metadata.title}</h1>
              <div className="flex flex-wrap items-center text-blue-200 text-sm space-x-4">
                <time>{new Date(article.metadata.date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</time>
                {article.metadata.author && (
                  <span>By {article.metadata.author}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Language Selector */}
        {availableLanguages.length > 1 && (
          <div className="bg-gray-50 border-b border-gray-200 py-4">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="font-medium">{t('article.also_available_in')}</span>
                  <div className="flex items-center space-x-3">
                    {availableLanguages.map((lang, index) => (
                      <div key={lang.code} className="flex items-center space-x-3">
                        <a 
                          href={`/about/news/${lang.slug}`} 
                          className={`hover:underline ${lang.code === 'en' ? 'text-fase-navy font-medium' : 'text-fase-navy'}`}
                        >
                          {lang.name}
                        </a>
                        {index < availableLanguages.length - 1 && (
                          <span className="text-gray-300">•</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Article Content */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div 
                className="prose prose-2xl prose-slate max-w-none
                  prose-headings:font-noto-serif prose-headings:text-fase-navy
                  prose-h1:text-6xl prose-h1:mb-16 prose-h1:mt-24 prose-h1:leading-tight prose-h1:font-bold
                  prose-h2:text-5xl prose-h2:mb-14 prose-h2:mt-20 prose-h2:leading-tight prose-h2:font-semibold
                  prose-h3:text-4xl prose-h3:mb-12 prose-h3:mt-16 prose-h3:font-medium
                  prose-p:text-gray-800 prose-p:leading-loose prose-p:mb-24 prose-p:text-2xl prose-p:font-light prose-p:tracking-wide
                  prose-p:first-of-type:text-3xl prose-p:first-of-type:font-normal prose-p:first-of-type:leading-relaxed prose-p:first-of-type:mb-28
                  prose-a:text-fase-navy prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                  prose-strong:text-fase-navy prose-strong:font-semibold prose-strong:text-2xl
                  prose-ul:my-14 prose-ol:my-14 prose-ul:text-2xl prose-ol:text-2xl
                  prose-li:text-gray-800 prose-li:mb-6 prose-li:leading-relaxed prose-li:font-light
                  prose-blockquote:border-l-8 prose-blockquote:border-fase-navy prose-blockquote:pl-12 prose-blockquote:italic prose-blockquote:text-gray-700 prose-blockquote:text-2xl prose-blockquote:my-16 prose-blockquote:font-light prose-blockquote:bg-gray-50 prose-blockquote:py-10 prose-blockquote:rounded-r-lg
                  prose-code:bg-gray-100 prose-code:px-3 prose-code:py-1 prose-code:rounded prose-code:text-xl
                  prose-pre:bg-gray-900 prose-pre:text-white prose-pre:rounded-lg prose-pre:p-10
                  prose-hr:border-gray-300 prose-hr:my-20 prose-hr:border-t-2
                  [&>p]:indent-8 [&>p:first-of-type]:indent-0"
                style={{
                  textAlign: 'justify',
                  hyphens: 'auto'
                }}
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}