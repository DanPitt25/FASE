import * as fs from 'fs';
import * as path from 'path';

interface SearchDocument {
  id: string;
  title: string;
  description: string;
  content: string;
  url: string;
  category: string;
  date?: string;
}

type Language = 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl';
const LANGUAGES: Language[] = ['en', 'fr', 'de', 'es', 'it', 'nl'];

// Parse frontmatter from markdown files
function parseFrontmatter(content: string): { metadata: Record<string, string>; body: string } {
  const lines = content.split('\n');
  const metadata: Record<string, string> = {};
  let bodyStart = 0;

  if (lines[0] === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        bodyStart = i + 1;
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

  return {
    metadata,
    body: lines.slice(bodyStart).join('\n')
  };
}

// Strip markdown/HTML for plain text search
function stripMarkdown(content: string): string {
  return content
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Recursively extract all string values from an object
function extractStrings(obj: any): string {
  if (typeof obj === 'string') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(extractStrings).join(' ');
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).map(extractStrings).join(' ');
  }
  return '';
}

// Load translation file
function loadTranslations(messagesDir: string, lang: Language, file: string): any {
  const filePath = path.join(messagesDir, lang, file);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Index news articles for a specific language
function indexNewsArticles(newsDir: string, lang: Language): SearchDocument[] {
  const documents: SearchDocument[] = [];

  if (!fs.existsSync(newsDir)) {
    return documents;
  }

  const files = fs.readdirSync(newsDir).filter(f => f.endsWith('.md'));

  // For English, get files without language suffix
  // For other languages, get files with the language suffix
  const langFiles = lang === 'en'
    ? files.filter(f => !f.match(/-(?:fr|de|es|it|nl)\.md$/))
    : files.filter(f => f.endsWith(`-${lang}.md`));

  for (const file of langFiles) {
    const filePath = path.join(newsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { metadata, body } = parseFrontmatter(content);
    const slug = file.replace('.md', '');

    documents.push({
      id: `news-${slug}`,
      title: metadata.title || slug,
      description: metadata.excerpt || '',
      content: stripMarkdown(body),
      url: `/about/news/${slug}`,
      category: 'News',
      date: metadata.date
    });
  }

  return documents;
}

// Build pages from translation files
function buildPagesFromTranslations(messagesDir: string, lang: Language): SearchDocument[] {
  const documents: SearchDocument[] = [];

  // Load all translation files
  const pages = loadTranslations(messagesDir, lang, 'pages.json');
  const other = loadTranslations(messagesDir, lang, 'other.json');
  const core = loadTranslations(messagesDir, lang, 'core.json');
  const content = loadTranslations(messagesDir, lang, 'content.json');

  // Homepage
  if (other?.homepage) {
    documents.push({
      id: 'home',
      title: 'FASE - Fédération des Agences de Souscription Européennes',
      description: other.homepage.hero?.subtitle || 'The pan-European MGA federation',
      content: extractStrings(other.homepage),
      url: '/',
      category: 'Main'
    });
  }

  // About page
  if (pages?.about) {
    documents.push({
      id: 'about',
      title: pages.about.page?.title || 'About FASE',
      description: pages.about.voice_for_innovators?.title || '',
      content: extractStrings(pages.about),
      url: '/about',
      category: 'About'
    });
  }

  // Mission page
  if (pages?.mission) {
    documents.push({
      id: 'mission',
      title: pages.mission.page?.title || 'Mission',
      description: pages.mission.intro?.title || '',
      content: extractStrings(pages.mission),
      url: '/about/mission',
      category: 'About'
    });
  }

  // Leadership page
  if (pages?.leadership) {
    documents.push({
      id: 'leadership',
      title: pages.leadership.page?.title || 'Leadership',
      description: pages.leadership.advisory_board?.title || '',
      content: extractStrings(pages.leadership),
      url: '/about/leadership',
      category: 'About'
    });
  }

  // People page
  if (other?.people) {
    documents.push({
      id: 'people',
      title: other.people.page?.title || 'Our People',
      description: 'Meet the FASE team',
      content: extractStrings(other.people),
      url: '/about/people',
      category: 'About'
    });
  }

  // Code of Conduct
  if (other?.code_of_conduct) {
    documents.push({
      id: 'code-of-conduct',
      title: other.code_of_conduct.page?.title || 'Code of Conduct',
      description: other.code_of_conduct.intro?.title || 'FASE professional standards',
      content: extractStrings(other.code_of_conduct),
      url: '/about/code-of-conduct',
      category: 'About'
    });
  }

  // Contact page
  if (pages?.contact) {
    documents.push({
      id: 'contact',
      title: pages.contact.page?.title || 'Contact Us',
      description: pages.contact.contact_info?.title || '',
      content: extractStrings(pages.contact),
      url: '/contact',
      category: 'Contact'
    });
  }

  // Directory page
  if (pages?.directory) {
    documents.push({
      id: 'directory',
      title: pages.directory.page?.title || 'Directory',
      description: 'Member directory of FASE organizations',
      content: extractStrings(pages.directory),
      url: '/directory',
      category: 'Directory'
    });
  }

  // Sponsors page
  if (pages?.sponsors) {
    documents.push({
      id: 'sponsors',
      title: pages.sponsors.page?.title || 'Our Partners',
      description: pages.sponsors.intro?.title || '',
      content: extractStrings(pages.sponsors),
      url: '/sponsors',
      category: 'Partners'
    });
  }

  // Events page
  if (pages?.events) {
    documents.push({
      id: 'events',
      title: pages.events.page?.title || 'Events',
      description: pages.events.intro?.title || '',
      content: extractStrings(pages.events),
      url: '/events',
      category: 'Events'
    });
  }

  // Rendezvous page
  if (pages?.rendezvous) {
    documents.push({
      id: 'rendezvous',
      title: pages.rendezvous.page?.title || 'MGA Rendezvous',
      description: 'Annual MGA Rendezvous conference in Barcelona',
      content: extractStrings(pages.rendezvous),
      url: '/rendezvous',
      category: 'Events'
    });
  }

  // Join page
  if (other?.join) {
    documents.push({
      id: 'join',
      title: other.join.page?.title || 'Join FASE',
      description: 'Become a member of FASE',
      content: extractStrings(other.join),
      url: '/join',
      category: 'Membership'
    });
  }

  // News listing page
  if (content?.news) {
    documents.push({
      id: 'news',
      title: content.news.page?.title || 'News',
      description: content.news.intro?.title || 'FASE news and updates',
      content: extractStrings(content.news),
      url: '/about/news',
      category: 'News'
    });
  }

  // Privacy Policy (static - same in all languages)
  documents.push({
    id: 'privacy-policy',
    title: 'Privacy Policy',
    description: 'FASE privacy policy and data protection',
    content: 'Privacy policy data protection GDPR personal information cookies terms conditions legal compliance',
    url: '/privacy-policy',
    category: 'Legal'
  });

  // Entrepreneurial Underwriter
  documents.push({
    id: 'entrepreneurial-underwriter',
    title: 'Entrepreneurial Underwriter',
    description: 'FASE monthly publication for MGA professionals',
    content: 'Entrepreneurial Underwriter magazine publication newsletter articles insights MGA underwriting business innovation market intelligence',
    url: '/entrepreneurial-underwriter',
    category: 'Resources'
  });

  return documents;
}

async function buildSearchIndex() {
  console.log('Building search indices for all languages...');

  const projectRoot = path.resolve(__dirname, '..');
  const newsDir = path.join(projectRoot, 'public', 'news');
  const messagesDir = path.join(projectRoot, 'messages');
  const outputDir = path.join(projectRoot, 'public');

  for (const lang of LANGUAGES) {
    const newsArticles = indexNewsArticles(newsDir, lang);
    const pageDocuments = buildPagesFromTranslations(messagesDir, lang);
    const allDocuments = [...pageDocuments, ...newsArticles];

    // Sort by date (news) then alphabetically
    allDocuments.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (a.date) return -1;
      if (b.date) return 1;
      return a.title.localeCompare(b.title);
    });

    const outputPath = path.join(outputDir, `search-index-${lang}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(allDocuments, null, 2));

    console.log(`  ${lang}: ${allDocuments.length} documents (${pageDocuments.length} pages, ${newsArticles.length} news)`);
  }

  // Also create a default index (English) for backwards compatibility
  const defaultPath = path.join(outputDir, 'search-index.json');
  const enPath = path.join(outputDir, 'search-index-en.json');
  if (fs.existsSync(enPath)) {
    fs.copyFileSync(enPath, defaultPath);
  }

  console.log('Search indices built successfully!');
}

buildSearchIndex().catch(console.error);
