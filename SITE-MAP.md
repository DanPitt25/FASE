# FASE Website - Complete Site Map

## Overview
The FASE (Federation of European MGAs) website is a professional membership platform for Managing General Agents and insurance industry stakeholders across Europe. Built with Next.js 14, it features multi-language support, membership management, payment processing, and administrative tools.

---

## Public Pages

### **Homepage (/)** 
The main landing page that introduces FASE and its mission.
- **Purpose**: Attract new members and showcase FASE's value proposition
- **Features**: 
  - Hero section with rotating background images
  - Service offerings overview with interactive cards
  - Impact statements and member benefits
  - Membership vetting process explanation
  - Call-to-action sections encouraging membership
- **Content**: Dynamic testimonials, service highlights, standards information

### **About FASE Section**
Information about the organization, leadership, and mission.

#### **About Page (/about)**
- **Purpose**: Comprehensive overview of FASE's mission and history
- **Content**: Organization background, mission statement, goals

#### **Leadership (/about/leadership)**
- **Purpose**: Showcase FASE's leadership team and governance structure
- **Content**: Board members, advisors, organizational structure

#### **Management (/about/people)**
- **Purpose**: Display key management personnel
- **Content**: Staff profiles, management team information

#### **Advisory Board (/about/advisory-board)**
- **Purpose**: Highlight industry experts advising FASE
- **Content**: Advisory board member profiles and expertise

#### **News (/about/news)**
- **Purpose**: Share organizational updates and industry news
- **Content**: Press releases, announcements, industry insights

#### **Who We Are (/about/who-we-are)**
- **Purpose**: Detailed organizational identity and values
- **Content**: Company culture, values, organizational philosophy

#### **Affiliates (/about/affiliates)**
- **Purpose**: Show partner organizations and relationships
- **Content**: Partner listings, collaboration information

#### **Sponsors (/about/sponsors)**
- **Purpose**: Recognize financial supporters and partners
- **Content**: Sponsor profiles, partnership benefits

### **Knowledge & Education Section**
Educational resources and industry insights.

#### **Knowledge Hub (/knowledge)**
- **Purpose**: Central hub for educational content and resources
- **Content**: Resource directory, learning materials overview

#### **Entrepreneurial Underwriter (/knowledge/entrepreneurial-underwriter)**
- **Purpose**: Specialized content for underwriting professionals
- **Content**: Industry-specific resources, best practices

#### **Webinars (/knowledge/webinars)**
- **Purpose**: Access to educational webinar content
- **Content**: Webinar listings, registration links, past recordings

#### **Knowledge Base Webinars (/knowledge-base-webinars)**
- **Purpose**: Comprehensive webinar library
- **Features**: Video player, searchable content
- **Dynamic Routes**: Individual video pages (/knowledge-base-webinars/video/[slug])

### **Services Pages**
Detailed information about FASE's offerings.

#### **Digital Platform (/digital-platform)**
- **Purpose**: Explain FASE's technology offerings
- **Content**: Platform features, member benefits, access information

#### **Market Intelligence (/market-intelligence)**
- **Purpose**: Showcase market research and analysis services
- **Content**: Research capabilities, market insights, data offerings

#### **Industry Advocacy (/industry-advocacy)**
- **Purpose**: Detail FASE's regulatory and policy work
- **Content**: Advocacy initiatives, regulatory engagement, policy positions

#### **Capacity Transparency (/capacity-transparency)**
- **Purpose**: Explain capacity matching and transparency services
- **Content**: Service description, benefits for MGAs and capacity providers

#### **What is an MGA (/what-is-an-mga)**
- **Purpose**: Educational content for those new to the MGA concept
- **Content**: MGA definition, role in insurance market, benefits

### **Networking & Events**

#### **Events (/events)**
- **Purpose**: List upcoming and past events
- **Content**: Event calendar, registration information, past event summaries

