import Fuse from 'fuse.js';

export interface SearchDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  category: string;
  date?: string;
}

export interface SearchResult extends SearchDocument {
  score?: number;
}

// Cache search indices by locale
const searchIndices: Map<string, SearchDocument[]> = new Map();
const fuseInstances: Map<string, Fuse<SearchDocument>> = new Map();

// Fuse.js configuration - balanced for good results
const fuseOptions: Fuse.IFuseOptions<SearchDocument> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'description', weight: 0.3 },
    { name: 'content', weight: 0.25 },
    { name: 'category', weight: 0.05 }
  ],
  threshold: 0.4,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  shouldSort: true,
  findAllMatches: true,
  ignoreLocation: true,
  useExtendedSearch: false
};

// Load the search index for a specific locale
async function loadSearchIndex(locale: string = 'en'): Promise<SearchDocument[]> {
  // Check cache first
  if (searchIndices.has(locale)) {
    return searchIndices.get(locale)!;
  }

  try {
    // Try locale-specific index first, fall back to default
    let response = await fetch(`/search-index-${locale}.json`);
    if (!response.ok) {
      response = await fetch('/search-index.json');
    }
    if (!response.ok) {
      throw new Error('Failed to load search index');
    }

    const index = await response.json();
    searchIndices.set(locale, index);
    fuseInstances.set(locale, new Fuse(index, fuseOptions));
    return index;
  } catch (error) {
    console.error('Error loading search index:', error);
    return [];
  }
}

// Main search function
export async function searchPages(query: string, locale: string = 'en'): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  await loadSearchIndex(locale);

  const fuse = fuseInstances.get(locale);
  if (!fuse) {
    return [];
  }

  const results = fuse.search(query.trim());

  return results.map(result => ({
    ...result.item,
    score: result.score
  }));
}

// Get suggestions based on partial query
export async function getSearchSuggestions(query: string, locale: string = 'en'): Promise<string[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const results = await searchPages(query, locale);
  const suggestions = new Set<string>();

  results.slice(0, 5).forEach(result => {
    const titleWords = result.title.toLowerCase().split(/\s+/);
    titleWords.forEach(word => {
      if (word.length > 2 && word.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(word);
      }
    });
  });

  return Array.from(suggestions).slice(0, 5);
}

// Get popular search terms
export function getPopularSearchTerms(): string[] {
  return [
    'membership',
    'rendezvous',
    'barcelona',
    'directory',
    'sponsors',
    'partners',
    'news',
    'events',
    'join',
    'contact'
  ];
}
