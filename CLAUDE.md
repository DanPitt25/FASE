# FASE Site - Claude Memory

## Project Overview
- Next.js 14 website for FASE
- **FASE stands for "Fédération des Agences de Souscription Européennes"** - DO NOT use any other expansion of the acronym (not "Federation of Associations of Specialised Expertise" or anything else)
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
- **Client components** call API routes via `fetch('/api/...')` to interact with Firestore
- **Environment variable**: `FIREBASE_SERVICE_ACCOUNT_KEY` must be set in Vercel with the JSON service account credentials

### API Route Firebase Usage - IMPORTANT
**ALWAYS use the shared Firebase Admin exports from `lib/firebase-admin.ts`:**
```typescript
import { adminDb, adminAuth, adminStorage, FieldValue } from '../../../lib/firebase-admin';

// Then use directly:
const db = adminDb;
await db.collection('accounts').doc(id).update({ ... });
```

**NEVER create your own `initializeAdmin()` function or call `admin.initializeApp()` in API routes.** The shared module uses a named app (`fase-admin`), and custom initialization will conflict with it, causing "The default Firebase app does not exist" errors.

## MGA Rendezvous Subsite
- Located at `mga-rendezvous/` - a separate git repo within this project
- Deployed to mgarendezvous.com
- Has its own i18n system with 6 languages (en, de, fr, es, it, nl)
- Uses IP-based geolocation for automatic language detection (`hooks/useGeolocation.ts`)
- Falls back to browser language if geolocation fails
- User preference stored in localStorage as `mga-rendezvous-locale`

## EMAIL SAFETY - CRITICAL
**NEVER SEND EMAILS TO ANYONE OTHER THAN daniel.pitt@fasemga.com UNLESS THE USER EXPLICITLY ASKS.**

- NEVER call APIs that send emails to clients/customers without explicit user permission
- NEVER trigger registration flows, invoice sends, or any automated emails to external recipients
- If generating invoices or documents, find a way to generate the PDF WITHOUT sending emails
- When in doubt, ASK FIRST before any action that could contact someone outside the organization
- This includes calling production API endpoints that have email-sending side effects

## Translation Guidelines - CRITICAL
**ALWAYS check messages/glossary.json before translating any content.**

Key terminology by language:
- **English**: MGA (Managing General Agent)
- **French**: Agence de Souscription (feminine - use "une", "la", "cette")
- **Spanish**: Agencia de Suscripción (feminine - use "una", "la", "esta")
- **Italian**: Agenzia di Sottoscrizione (feminine - use "una", "la", "questa")
- **German**: MGA (kept in English)
- **Dutch**: GA (Gevolmachtigd Agent)

Other key terms:
- "Sponsors" → French: "Partenaires"
- "Underwriting" → French: "Souscription", Dutch: "Acceptatie", German/Italian: keep as "Underwriting"
- "Entrepreneurial Underwriter" → Keep as-is in ALL languages

## UI/UX Guidelines
- **NEVER ADD SUBTITLES** - User fucking hates subtitles and finds them useless. Stop adding subtitle fields or subtitle text to sections, cards, pages, hero sections, or any UI components. This includes any secondary text under titles/headings that describes or elaborates on the title. Just use the title alone.
- **ALWAYS USE NEXT.JS LINK COMPONENT** - Never use `<a>` tags for internal navigation. Always use `<Link>` from `next/link` for internal routes. Only use `<a>` tags for external URLs.