# FASE Site - Claude Memory

## Project Overview
- Next.js 14 website for Federation of European MGAs
- Tech stack: Next.js, TypeScript, Firebase, Tailwind CSS, NextAuth
- Deployment: Vercel

## Development Notes
- Mobile optimization branch: `mobile-optimization`
- Main branch: `main`
- Never add Claude attribution to git commits. NEVER ADD CLAUDE ATTRIBUTION TO GIT COMMITS.
- ALWAYS use `git config user.name "Daniel Pitt"` and `git config user.email "danielhpitt@gmail.com"` before any commits
- If Claude Code appears as contributor, immediately rewrite commit history to remove all traces
- Test commands: `npm run build`, `npm run lint`
- **DO NOT RUN BUILD COMMANDS YOURSELF UNDER ANY CIRCUMSTANCES.** The user will run builds manually. Never run `npm run build`, `npm run dev`, or any build/dev commands.
- **COMMIT MESSAGES**: Keep commit messages short and simple. One line only. No verbose descriptions or bullet points.

## Firebase Access Patterns - CRITICAL
**USE FIREBASE ADMIN SDK WITH `FIREBASE_SERVICE_ACCOUNT_KEY` FOR ALL FIRESTORE OPERATIONS.**

This project uses the Firebase Admin SDK (server-side) with the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable. This means:

- **All Firestore operations go through API routes** - The Admin SDK only works server-side
- **lib/firebase.ts** uses `firebase-admin` package, NOT the client SDK
- **API routes** use `import { db } from '../../../lib/firebase'` and call `db.collection('name').add(data)` etc.
- **Client components** call API routes via `fetch('/api/...')` to interact with Firestore
- **Environment variable**: `FIREBASE_SERVICE_ACCOUNT_KEY` must be set in Vercel with the JSON service account credentials

## UI/UX Guidelines
- **NEVER ADD SUBTITLES** - User fucking hates subtitles and finds them useless. Stop adding subtitle fields or subtitle text to sections, cards, pages, hero sections, or any UI components. This includes any secondary text under titles/headings that describes or elaborates on the title. Just use the title alone.
- **ALWAYS USE NEXT.JS LINK COMPONENT** - Never use `<a>` tags for internal navigation. Always use `<Link>` from `next/link` for internal routes. Only use `<a>` tags for external URLs.