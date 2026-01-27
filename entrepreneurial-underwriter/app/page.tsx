import Link from 'next/link';
import { getLatestArticles } from '../data/articles';
import { format } from 'date-fns';

export default function HomePage() {
  const articles = getLatestArticles(10);
  const [featured, ...rest] = articles;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Featured Article */}
      {featured && (
        <article className="mb-16">
          <Link href={`/article/${featured.slug}`} className="group block">
            <p className="text-sm text-gray-500 mb-3 uppercase tracking-wide">
              {featured.category}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight group-hover:text-fase-navy transition-colors">
              {featured.title}
            </h2>
            <p className="text-lg text-gray-600 mb-4 leading-relaxed max-w-2xl">
              {featured.standfirst}
            </p>
            <p className="text-sm text-gray-500">
              {featured.author.name}
              <span className="mx-2 text-gray-300">·</span>
              {format(new Date(featured.publishedAt), 'MMMM d, yyyy')}
            </p>
          </Link>
        </article>
      )}

      {/* Divider */}
      <div className="border-t border-gray-200 mb-10" />

      {/* Rest of Articles */}
      <div className="space-y-8">
        {rest.map((article) => (
          <article key={article.slug}>
            <Link
              href={`/article/${article.slug}`}
              className="group block bg-white rounded-lg p-6 -mx-6 hover:shadow-md transition-shadow"
            >
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
                {article.category}
              </p>
              <h3 className="text-xl font-bold mb-2 group-hover:text-fase-navy transition-colors">
                {article.title}
              </h3>
              <p className="text-gray-600 mb-3 line-clamp-2">
                {article.standfirst}
              </p>
              <p className="text-sm text-gray-500">
                {article.author.name}
                <span className="mx-2 text-gray-300">·</span>
                {format(new Date(article.publishedAt), 'MMM d, yyyy')}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
