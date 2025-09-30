# FASE Website - Site Anatomy

## Overview
The Federation of European MGAs (FASE) website is a Next.js 14 application built with TypeScript, Firebase, Tailwind CSS, and NextAuth for authentication. The site serves as the official platform for Europe's premier MGA community. Features internationalization support with next-intl.

## 1. Navigation Structure

### Main Navigation (Desktop)
Located in `/components/Header.tsx`, the primary navigation includes:

**Header Layout:**
- Left: FASE logo mark with "FASE" text and gold dividers
- Top Right (Hidden on Mobile): User status, search input, language selector (English/Français only)
- Main Navigation: About Us dropdown, Join Us, Sponsorship, Events, News, Member Portal, Sign In/Out

**About Us Dropdown Menu:**
- What is an MGA? (`/what-is-an-mga`)
- Who We Are (`/about/who-we-are`)
- Advisory Board (`/about/advisory-board`)
- Membership Directory (`/about/membership-directory`)
- Affiliates & Associates (`/about/affiliates`)
- Sponsors (`/about/sponsors`)

**Main Navigation Links:**
- **Join Us** (`/join`)
- **Sponsorship** (`/sponsorship`)
- **Events** (`/events`)
- **News** (`/news`)
- **Member Portal** (`/member-portal`)
- **Sign In/Out** (`/login` or logout action)

### Mobile Navigation
- Hamburger menu toggle with X/hamburger icon animation
- Full-width mobile menu with search and language selector at top
- All main navigation items in stacked layout
- User authentication status display
- Responsive design with FASE cream background highlights

### Homepage Side Navigation
- Collapsible sidebar navigation panel (desktop only)
- Section-based navigation with smooth scroll functionality
- Visual indicators for current section

## 2. Page Inventory

### Core Pages

#### Homepage (`/app/page.tsx`)
**Purpose:** Primary landing page showcasing FASE's mission and services
**Key Features:**
- Hero section with TitleHero component
- Service offerings grid with multiple service cards
- Conference information section
- Call-to-action section
- Side navigation panel for smooth scrolling

#### About Section
- **Main About** (`/app/about/page.tsx`) - Overview of FASE with quick links
- **Who We Are** (`/app/about/who-we-are/page.tsx`) - Detailed mission, values, leadership
- **Advisory Board** (`/app/about/advisory-board/page.tsx`) - Leadership and governance
- **Membership Directory** (`/app/about/membership-directory/page.tsx`) - Member listings
- **Affiliates & Associates** (`/app/about/affiliates/page.tsx`) - Partner organizations
- **Sponsors** (`/app/about/sponsors/page.tsx`) - Supporting organizations

#### Information Pages
- **What is an MGA?** (`/app/what-is-an-mga/page.tsx`) - Educational content about MGAs

#### Service & Industry Pages
- **Digital Platform** (`/app/digital-platform/page.tsx`) - Technology platform information
- **Market Intelligence** (`/app/market-intelligence/page.tsx`) - Market data and insights
- **Industry Advocacy** (`/app/industry-advocacy/page.tsx`) - Advocacy efforts and representation
- **Knowledge** (`/app/knowledge/page.tsx`) - Educational resources and learning platform
- **Capacity Transparency** (`/app/capacity-transparency/page.tsx`) - Market capacity information

#### Membership & Engagement
- **Join Us** (`/app/join/page.tsx`) - Three membership categories with registration
- **Sponsorship** (`/app/sponsorship/page.tsx`) - Partnership opportunities
- **Events** (`/app/events/page.tsx`) - Conference and networking events
- **News** (`/app/news/page.tsx`) - Industry news and updates

#### Member Services & Authentication
- **Member Portal** (`/app/member-portal/page.tsx`) - Protected member area
- **Member Portal Apply** (`/app/member-portal/apply/page.tsx`) - Application process
- **Login** (`/app/login/page.tsx`) - Authentication page with login form
- **Register** (`/app/register/page.tsx`) - New account creation with register form
- **Verify Signup** (`/app/verify-signup/page.tsx`) - Email verification process
- **Protected** (`/app/protected/page.tsx`) - Authenticated content area

#### Utility Pages
- **Coming Soon** (`/app/coming-soon/page.tsx`) - Placeholder for upcoming features

### Supporting Components & Infrastructure
- **Authentication Forms** (`/app/login/login-form.tsx`, `/app/register/register-form.tsx`) - Custom form components
- **Member Content** (`/app/member-portal/member-content.tsx`) - Protected member area content
- **Form Components** (`/app/form.tsx`, `/app/submit-button.tsx`) - General form utilities
- **Authentication** (`/app/auth.ts`, `/app/auth.config.ts`) - NextAuth configuration
- **Database** (`/app/db.ts`) - Database connection and queries
- **API Routes** (`/app/api/auth/[...nextauth]/route.ts`) - Authentication endpoints