#### **Rendezvous (/networking/rendezvous)**
- **Purpose**: Information about FASE's flagship networking event
- **Content**: Event details, agenda, registration, attendee information

### **Membership & Business**

#### **Join FASE (/join)**
- **Purpose**: Primary membership recruitment page
- **Content**: 
  - Membership benefits and categories
  - Application process overview
  - Pricing structure (not detailed, links to application)
  - Member testimonials and success stories


#### **Directory (/directory)**
- **Purpose**: Searchable directory of FASE members
- **Features**: Member search, company profiles, contact information

#### **Sponsors (/sponsors)**
- **Purpose**: Information for potential sponsors
- **Content**: Sponsorship opportunities, benefits, contact information

#### **Sponsorship (/sponsorship)**
- **Purpose**: Detailed sponsorship packages and opportunities
- **Content**: Sponsorship tiers, benefits, application process

### **Utility Pages**

#### **Contact (/contact)**
- **Purpose**: Provide contact information and inquiry form
- **Features**: Contact form, office information, staff directory

#### **Search (/search)**
- **Purpose**: Site-wide search functionality
- **Features**: Full-text search across all content, filtering options

#### **News (/news)**
- **Purpose**: General news and industry updates
- **Content**: News articles, industry developments, FASE updates

#### **Coming Soon (/coming-soon)**
- **Purpose**: Placeholder for features under development
- **Content**: Information about upcoming features and timeline

---

## Authentication & User Management

### **Registration System**

#### **Register (/register)**
- **Purpose**: New user account creation
- **Features**:
  - Email verification system using 6-digit codes
  - Multi-step registration process
  - Organization selection and validation
  - Privacy agreement and data processing consent
- **Process**:
  1. Email verification with time-limited codes
  2. Personal information collection
  3. Organization details and membership type selection
  4. Payment method selection (invoice or online payment)
  5. Account creation after verification

#### **Login (/login)**
- **Purpose**: User authentication
- **Features**: 
  - Email/password authentication
  - Firebase Auth integration
  - Redirect to member portal after successful login

### **Member Areas (Protected)**

#### **Member Portal (/member-portal)**
- **Purpose**: Main dashboard for authenticated members
- **Features**:
  - Personal dashboard with alerts and messages
  - Membership status display
  - Access to member-only content
  - Communication center
- **Access Control**: Requires authentication and member status

#### **Member Portal Apply (/member-portal/apply)**
- **Purpose**: Membership application for authenticated users
- **Features**: Detailed membership application form
- **Access Control**: Requires authentication

#### **Protected Area (/protected)**
- **Purpose**: General protected content area
- **Access Control**: Requires authentication

### **Administrative System**

#### **Admin Portal (/admin-portal)**
- **Purpose**: Administrative dashboard for FASE staff
- **Features**:
  - Member application review and approval
  - Invoice generation and management
  - Content moderation (comments, videos)
  - User message and alert management
  - Join request processing
  - Membership status updates
- **Access Control**: Admin-only access with custom Firebase claims

---

## API Endpoints & Backend Services

### **Authentication APIs**

#### **Verify Code (/api/auth/verify-code)**
- **Purpose**: Validate email verification codes
- **Function**: Confirms 6-digit codes sent during registration
- **Security**: Rate limiting, code expiration, single-use enforcement

### **Payment & Membership APIs**

#### **Create Checkout Session (/api/create-checkout-session)**
- **Purpose**: Generate Stripe payment sessions for online payments
- **Function**: Creates secure checkout sessions for immediate credit/debit card payments
- **Pricing**: Dynamic pricing based on MGA premium brackets
- **Status**: Active payment option alongside invoice requests

#### **Create Membership (/api/create-membership)**
- **Purpose**: Process membership application data
- **Function**: Store membership details and prepare for payment
- **Process**: Updates user account with membership information

