# FASE Website

A website for FASE.

## Features

- **Next.js 14** with TypeScript
- **NextAuth.js** for authentication
- **Firebase Functions** for backend services
- **Drizzle ORM** with PostgreSQL
- **Responsive design** with Tailwind CSS
- **Vercel deployment** ready

## Project Structure

```
├── app/                 # Next.js app directory
├── components/          # React components
├── functions/           # Firebase Functions
├── lib/                 # Utility libraries
├── pages/              # Additional pages
└── public/             # Static assets
```

## Development

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Firebase Functions

The Firebase Functions are located in the `functions/` directory and are deployed separately from the main website.

To work with Firebase Functions:
```bash
cd functions
npm install
npm run build
```

Deploy functions:
```bash
firebase deploy --only functions
```

## Deployment

This project is configured for automatic deployment to Vercel via GitHub integration. Push to the main branch to trigger a new deployment.

## License

MIT License