## 3. Components

### Core Reusable Components

#### Header Component (`/components/Header.tsx`)
**Function:** Site-wide navigation and branding
**Features:**
- Responsive design with mobile hamburger menu
- Internationalization support (next-intl)
- Search functionality with FASE cream styling
- FASE logo mark with brand text and gold dividers
- About Us dropdown with complete submenu
- User authentication status display
- Current page highlighting with FASE navy
- Smooth animations and transitions

#### TitleHero Component (`/components/TitleHero.tsx`)
**Function:** Page title sections with consistent styling
**Features:**
- Customizable title and subtitle with optional default FASE subtitle
- Background pattern overlay or custom background image
- FASE navy default background with opacity overlay
- Responsive typography using Noto Serif for headings
- Centered layout with max-width container
- Full height or custom height options

#### Button Component (`/components/Button.tsx`)
**Function:** Consistent button styling across the site
**Features:**
- Multiple variants and sizes
- FASE brand color integration
- Hover states and transitions

#### Footer Component (`/components/Footer.tsx`)
**Function:** Site-wide footer with navigation and information

#### PageLayout Component (`/components/PageLayout.tsx`)
**Function:** Consistent page structure wrapper

### Specialized Components
- **ServiceCard** (`/components/ServiceCard.tsx`) - Service offerings display
- **FeatureBox** (`/components/FeatureBox.tsx`) - Feature highlights
- **CTASection** (`/components/CTASection.tsx`) - Call-to-action sections
- **SideNavigation** (`/components/SideNavigation.tsx`) - Homepage section navigation
- **Modal** (`/components/Modal.tsx`) - Modal dialog component
- **EmailVerification** (`/components/EmailVerification.tsx`) - Email verification handling
- **ContentHero** (`/components/ContentHero.tsx`) - Content page hero sections
- **DynamicIntlProvider** (`/components/DynamicIntlProvider.tsx`) - Internationalization provider

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

### Official FASE Brand Color Palette (defined in Tailwind config)
```css
'fase-black': '#231F20'       /* Footer and dark text */
'fase-navy': '#2D5574'        /* Primary brand color - hero/CTA sections */
'fase-light-blue': '#93AAC0'  /* Crucial hero accent color */
'fase-orange': '#B46A33'      /* Accent color */
'fase-gold': '#E2A560'        /* Accent color */
'fase-light-gold': '#E6C06E'  /* Accent color and dividers */
'fase-cream': '#EBE8E4'       /* Hero and light sections, form backgrounds */
```

### CSS Custom Properties (defined in globals.css)
```css
:root {
  --fase-navy: #2D5574;
  --fase-black: #231F20;
  --fase-orange: #B46A33;
  --fase-gold: #E2A560;
  --fase-light-gold: #E6C06E;
  --fase-cream: #EBE8E4;
  --fase-paper: #EBE8E4;
}
```

### Color Usage Patterns
- **FASE Navy** (`#2D5574`): Primary brand color, navigation highlights, hero sections
- **FASE Black** (`#231F20`): Footer backgrounds, dark text elements
- **FASE Cream** (`#EBE8E4`): Light backgrounds, form fields, mobile menu highlights
- **FASE Light Gold** (`#E6C06E`): Header dividers, borders, accent elements
- **FASE Gold** (`#E2A560`): Call-to-action elements, buttons
- **FASE Orange** (`#B46A33`): Secondary accent color
- **FASE Light Blue** (`#93AAC0`): Hero section accents

### Color Implementation
- Consistent brand color usage across all components
- High contrast ratios for accessibility
- Hover states with appropriate color transitions
- Mobile-specific color applications for better UX

## 6. Typography

### Font Families
**Primary Body Font:** DM Sans
- Source: Google Fonts (`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Noto+Serif:wght@400;500;700&display=swap')`)
- Usage: Body text, paragraphs, navigation, general content
- Weights: 400 (regular), 500 (medium), 700 (bold)
- Applied via Tailwind class: `font-dm-sans`

**Heading Font:** Noto Serif
- Source: Google Fonts (same import as above)
- Usage: Headings (h1-h6), titles, hero sections
- Weights: 400 (regular), 500 (medium), 700 (bold)
- Applied via Tailwind class: `font-noto-serif`

### Legacy Font Support
- **font-playfair**: Maps to Noto Serif for gradual migration
- **font-lato**: Maps to DM Sans for gradual migration

