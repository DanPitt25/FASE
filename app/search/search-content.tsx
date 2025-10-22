'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { searchPages } from '../../lib/search';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
}

export default function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalResults, setTotalResults] = useState<number>(0);

  // Get initial query from URL
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalResults(0);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await searchPages(searchQuery);
      setResults(searchResults);
      setTotalResults(searchResults.length);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const highlightText = (text: string, searchTerm: string): string => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, content, and resources..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-lg"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-fase-navy text-white rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-fase-navy focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching...
                  </div>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </form>

          {/* Search Results */}
          {query && !loading && (
            <div className="mb-6">
              <p className="text-gray-600">
                {totalResults === 0 
                  ? `No results found for "${query}"` 
                  : `Found ${totalResults} result${totalResults === 1 ? '' : 's'} for "${query}"`
                }
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
              <p className="text-gray-600">Searching...</p>
            </div>
          )}

          {/* Results List */}
          {!loading && results.length > 0 && (
            <div className="space-y-6">
              {results.map((result) => (
                <div key={result.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 bg-fase-cream text-fase-navy text-xs rounded-full font-medium mb-2">
                      {result.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-fase-navy mb-2">
                    <a 
                      href={result.url}
                      className="hover:underline"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightText(result.title, query) 
                      }}
                    />
                  </h3>
                  <p 
                    className="text-gray-600 mb-3 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightText(result.description, query) 
                    }}
                  />
                  <a 
                    href={result.url}
                    className="text-fase-navy hover:text-fase-gold font-medium text-sm"
                  >
                    {result.url}
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && query && results.length === 0 && (
            <div className="text-center py-12">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search terms or check your spelling.
              </p>
              <div className="text-left max-w-md mx-auto">
                <h4 className="font-medium text-gray-900 mb-2">Search suggestions:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use different keywords</li>
                  <li>• Try more general terms</li>
                  <li>• Check spelling and try again</li>
                  <li>• Browse our main sections instead</li>
                </ul>
              </div>
            </div>
          )}

          {/* Default State */}
          {!query && !loading && (
            <div className="text-center py-12">
              <div className="mb-4">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Search the FASE website</h3>
              <p className="text-gray-500 mb-6">
                Find pages, content, and resources across our website.
              </p>
              <div className="text-left max-w-md mx-auto">
                <h4 className="font-medium text-gray-900 mb-2">Popular searches:</h4>
                <div className="flex flex-wrap gap-2">
                  {['membership', 'events', 'directory', 'knowledge base', 'sponsors'].map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setQuery(term);
                        performSearch(term);
                      }}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}