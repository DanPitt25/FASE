'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { marked } from 'marked';

interface ArticleMetadata {
  title: string;
  date: string;
  excerpt: string;
  author?: string;
}

export default function NewsArticlePage() {
  const params = useParams();
  const t = useTranslations('news');
  const [article, setArticle] = useState<{ metadata: ArticleMetadata; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadArticle() {
      try {
        const response = await fetch(`/news/${params.slug}.md`);
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
        
        setArticle({ metadata, content: htmlContent });
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (params.slug) {
      loadArticle();
    }
  }, [params.slug]);

  if (loading) {
    return (
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
    );
  }

  if (error || !article) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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

      {/* Article Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div 
            className="prose prose-lg prose-slate max-w-none
              prose-headings:font-noto-serif prose-headings:text-fase-navy
              prose-h1:text-3xl prose-h1:mb-8 prose-h1:mt-12
              prose-h2:text-2xl prose-h2:mb-6 prose-h2:mt-10
              prose-h3:text-xl prose-h3:mb-4 prose-h3:mt-8
              prose-p:text-fase-black prose-p:leading-relaxed prose-p:mb-6
              prose-a:text-fase-navy prose-a:no-underline hover:prose-a:underline
              prose-strong:text-fase-navy prose-strong:font-semibold
              prose-ul:my-6 prose-ol:my-6
              prose-li:text-fase-black prose-li:mb-2
              prose-blockquote:border-l-4 prose-blockquote:border-fase-navy prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-slate-600
              prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
              prose-pre:bg-gray-900 prose-pre:text-white prose-pre:rounded-lg prose-pre:p-4"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </div>
    </div>
  );
}