#### **Generate Invoice (/api/generate-invoice)**
- **Purpose**: Create and send membership invoices
- **Features**:
  - PDF invoice generation with FASE branding
  - Email delivery with attachments
  - Bank transfer payment instructions
  - Membership fee calculation with discounts
- **Integration**: Firebase Functions for email delivery

#### **Stripe Webhook (/api/stripe-webhook)**
- **Purpose**: Handle Stripe payment confirmations and updates
- **Function**: Processes successful payments and updates member status automatically
- **Status**: Active webhook for online payment processing

#### **Legacy Stripe Webhook (/api/webhooks/stripe)**
- **Purpose**: Legacy payment processing
- **Status**: Deprecated, returns 410 status

### **Utility APIs**

#### **Upload Logo (/api/upload-logo)**
- **Purpose**: Handle organization logo uploads
- **Function**: Process and store company logos for member profiles

#### **Test APIs**
- **Test Payment Update (/api/test-payment-update)**: Development testing
- **Test Update Status (/api/test-update-status)**: Status change testing

---

## Database Structure (Firebase Firestore)

### **Core Collections**

#### **accounts**
Unified member records replacing separate user and application collections.
- **Purpose**: Single source of truth for all user data
- **Fields**:
  - Personal information (name, email, display name)
  - Membership details (type, organization, status)
  - Contact information (primary contact, addresses)
  - Organization details (trading name, regulatory info)
  - Portfolio information (for MGAs)
  - Privacy agreements and consent
  - Timestamps and status tracking

#### **verification_codes**
Temporary email verification data.
- **Purpose**: Store and validate registration verification codes
- **Fields**:
  - Email address (document ID)
  - 6-digit verification code
  - Expiration timestamp
  - Usage status
- **Security**: Auto-deletion after use, 20-minute expiration

#### **invoices**
Generated membership invoices and payment tracking.
- **Purpose**: Track invoice generation and payment status
- **Fields**:
  - Invoice number and amount
  - Member information and billing details
  - Payment status and due dates
  - PDF generation status

#### **join_requests**
Company membership requests from individuals.
- **Purpose**: Manage requests to join existing member organizations
- **Fields**:
  - Requestor information
  - Target company details
  - Request status and admin notes
  - Processing timestamps

### **Messaging Collections**

#### **alerts**
System-wide alerts and notifications.
- **Purpose**: Broadcast important information to members
- **Fields**:
  - Alert content and priority
  - Target audience criteria
  - Action requirements
  - Expiration dates

#### **user_alerts**
Individual alert delivery tracking.
- **Purpose**: Track which alerts each user has seen
- **Fields**:
  - User ID and alert ID relationship
  - Read status and timestamps
  - Dismissal status

#### **messages**
Direct messages and announcements.
- **Purpose**: Send targeted communications to members
- **Fields**:
  - Message content and subject
  - Sender and recipient information
  - Message type and priority
  - Read/delete status

#### **user_messages**
Individual message delivery tracking.
- **Purpose**: Track message delivery and status per user
- **Fields**:
  - User ID and message ID relationship
  - Read/unread status
  - Delivery timestamps

### **Content Collections**

#### **videos**
Knowledge base video content.
- **Purpose**: Store webinar and educational video information
- **Fields**:
  - Video metadata and descriptions
  - YouTube integration details
  - Access control settings
  - Comment moderation

#### **comments**
User comments on videos and content.
- **Purpose**: Community engagement and discussion
- **Fields**:
  - Comment content and author
  - Moderation status
  - Reply threading
  - Approval workflow

---

## Firebase Functions (Email & Communication)

### **Email Services**

#### **sendVerificationCode**
- **Purpose**: Send email verification codes during registration
- **Features**:
  - Rate limiting (3 codes per minute per email)
  - Email validation and formatting
  - Branded email templates
  - Resend API integration for delivery

#### **sendInvoiceEmail**
- **Purpose**: Deliver membership invoices via email
- **Features**:
  - PDF attachment support
  - Branded invoice templates
  - Payment instructions
  - Delivery confirmation

