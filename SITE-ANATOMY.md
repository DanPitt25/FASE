# FASE Website - Site Anatomy

## Overview
The Federation of European MGAs (FASE) website is a Next.js 14 application built with TypeScript, Firebase, Tailwind CSS, and NextAuth for authentication. The site serves as the official platform for Europe's premier MGA community.

## 1. Navigation Structure

### Main Navigation (Desktop)
Located in `/components/Header.tsx`, the primary navigation includes:

**Top Row (Hidden on Mobile):**
- Search input field (placeholder: "Search...")
- Language selector dropdown (English, Deutsch, Français, Español, Italiano)

**Main Navigation Row:**
- **About Us** (dropdown menu)
  - Who We Are (`/about/who-we-are`)
  - Committees (`/about/committees`)
  - Membership Directory (`/about/membership-directory`)
  - Affiliates & Associates (`/about/affiliates`)
  - Sponsors (`/about/sponsors`)
- **Join Us** (`/join`)
- **Sponsorship** (`/sponsorship`)
- **Events** (`/events`)
- **Knowledge & Education** (`/knowledge`)
- **News** (`/news`)
- **Member Portal** (`/member-portal`)
- **Sign In** button (`/login`)

### Mobile Navigation
- Hamburger menu toggle
- Collapsible menu with all main navigation items
- Mobile-optimized search and language selector
- Responsive design with full-width mobile menu

### Homepage Side Navigation
- Collapsible sidebar navigation panel (desktop only)
- Section-based navigation:
  1. Home (hero section)
  2. What We Offer (services section)
  3. Conference (conference section)
  4. Join FASE (CTA section)
- Visual indicators for current section
- Smooth scroll functionality

## 2. Page Inventory

### Core Pages

#### Homepage (`/app/page.tsx`)
**Purpose:** Primary landing page showcasing FASE's mission and services
**Key Features:**
- Rotating city image carousel (Amsterdam, Hamburg, London, Madrid, Paris, Rome, Vienna)
- Hero section with organization description
- Service offerings grid
- Conference information
- Call-to-action section
- Side navigation panel for smooth scrolling

#### About Section
- **Main About** (`/app/about/page.tsx`) - Overview of FASE with quick links
- **Who We Are** (`/app/about/who-we-are/page.tsx`) - Detailed mission, values, leadership
- **Committees** (`/app/about/committees/page.tsx`) - Governance structure
- **Membership Directory** (`/app/about/membership-directory/page.tsx`) - Member listings
- **Affiliates & Associates** (`/app/about/affiliates/page.tsx`) - Partner organizations
- **Sponsors** (`/app/about/sponsors/page.tsx`) - Supporting organizations

#### Membership & Engagement
- **Join Us** (`/app/join/page.tsx`) - Three membership categories with registration
- **Sponsorship** (`/app/sponsorship/page.tsx`) - Partnership opportunities
- **Events** (`/app/events/page.tsx`) - Conference and networking events
- **Knowledge & Education** (`/app/knowledge/page.tsx`) - Educational resources platform
- **News** (`/app/news/page.tsx`) - Industry news and updates

#### Member Services
- **Member Portal** (`/app/member-portal/page.tsx`) - Protected member area
- **Login** (`/app/login/page.tsx`) - Authentication page
- **Register** (`/app/register/page.tsx`) - New account creation
- **Protected** (`/app/protected/page.tsx`) - Authenticated content area

### Supporting Components
- **Form Components** (`/app/form.tsx`, `/app/submit-button.tsx`) - Authentication forms
- **Authentication** (`/app/auth.ts`, `/app/auth.config.ts`) - NextAuth configuration
- **Database** (`/app/db.ts`) - Database connection and queries

## 3. Components

### Reusable Components

#### Header Component (`/components/Header.tsx`)
**Function:** Site-wide navigation and branding
**Features:**
- Responsive design with mobile hamburger menu
- Multi-language support
- Search functionality
- Logo with Europe map image
- Current page highlighting
- Smooth animations and transitions

#### TitleHero Component (`/components/TitleHero.tsx`)
**Function:** Page title sections with consistent styling
**Features:**
- Customizable title and subtitle
- Background pattern overlay
- Navy blue default background
- Responsive typography
- Centered layout with max-width container

### Specialized Components
- Authentication forms with NextAuth integration
- Responsive image galleries
- Interactive membership selection
- Service cards with hover effects
- Statistics display sections
- Leadership team profiles

## 4. Content Sections

### Homepage Sections

#### Hero Section
- **Purpose:** Primary brand introduction and value proposition
- **Content:** FASE mission statement, key benefits, call-to-action buttons
- **Visual:** Rotating European city images (7-second intervals)
- **Layout:** Split layout with text on left, images on right (desktop)

#### Services Section ("What FASE Offers")
- **Purpose:** Showcase core services and value propositions
- **Content:** 
  - 3 main service cards (Pan-European Events, Digital Platform, Market Intelligence)
  - 4 additional service items (Industry Advocacy, Education & Training, Market Research, Capacity Transparency)
- **Visual:** Icon-based cards with hover effects

#### Conference Section
- **Purpose:** Promote FASE European Conference
- **Content:** Conference format, goals, sponsorship opportunities
- **Layout:** Two-column with text and sponsorship information

#### CTA Section
- **Purpose:** Drive membership registration
- **Content:** Membership launch information, quorum requirement (50 MGAs)
- **Styling:** Dark background with prominent call-to-action

#### Footer
- **Purpose:** Site navigation and organization information
- **Content:** Four-column layout with links to membership, resources, and contact information

