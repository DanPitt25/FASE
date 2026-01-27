import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getArticleBySlug, getLatestArticles } from '../../../data/articles';
import { format } from 'date-fns';

interface ArticlePageProps {
  params: { slug: string };
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const article = getArticleBySlug(params.slug);

  if (!article) {
    notFound();
  }

  const publishedDate = format(new Date(article.publishedAt), 'MMMM d, yyyy');

  const contentParagraphs = article.content
    .split('\n\n')
    .filter((p) => p.trim())
    .map((p) => p.trim());

  return (
    <div className="bg-white">
      <article className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-10">
          <Link
            href={`/${article.category}`}
            className="text-sm text-gray-500 uppercase tracking-wide hover:text-fase-navy transition-colors"
          >
            {article.category}
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mt-4 mb-5 leading-tight text-gray-900">
            {article.title}
          </h1>
          <p className="text-xl text-gray-600 mb-6 leading-relaxed">
            {article.standfirst}
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500 pt-6 border-t border-gray-100">
            <span className="font-medium text-gray-900">{article.author.name}</span>
            <span className="text-gray-300">·</span>
            <time dateTime={article.publishedAt}>{publishedDate}</time>
          </div>
        </header>

        <div className="article-body text-lg">
          {contentParagraphs.map((paragraph, index) => {
            if (paragraph.startsWith('## ')) {
              return (
                <h2 key={index}>
                  {paragraph.replace('## ', '')}
                </h2>
              );
            }
            if (paragraph.startsWith('> ')) {
              return (
                <blockquote key={index}>
                  {paragraph.replace('> ', '')}
                </blockquote>
              );
            }
            return (
              <p key={index}>
                {paragraph}
              </p>
            );
          })}
        </div>

        <footer className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-6">
            <span className="font-medium text-gray-900">{article.author.name}</span>
            {' '}is {article.author.role}.
          </p>
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-fase-navy hover:text-fase-orange transition-colors"
          >
            <span className="mr-2">&larr;</span>
            Back to all articles
          </Link>
        </footer>
      </article>
    </div>
  );
}

export async function generateStaticParams() {
  const articles = getLatestArticles(100);
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const article = getArticleBySlug(params.slug);

  if (!article) {
    return { title: 'Article Not Found' };
  }

  return {
    title: `${article.title} | Entrepreneurial Underwriter`,
    description: article.standfirst,
  };
}
