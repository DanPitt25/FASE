# FASE Site - Claude Memory

## Project Overview
- Next.js 14 website for Federation of European MGAs
- Tech stack: Next.js, TypeScript, Firebase, Tailwind CSS, NextAuth
- Deployment: Vercel

## Development Notes
- Mobile optimization branch: `mobile-optimization`
- Main branch: `main`
- Never add Claude attribution to git commits. NEVER ADD CLAUDE ATTRIBUTION TO GIT COMMITS.
- ALWAYS use `git config user.name "Daniel Pitt"` and `git config user.email "your-email@domain.com"` before any commits
- If Claude Code appears as contributor, immediately rewrite commit history to remove all traces
- Test commands: `npm run build`, `npm run lint`
- YOU CANNOT RUN NPM RUN DEV YOURSELF.

## Firebase Access Patterns
- **Client-side components**: Use client Firebase SDK (`import { db } from '../lib/firebase'`) with direct Firestore calls
- **API routes**: Only needed for server-side operations requiring Firebase Admin SDK with service account credentials
- **NEVER**: Create API routes just to wrap client-side Firebase operations - this breaks the auth context and requires unnecessary Admin SDK setup
- **Rule**: If the client component can access Firestore directly (like every other part of the app), don't create an API route