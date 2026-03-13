# Plan: RSS Feed for FASE News

## Summary

Create an RSS feed for public FASE News content. The Entrepreneurial Underwriter bulletin remains member-only in the portal.

## Architecture

- **Public**: FASE News articles in `/public/news/*.md` → RSS feed at `/api/feed/rss`
- **Member-only**: EU bulletin articles in `/public/bulletin/` → accessed via member portal only
- **Teaser**: `/entrepreneurial-underwriter` page promotes membership with sample content descriptions

## Completed

1. ✅ Added `gray-matter` dependency
2. ✅ Created `lib/content.ts` - server-side content library
3. ✅ Added `category: fase-news` to all existing news articles (29 files)
4. ✅ Created `/api/feed/rss` endpoint with `?lang=` and `?category=` params
5. ✅ Added RSS discovery link to layout

## Structure

**Public News** (`/public/news/`):
- FASE organizational announcements
- Partnership news
- Event announcements
- Category: `fase-news`

**Member Bulletin** (`/public/bulletin/feb-2026/articles/`):
- Lloyd's Europe feature article
- Captives contributed article
- Categories: `Feature`, `Contributed Article`
- Accessed via `/member-portal/bulletin/`

## RSS Feed

- Endpoint: `/api/feed/rss`
- Params: `?lang=fr`, `?category=fase-news`
- Returns RSS 2.0 XML
- 1-hour cache
- Only includes public FASE News (not member bulletin)