### Typography Hierarchy
- **H1**: `text-4xl sm:text-5xl lg:text-6xl` (Homepage hero titles)
- **H2**: `text-3xl md:text-4xl` (Section headers)
- **H3**: `text-2xl sm:text-3xl` (Subsection headers)
- **Body**: `text-lg` (Standard paragraph text)
- **Small**: `text-sm` (Captions, metadata, form labels)

### Typography Implementation (globals.css)
```css
@layer base {
  body {
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Noto Serif', serif;
    font-weight: 500;
  }
}
```

### Font Loading Optimization
- Google Fonts loaded with `display=swap` for performance
- Critical fonts preloaded for faster rendering
- Fallback fonts specified for improved loading experience

## 7. Key Features

### Interactive Features

#### Responsive Navigation
- **Desktop:** Horizontal navigation with About Us dropdown menu
- **Mobile:** Hamburger menu with full-screen overlay
- **Animation:** Smooth X/hamburger icon transitions
- **User Status:** Displays signed-in user information
- **Language Toggle:** English/French language switching

#### Hero Sections
- **TitleHero Component:** Consistent page title sections with FASE navy backgrounds
- **Background Options:** Pattern overlays or custom background images
- **Typography:** Large Noto Serif headings with responsive sizing
- **Default Subtitle:** Optional FASE organization description

#### Authentication System
- **NextAuth Integration:** Complete authentication flow
- **Custom Forms:** Styled login and registration forms
- **Email Verification:** Signup verification process
- **Protected Routes:** Member portal and protected content areas
- **User Display:** Authenticated user status in header

#### Search Functionality
- **Location:** Header component (desktop and mobile)
- **Styling:** FASE cream background with gold borders
- **Responsive:** Full-width search in mobile menu
- **State:** Ready for implementation with backend

#### Language & Internationalization
- **Framework:** next-intl integration
- **Languages:** English and French currently supported
- **Interface:** Dropdown selector in header
- **Scope:** Site-wide internationalization ready

#### Membership Features
- **Multiple Categories:** MGA Member, Market Practitioner, Supplier
- **Application Process:** Dedicated member portal application flow
- **Registration Interest:** Contact forms for membership inquiries

### Forms and Interactions
- **Custom Authentication Forms:** Styled login/register forms with NextAuth integration
- **Email Verification:** Complete signup verification workflow
- **Member Applications:** Dedicated application process in member portal
- **Contact Forms:** Ready for membership inquiries and general contact
- **Button Components:** Consistent FASE brand styling with hover states
- **Form Validation:** Client-side validation ready for implementation

### Performance Features
- **Next.js Image Optimization:** Optimized image loading with proper sizing
- **Font Loading:** Google Fonts with `display=swap` for performance
- **Logo Optimization:** FASE logo mark preloading with onLoad callbacks
- **Responsive Images:** Adaptive image sizing across devices
- **Code Splitting:** Next.js 14 automatic code splitting
- **CSS Optimization:** Tailwind CSS with custom FASE brand palette

### Technical Infrastructure
- **Framework:** Next.js 14 with App Router architecture
- **Styling:** Tailwind CSS with official FASE brand colors
- **Authentication:** NextAuth.js with custom configuration
- **Database:** Firebase integration ready
- **Internationalization:** next-intl for multi-language support
- **Deployment:** Optimized for Vercel deployment
- **TypeScript:** Full type safety implementation throughout

## Current Development Status
- **Active Branch:** `production-ready` (based on git status)
- **Main Branch:** `main`
- **Build Commands:** `npm run dev`, `npm run build`, `npm run lint`
- **Mobile Status:** Fully responsive with mobile-first design
- **Internationalization:** English/French implemented, ready for expansion
- **Authentication:** Complete NextAuth flow with Firebase backend
- **Brand Implementation:** Official FASE colors and typography applied

## Content & Asset Management
- **Static Content:** Component-based content with internationalization support
- **Images:** FASE logo mark and assets in `/public` directory
- **Brand Assets:** Official FASE logo mark replacing previous placeholder graphics
- **Internationalization:** Translation system ready with English/French base
- **Content Structure:** Modular components ready for CMS integration

## Architecture Overview
- **Total Pages:** 23 pages including authentication and utility pages
- **Core Components:** 13 reusable components plus specialized elements
- **Route Structure:** Organized by feature with nested routing for About section
- **Authentication:** Protected routes with NextAuth integration
- **Responsive Design:** Mobile-first approach with desktop enhancements
- **Brand Consistency:** Official FASE color palette and typography system

---

*Last Updated: Production-ready branch with official FASE branding*
*Pages: 23 total including all authentication and utility pages*
*Components: 13+ reusable components with specialized implementations*
*Features: Fully responsive, internationalized, authenticated*