#### **sendJoinRequestNotification**
- **Purpose**: Notify users about join request status changes
- **Features**:
  - Approval/rejection notifications
  - Admin notes inclusion
  - Next steps guidance
  - Branded email templates

### **Administrative Functions**

#### **setAdminClaim**
- **Purpose**: Grant administrative privileges to users
- **Security**: Admin-only operation with caller verification
- **Function**: Updates Firebase custom claims for access control

#### **removeAdminClaim**
- **Purpose**: Revoke administrative privileges
- **Security**: Admin-only operation
- **Function**: Updates Firebase custom claims

---

## Dependencies & Third-Party Services

### **Core Framework**
- **Next.js 14**: React framework with server-side rendering and routing
- **TypeScript**: Type safety and development experience
- **Tailwind CSS**: Utility-first CSS framework for styling

### **Authentication & Database**
- **Firebase Auth**: User authentication and session management
- **Firebase Firestore**: NoSQL database for all application data
- **Firebase Storage**: File storage for logos and documents
- **Firebase Functions**: Serverless backend functions

### **Payment Processing**
- **Stripe**: Payment processing for online credit/debit card payments
- **PDF-lib**: PDF generation for invoices and documents
- **Bank Transfer**: Primary payment method via invoice system

### **Communication**
- **Resend**: Email delivery service for all outbound emails
- **Next-intl**: Internationalization for English/French support

### **Content & Media**
- **YouTube API**: Integration for webinar content
- **Fuse.js**: Full-text search functionality across site content
- **Puppeteer**: PDF generation and document processing

### **Development & Testing**
- **ESLint**: Code linting and quality enforcement
- **Geist**: Typography and design system
- **Dotenv**: Environment variable management

---

## Payment & Invoice System

### **Membership Pricing Structure**
The system calculates membership fees based on organization type and size:

#### **Individual Membership**
- **Fee**: €500 annually
- **Target**: Individual professionals in the MGA sector

#### **Corporate MGA Membership**
Tiered pricing based on gross written premiums:
- **<€10M**: €900 annually
- **€10-20M**: €1,500 annually  
- **€20-50M**: €2,000 annually
- **€50-100M**: €2,800 annually
- **€100-500M**: €4,200 annually
- **€500M+**: €6,400 annually

#### **Other Corporate Membership**
- **Carriers/Providers**: €900 annually (default corporate rate)
- **Association Member Discount**: 20% reduction for members of other European MGA associations

### **Payment Options**
During registration, members choose between two payment methods:

#### **Option 1: Online Payment (Stripe)**
- **Method**: Secure credit/debit card payment via Stripe
- **Process**: Immediate payment during registration
- **Benefits**: Instant membership activation upon payment
- **Security**: PCI-compliant payment processing

#### **Option 2: Invoice Request**
- **Method**: Bank transfer via professionally generated invoice
- **Process**: PDF invoice emailed after registration
- **Payment Terms**: Net 30 days
- **Features**: Branded invoice with payment instructions and account details

### **Payment Processing Flow**
1. **Application Submission**: Member completes registration form
2. **Payment Method Selection**: Choose between Stripe or invoice
3. **Payment Processing**:
   - **Stripe**: Redirect to secure checkout, immediate processing
   - **Invoice**: Professional PDF generated and emailed automatically
4. **Membership Activation**: Account status updated upon payment confirmation

### **Invoice System Features**
- **Branded PDF Generation**: Professional invoices with FASE letterhead
- **Automatic Calculation**: Pricing based on membership type and premium brackets
- **Email Integration**: Automated delivery with payment instructions
- **Reference Numbers**: Unique invoice numbers for payment tracking
- **Bank Details**: Secure payment instructions included in invoice

---

## Content Management & Knowledge Base

