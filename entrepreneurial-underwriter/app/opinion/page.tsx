import Link from 'next/link';
import { getArticlesByCategory } from '../../data/articles';
import { format } from 'date-fns';

export const metadata = {
  title: 'Opinion | Entrepreneurial Underwriter',
  description: 'Expert perspectives on European delegated underwriting.',
};

export default function OpinionPage() {
  const articles = getArticlesByCategory('opinion');

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-10">Opinion</h1>

      <div className="space-y-8">
        {articles.map((article) => (
          <article key={article.slug}>
            <Link
              href={`/article/${article.slug}`}
              className="group block bg-white rounded-lg p-6 -mx-6 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-bold mb-2 group-hover:text-fase-navy transition-colors">
                {article.title}
              </h2>
              <p className="text-gray-600 mb-3">
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

      {articles.length === 0 && (
        <p className="text-gray-500">No opinion articles yet.</p>
      )}
    </div>
  );
}