### About Pages Content
- Mission statements and organizational values
- Leadership team profiles with placeholder content
- Statistical information about community growth
- Core values presentation (Innovation, Collaboration, Excellence)
- Professional imagery from European business districts

### Membership Pages Content
- Three distinct membership categories:
  1. **MGA Member** - Full membership for MGAs
  2. **Market Practitioner** - For capacity providers and insurers
  3. **Supplier** - For service providers
- Benefits and features for each membership type
- Registration interest functionality
- Launch threshold information

## 5. Color Scheme

### Primary Color Palette (defined in Tailwind config)
```css
'fase-charcoal': '#2c2c2c'    /* Dark text and backgrounds */
'fase-navy': '#085275'        /* Primary brand color */
'fase-steel': '#4a4a4a'       /* Secondary text */
'fase-graphite': '#6b6b6b'    /* Accent elements */
'fase-platinum': '#8d8d8d'    /* Light accents */
'fase-silver': '#b5b5b5'      /* Borders and dividers */
'fase-pearl': '#e8e8e8'       /* Light backgrounds */
'fase-paper': '#f8f8f8'       /* Page backgrounds */
'fase-accent': '#1a1a1a'      /* Call-to-action elements */
```

### Color Usage Patterns
- **Primary Navy** (`#085275`): Main brand color, headers, primary buttons
- **Charcoal** (`#2c2c2c`): Dark backgrounds, footer
- **Steel** (`#4a4a4a`): Body text, secondary content
- **Paper** (`#f8f8f8`): Main page backgrounds
- **Pearl** (`#e8e8e8`): Section backgrounds, input fields
- **Accent** (`#1a1a1a`): Call-to-action buttons, emphasis elements

### Color Accessibility
- High contrast ratios maintained throughout
- Consistent color hierarchy for readability
- Hover states with appropriate color shifts

## 6. Typography

### Font Families
**Primary Font:** Lato
- Source: Google Fonts (`@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap')`)
- Usage: Body text, paragraphs, general content
- Weights: 400 (regular), 700 (bold)

**Heading Font:** Futura
- Fallback: Lato, system-ui, sans-serif
- Usage: Headings (h1-h6), titles, navigation
- Applied via Tailwind class: `font-playfair`

### Typography Hierarchy
- **H1**: `text-4xl sm:text-5xl lg:text-6xl` (Homepage hero)
- **H2**: `text-3xl md:text-4xl` (Section headers)
- **H3**: `text-2xl sm:text-3xl` (Subsection headers)
- **Body**: `text-lg` (Standard paragraph text)
- **Small**: `text-sm` (Captions, metadata)

### Typography Implementation
```css
body {
  font-family: 'Lato', system-ui, sans-serif;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Futura', 'Lato', system-ui, sans-serif;
  font-weight: 500;
}
```

## 7. Key Features

### Interactive Features

#### Image Carousel
- **Location:** Homepage hero section
- **Function:** Automated rotation of European city images
- **Timing:** 7-second intervals
- **Cities:** Amsterdam, Hamburg, London, Madrid, Paris, Rome, Vienna
- **Transition:** Smooth fade with 8-second duration

#### Responsive Navigation
- **Desktop:** Horizontal navigation with dropdown menus
- **Mobile:** Hamburger menu with slide-out panel
- **Side Navigation:** Collapsible section navigation (homepage only)
- **Scroll Tracking:** Active section highlighting

#### Membership Selection
- **Feature:** Interactive membership type selection
- **Types:** MGA Member, Market Practitioner, Supplier
- **Interaction:** Click to select, visual feedback
- **Integration:** Prepared for registration flow

#### Search Functionality
- **Location:** Header component
- **Scope:** Site-wide search input
- **Responsive:** Full-width on mobile
- **State:** Prepared for implementation

#### Language Selection
- **Languages:** English, Deutsch, Français, Español, Italiano
- **Interface:** Dropdown selector
- **Scope:** Prepared for internationalization

### Authentication System
- **Framework:** NextAuth.js
- **Features:** Email/password authentication
- **Protected Routes:** Member portal, protected pages
- **Integration:** Firebase authentication
- **Forms:** Custom styled login/register forms

### Forms and Interactions
- **Contact Forms:** Prepared form components
- **Registration:** Interest registration for membership
- **Authentication:** Login/register functionality
- **Buttons:** Consistent hover states and transitions
- **Validation:** Form validation ready for implementation

### Performance Features
- **Image Optimization:** Next.js Image component
- **Font Loading:** Optimized Google Fonts loading
- **Preloading:** Critical images preloaded
- **Responsive Images:** Adaptive image sizing
- **Code Splitting:** Next.js automatic splitting

### Technical Infrastructure
- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS with custom color palette
- **Database:** Firebase integration
- **Deployment:** Configured for Vercel
- **TypeScript:** Full type safety implementation

## Development Environment
- **Build Commands:** `npm run dev`, `npm run build`, `npm run lint`
- **Current Branch:** `mobile-optimization`
- **Main Branch:** `main`
- **Mobile Status:** Fully responsive with mobile-specific optimizations

## Content Management
- **Static Content:** Hardcoded in components
- **Dynamic Content:** Prepared for CMS integration
- **Images:** Stored in `/public` directory
- **Internationalization:** Architecture ready for multi-language support

---

*Last Updated: Current as of mobile-optimization branch*
*Total Pages: 15+ including subpages*
*Components: 2 reusable + multiple specialized*
*Responsive: Fully mobile optimized*