### **Video Content System**
- **YouTube Integration**: Embedded webinar and educational content
- **Comment Moderation**: Admin approval system for user comments
- **Search Functionality**: Full-text search across video titles and descriptions
- **Access Control**: Member-only content with authentication requirements

### **Search System**
- **Full-Text Search**: Powered by Fuse.js for fuzzy search capabilities
- **Content Coverage**: Searches across pages, videos, member directory
- **Filtering**: Results filtered by content type and relevance
- **Real-Time**: Instant search results as user types

### **Multi-Language Support**
- **Languages**: English (primary) and French
- **Translation System**: Next-intl for internationalization
- **Content Coverage**: All public pages and user interface elements
- **Language Switching**: Dynamic language selection in header

---

## Administrative Features

### **Member Management**
- **Application Review**: Approve/reject membership applications
- **Status Updates**: Change member status (pending, approved, admin)
- **Member Directory**: Search and manage all member accounts
- **Join Request Processing**: Handle requests to join existing companies

### **Communication Tools**
- **System Alerts**: Broadcast alerts to specific member groups
- **Direct Messaging**: Send targeted messages to individual members
- **Email Templates**: Branded email templates for all communications
- **Message Tracking**: Read receipts and delivery confirmation

### **Content Moderation**
- **Video Comments**: Approve/reject user comments on educational content
- **Content Management**: Add/edit/remove videos and educational materials
- **Member Directory**: Update member information and profiles

### **Financial Management**
- **Invoice Generation**: Create and send membership invoices
- **Payment Tracking**: Monitor payment status and renewals
- **Pricing Updates**: Adjust membership fees and discount rates
- **Financial Reporting**: Track revenue and membership growth

---

## Security & Access Control

### **Authentication System**
- **Firebase Auth**: Secure user authentication with email/password
- **Email Verification**: Required verification before account activation
- **Session Management**: Automatic session handling and renewal

### **Authorization Levels**
- **Guest**: Public page access only
- **Pending**: Limited access during application process
- **Member**: Full member portal and content access
- **Admin**: Administrative functions and member management

### **Data Protection**
- **Privacy Agreements**: Required consent for data processing
- **GDPR Compliance**: European data protection standards
- **Secure Storage**: Encrypted data storage in Firebase
- **Access Logging**: Admin actions tracked and logged

### **Rate Limiting**
- **Email Verification**: Maximum 3 codes per minute per email address
- **Login Attempts**: Protected against brute force attacks
- **API Endpoints**: Rate limiting on sensitive operations

---

## Mobile Optimization

### **Responsive Design**
- **Mobile-First**: Optimized for mobile devices and tablets
- **Hamburger Menu**: Collapsible navigation for small screens
- **Touch-Friendly**: Large tap targets and intuitive gestures
- **Performance**: Optimized loading and minimal data usage

### **Progressive Features**
- **Image Optimization**: Next.js automatic image optimization
- **Lazy Loading**: Content loaded as needed to improve performance
- **Caching**: Strategic caching for faster repeat visits

---

## Development & Deployment

### **Technology Stack**
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Firebase Functions with Node.js
- **Database**: Firebase Firestore (NoSQL)
- **Hosting**: Vercel for frontend, Firebase for backend functions

### **Development Workflow**
- **Version Control**: Git with main and feature branches
- **Testing**: Integrated linting and type checking
- **Deployment**: Automatic deployment from main branch
- **Environment**: Separate development and production environments

### **Performance Optimization**
- **Server-Side Rendering**: Next.js SSR for faster initial page loads
- **Static Generation**: Pre-built pages for better performance
- **Code Splitting**: Automatic code splitting for smaller bundle sizes
- **CDN**: Global content delivery network for fast access worldwide

---

This comprehensive site map covers all aspects of the FASE website, from public-facing content to complex administrative functions. The platform serves as a complete membership management system for the European MGA community, combining marketing, education, networking, and business operations in a single, secure, and user-friendly platform.