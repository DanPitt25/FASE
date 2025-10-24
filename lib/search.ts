import Fuse from 'fuse.js';

export interface SearchableContent {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  category: string;
  keywords?: string[];
}

// Comprehensive content index for all site pages
const searchablePages: SearchableContent[] = [
  // Main pages
  {
    id: 'home',
    title: 'Federation of European MGAs',
    description: 'The leading professional association for Managing General Agents across Europe',
    content: 'FASE Federation European MGAs managing general agents professional association membership directory events knowledge base industry advocacy capacity transparency market intelligence digital platform networking',
    url: '/',
    category: 'Main Page',
    keywords: ['home', 'main', 'federation', 'european', 'mga', 'association']
  },
  
  // About section
  {
    id: 'about',
    title: 'About FASE',
    description: 'Learn about the Federation of European MGAs and our mission',
    content: 'About FASE federation mission vision values history leadership team board directors advisory council membership benefits professional development industry standards',
    url: '/about',
    category: 'About',
    keywords: ['about', 'mission', 'vision', 'history', 'leadership']
  },
  {
    id: 'who-we-are',
    title: 'Who We Are',
    description: 'Discover the people and organizations behind FASE',
    content: 'Who we are FASE team leadership board directors management staff organization structure governance mission statement values principles',
    url: '/about/who-we-are',
    category: 'About',
    keywords: ['team', 'leadership', 'board', 'directors', 'governance']
  },
  {
    id: 'leadership',
    title: 'Leadership Team',
    description: 'Meet the leadership team driving FASE forward',
    content: 'Leadership team executive board directors CEO management senior staff organizational structure governance committee chairs',
    url: '/about/leadership',
    category: 'About',
    keywords: ['leadership', 'executives', 'board', 'management', 'directors']
  },
  {
    id: 'advisory-board',
    title: 'Advisory Board',
    description: 'Our distinguished advisory board members and their expertise',
    content: 'Advisory board members experts industry leaders consultants advisors strategic guidance expertise experience knowledge mentorship',
    url: '/about/advisory-board',
    category: 'About',
    keywords: ['advisory', 'board', 'experts', 'advisors', 'guidance']
  },
  {
    id: 'affiliates',
    title: 'Affiliates & Partners',
    description: 'Our network of affiliated organizations and strategic partners',
    content: 'Affiliates partners strategic alliances network organizations associations collaborations partnerships international relationships',
    url: '/about/affiliates',
    category: 'About',
    keywords: ['affiliates', 'partners', 'alliances', 'network', 'collaborations']
  },
  {
    id: 'sponsors',
    title: 'Sponsors',
    description: 'Companies and organizations supporting FASE initiatives',
    content: 'Sponsors supporters corporate partners financial backing funding grants donations contributions sponsorship opportunities',
    url: '/about/sponsors',
    category: 'About',
    keywords: ['sponsors', 'supporters', 'funding', 'partnerships', 'corporate']
  },
  {
    id: 'people',
    title: 'Our People',
    description: 'The professionals who make up our community',
    content: 'People staff team members professionals experts specialists community volunteers contributors workforce talent',
    url: '/about/people',
    category: 'About',
    keywords: ['people', 'staff', 'team', 'professionals', 'community']
  },
  {
    id: 'membership-directory',
    title: 'Membership Directory',
    description: 'Directory of our member organizations and professionals',
    content: 'Membership directory members list organizations companies contacts database search browse member profiles',
    url: '/about/membership-directory',
    category: 'About',
    keywords: ['directory', 'members', 'organizations', 'contacts', 'database']
  },
  {
    id: 'news',
    title: 'News & Updates',
    description: 'Latest news and updates from FASE and the industry',
    content: 'News updates announcements press releases industry news regulatory updates market insights publications newsletter',
    url: '/about/news',
    category: 'News',
    keywords: ['news', 'updates', 'announcements', 'press', 'industry']
  },

  // Membership
  {
    id: 'join',
    title: 'Join FASE',
    description: 'Become a member of the Federation of European MGAs',
    content: 'Join membership application benefits requirements fees corporate individual associate member types registration signup',
    url: '/join',
    category: 'Membership',
    keywords: ['join', 'membership', 'application', 'benefits', 'registration']
  },
  {
    id: 'join-company',
    title: 'Company Membership',
    description: 'Information about corporate membership options',
    content: 'Company corporate membership organizational institutional business enterprise membership benefits fees application process',
    url: '/join-company',
    category: 'Membership',
    keywords: ['company', 'corporate', 'business', 'organizational', 'enterprise']
  },

  // Services
  {
    id: 'industry-advocacy',
    title: 'Industry Advocacy',
    description: 'Our advocacy efforts for the MGA industry',
    content: 'Industry advocacy regulatory representation government relations policy development lobbying industry standards professional advocacy',
    url: '/industry-advocacy',
    category: 'Services',
    keywords: ['advocacy', 'regulatory', 'government', 'policy', 'lobbying']
  },
  {
    id: 'capacity-transparency',
    title: 'Capacity Transparency',
    description: 'Promoting transparency in capacity allocation and management',
    content: 'Capacity transparency allocation management distribution underwriting capacity capital markets risk sharing transparency initiatives',
    url: '/capacity-transparency',
    category: 'Services',
    keywords: ['capacity', 'transparency', 'allocation', 'underwriting', 'capital']
  },
  {
    id: 'market-intelligence',
    title: 'Market Intelligence',
    description: 'Market insights and intelligence for MGAs',
    content: 'Market intelligence insights analytics data research trends analysis market reports industry statistics performance metrics',
    url: '/market-intelligence',
    category: 'Services',
    keywords: ['market', 'intelligence', 'insights', 'analytics', 'trends']
  },
  {
    id: 'digital-platform',
    title: 'Digital Platform',
    description: 'Our digital platform for member collaboration',
    content: 'Digital platform technology online portal member portal collaboration tools digital transformation technology solutions',
    url: '/digital-platform',
    category: 'Services',
    keywords: ['digital', 'platform', 'technology', 'portal', 'collaboration']
  },

  // Knowledge & Resources
  {
    id: 'knowledge',
    title: 'Knowledge Center',
    description: 'Resources and knowledge base for MGA professionals',
    content: 'Knowledge center resources library documentation guides best practices training materials educational content learning',
    url: '/knowledge',
    category: 'Resources',
    keywords: ['knowledge', 'resources', 'library', 'guides', 'training']
  },
  {
    id: 'knowledge-webinars',
    title: 'Webinars',
    description: 'Educational webinars and training sessions',
    content: 'Webinars training sessions educational content online learning professional development courses workshops seminars',
    url: '/knowledge/webinars',
    category: 'Resources',
    keywords: ['webinars', 'training', 'education', 'learning', 'courses']
  },
  {
    id: 'entrepreneurial-underwriter',
    title: 'Entrepreneurial Underwriter',
    description: 'Resources for entrepreneurial underwriters',
    content: 'Entrepreneurial underwriter entrepreneurship business development startup underwriting ventures innovation risk management',
    url: '/knowledge/entrepreneurial-underwriter',
    category: 'Resources',
    keywords: ['entrepreneurial', 'underwriter', 'entrepreneurship', 'startup', 'innovation']
  },
  {
    id: 'knowledge-base-webinars',
    title: 'Knowledge Base & Webinars',
    description: 'Comprehensive knowledge base and webinar library',
    content: 'Knowledge base webinars video library educational content training materials professional development resources learning center',
    url: '/knowledge-base-webinars',
    category: 'Resources',
    keywords: ['knowledge base', 'webinars', 'video', 'library', 'education']
  },

  // Events
  {
    id: 'events',
    title: 'Events',
    description: 'FASE events, conferences, and networking opportunities',
    content: 'Events conferences meetings networking opportunities professional development workshops seminars annual conference regional events',
    url: '/events',
    category: 'Events',
    keywords: ['events', 'conferences', 'networking', 'meetings', 'workshops']
  },
  {
    id: 'rendezvous',
    title: 'Networking Rendezvous',
    description: 'Regular networking events for members',
    content: 'Networking rendezvous meetups social events professional networking business development relationship building member events',
    url: '/networking/rendezvous',
    category: 'Events',
    keywords: ['networking', 'rendezvous', 'meetups', 'social', 'relationships']
  },

  // Other pages
  {
    id: 'what-is-mga',
    title: 'What is an MGA?',
    description: 'Understanding Managing General Agents and their role',
    content: 'What is MGA managing general agent definition role responsibilities underwriting authority delegated authority insurance intermediary',
    url: '/what-is-an-mga',
    category: 'Education',
    keywords: ['mga', 'managing general agent', 'definition', 'underwriting', 'insurance']
  },
  {
    id: 'contact',
    title: 'Contact Us',
    description: 'Get in touch with FASE',
    content: 'Contact us get in touch contact information email phone address office location customer service support',
    url: '/contact',
    category: 'Contact',
    keywords: ['contact', 'email', 'phone', 'address', 'support']
  },
  {
    id: 'sponsorship',
    title: 'Sponsorship Opportunities',
    description: 'Opportunities to sponsor FASE events and initiatives',
    content: 'Sponsorship opportunities events conferences marketing partnerships corporate sponsorship branding exposure business development',
    url: '/sponsorship',
    category: 'Partnership',
    keywords: ['sponsorship', 'opportunities', 'marketing', 'partnerships', 'branding']
  }
];

