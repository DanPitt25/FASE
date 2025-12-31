# FASE Email System Audit

## Overview
This document provides a comprehensive audit of all email communications sent through the FASE platform, detailing who receives emails, when they are sent, and what triggers them.

## Email API Routes

### 1. Alert Notifications (`/api/send-alert-email`)
- **Triggered by**: Admin creating alerts in Admin Portal
- **Recipients**: Bulk members based on selection (all, members only, admins, by organization type, specific organizations)
- **When**: Admin creates an alert with email notification enabled
- **Content**: Alert title, message, optional action button
- **Batch Processing**: Sends in batches of 50 to avoid rate limits

### 2. Follow-up Emails (`/api/send-followup-email`)
- **Triggered by**: Admin from Email Invoices tab
- **Recipients**: Individual member organizations
- **When**: Following up on outstanding payments
- **Content**: Customizable follow-up message
- **Sender**: Aline Sullivan (COO)

### 3. Freeform Emails (`/api/send-freeform-email`)
- **Triggered by**: Admin from Email Invoices tab
- **Recipients**: Any email address, supports CC
- **When**: Custom communication needs
- **Content**: Fully customizable subject, body, attachments
- **Senders**: Various FASE addresses available

### 4. Team Invitations (`/api/send-invite`)
- **Triggered by**: Admin or team members adding new members
- **Recipients**: New team member email
- **When**: Adding team member to organization
- **Content**: Invitation with account setup link
- **Note**: Routes through Firebase Function

### 5. Invoice Only (`/api/send-invoice-only`)
- **Triggered by**: Admin from Email Invoices tab
- **Recipients**: Member organization + admin copy
- **When**: Sending invoice without membership approval
- **Content**: Invoice PDF attachment
- **Admin Copy**: Always sent to admin@fasemga.com

### 6. Member Portal Welcome (`/api/send-member-portal-welcome`)
- **Triggered by**: Admin from Email Invoices tab
- **Recipients**: Activated member
- **When**: After membership activation
- **Content**: Portal access instructions, member benefits
- **Sender**: William Pitt (Executive Director)

### 7. Membership Invoice - PayPal (`/api/send-membership-invoice`)
- **Triggered by**: Admin approving membership
- **Recipients**: New member organization
- **When**: Membership approval
- **Content**: Welcome message, invoice with PayPal/bank transfer options
- **Features**: Currency conversion, discounts, localization

### 8. Membership Invoice - Stripe (`/api/send-membership-invoice-stripe`)
- **Triggered by**: Admin approving membership
- **Recipients**: New member organization
- **When**: Membership approval with Stripe payment
- **Content**: Welcome message with Stripe payment link
- **Features**: Creates persistent annual subscription link

### 9. Payment Reminder (`/api/send-payment-reminder`)
- **Triggered by**: Admin from Email Invoices tab
- **Recipients**: Members with outstanding payments
- **When**: Payment overdue
- **Content**: Reminder with payment options, benefits overview
- **Features**: Optional PDF attachment

### 10. Sponsorship Invoice (`/api/send-sponsorship-invoice`)
- **Triggered by**: Admin from Email Invoices tab
- **Recipients**: Sponsor organizations
- **When**: Sponsorship agreement
- **Content**: Custom sponsorship invoice (EUR only)
- **Admin Copy**: Always sent to admin@fasemga.com

## Firebase Function Emails

### 11. Verification Code
- **Triggered by**: Login/registration system
- **Recipients**: User attempting authentication
- **When**: 2FA verification required
- **Content**: 6-digit verification code

### 12. Password Reset
- **Triggered by**: User forgot password
- **Recipients**: User requesting reset
- **When**: Password reset requested
- **Content**: Reset link

### 13. Join Request Status
- **Triggered by**: Admin reviewing applications
- **Recipients**: Membership applicant
- **When**: Application status changes
- **Content**: Approval/rejection with admin notes

### 14. Team Member Invite
- **Triggered by**: Via send-invite API
- **Recipients**: New team member
- **When**: Team invitation sent
- **Content**: Invitation with setup instructions

## Email Infrastructure

### Sender Addresses
- `admin@fasemga.com` - General administration
- `aline.sullivan@fasemga.com` - COO (payment follow-ups)
- `william.pitt@fasemga.com` - Executive Director (welcomes)
- `info@fasemga.com` - General information
- `media@fasemga.com` - Media relations

### Features
- **Service**: Resend API
- **Languages**: EN, FR, DE, ES, IT, NL
- **Preview Mode**: Available for testing
- **Admin Copies**: Automatic for invoices
- **Templates**: Consistent branding with FASE logo
- **Tracking**: Email sent indicators in UI

### Security & Compliance
- API keys stored in environment variables
- Sender authentication via Resend
- No email content logged to console in production
- Batch processing to avoid rate limits

## Common Use Cases

### New Member Onboarding
1. Admin approves application → Membership invoice email
2. Member pays → System processes payment
3. Admin activates → Member portal welcome email

### Payment Collection
1. Initial invoice sent with application approval
2. Payment reminder if overdue
3. Follow-up email for persistent non-payment
4. Custom freeform email for special cases

### Team Management
1. Admin/member adds team member → Invite email
2. Team member accepts → Verification email
3. Team member forgets password → Reset email

### Communication
1. Admin creates alert → Bulk email to affected members
2. Admin needs custom message → Freeform email
3. Sponsor agreement → Sponsorship invoice email