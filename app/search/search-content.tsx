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
    <div className="py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-fase-navy"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-fase-navy text-white rounded hover:bg-blue-800 focus:outline-none disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Results count */}
        {query && !loading && totalResults > 0 && (
          <p className="text-gray-600 mb-6">
            {totalResults} result{totalResults === 1 ? '' : 's'}
          </p>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fase-navy mx-auto"></div>
          </div>
        )}

          {/* Results List */}
          {!loading && results.length > 0 && (
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <h3 className="text-lg font-medium text-fase-navy mb-1">
                    <a 
                      href={result.url}
                      className="hover:underline"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightText(result.title, query) 
                      }}
                    />
                  </h3>
                  <p 
                    className="text-gray-600 text-sm mb-1"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightText(result.description, query) 
                    }}
                  />
                  <span className="text-xs text-gray-500">{result.category}</span>
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
              <p className="text-gray-600">No results found. Try different keywords.</p>
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
              <p className="text-gray-600">Enter a search term above.</p>
            </div>
          )}
      </div>
    </div>
  );
}