// Fuse.js configuration for stricter search
const fuseOptions = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'description', weight: 0.3 },
    { name: 'content', weight: 0.2 },
    { name: 'keywords', weight: 0.1 }
  ],
  threshold: 0.1, // Much more strict - only close matches
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 3, // Require at least 3 characters to match
  shouldSort: true,
  findAllMatches: false, // Only find best matches
  ignoreLocation: true, // Don't care about position in text
  distance: 100 // Limit how far apart characters can be
};

// Initialize Fuse instance
const fuse = new Fuse(searchablePages, fuseOptions);

// Search function
export const searchPages = async (query: string): Promise<SearchableContent[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const results = fuse.search(query.trim());
  
  // Return the actual items from search results
  return results.map(result => result.item);
};

// Get suggestions based on partial query
export const getSearchSuggestions = (query: string): string[] => {
  if (!query || query.length < 2) {
    return [];
  }

  const results = fuse.search(query);
  const suggestions = new Set<string>();

  results.slice(0, 5).forEach(result => {
    // Extract keywords and title words as suggestions
    if (result.item.keywords) {
      result.item.keywords.forEach(keyword => {
        if (keyword.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(keyword);
        }
      });
    }
    
    // Add title words as suggestions
    const titleWords = result.item.title.toLowerCase().split(' ');
    titleWords.forEach(word => {
      if (word.includes(query.toLowerCase()) && word.length > 2) {
        suggestions.add(word);
      }
    });
  });

  return Array.from(suggestions).slice(0, 5);
};

// Get popular search terms
export const getPopularSearchTerms = (): string[] => {
  return [
    'membership',
    'events',
    'directory',
    'knowledge base',
    'sponsors',
    'advocacy',
    'capacity',
    'market intelligence',
    'webinars',
    'networking'
  ];
};