# Ad Blocker Support Setup Guide

This guide explains how to enable ad blocker support for the FASE site signup process.

## Overview

The signup process has been updated to support users with ad blockers by implementing server-side API endpoints that proxy Firebase operations. This prevents ad blockers from interfering with the authentication flow.

## Setup Instructions

### 1. Firebase Admin SDK Credentials

You need to add Firebase Admin SDK credentials to your environment variables:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (fase-site)
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Save the JSON file securely

### 2. Environment Variables

Add these variables to your `.env.local` file (and Vercel environment variables for production):

```env
FIREBASE_PROJECT_ID=fase-site
FIREBASE_CLIENT_EMAIL=<your-service-account-email>
FIREBASE_PRIVATE_KEY="<your-private-key-with-newlines>"
```

**Important:** The private key should include the newline characters. In Vercel, paste it exactly as it appears in the JSON file.

### 3. Email Service Setup

The current implementation has placeholder code for sending verification emails. You'll need to:

1. Choose an email service (SendGrid, Postmark, Resend, etc.)
2. Update `/app/api/auth/send-verification/route.ts` to actually send emails
3. Add the email service API key to your environment variables

Example with SendGrid:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

await sgMail.send({
  to: email,
  from: 'noreply@fase.eu',
  subject: 'Verify your FASE account',
  html: `
    <p>Your verification code is:</p>
    <h2>${code}</h2>
    <p>This code expires in 5 minutes.</p>
  `,
});
```

## How It Works

1. When a user signs up, the client first tries to use the API endpoints (`/api/auth/create-account`)
2. If that fails (e.g., server error), it falls back to direct Firebase calls
3. The API endpoints handle all Firebase operations server-side, avoiding ad blocker interference
4. Authentication tokens are stored in localStorage as a fallback when Firebase is blocked

## Testing

To test with ad blockers:

1. Install common ad blockers (uBlock Origin, AdBlock Plus, etc.)
2. Try the signup process at `/register`
3. Check the browser console for any blocked requests
4. Verify that signup still works despite blocked Firebase connections

## API Endpoints

- `POST /api/auth/create-account` - Creates a new user account
- `POST /api/auth/send-verification` - Sends verification code
- `POST /api/auth/verify-code` - Verifies the email verification code

## Limitations

- Real-time features (like live updates) won't work when Firebase is blocked
- The user might need to refresh the page to see updates
- Custom tokens expire after 1 hour (Firebase limitation)

## Future Improvements

1. Implement WebSocket fallback for real-time features
2. Add session management with HTTP-only cookies
3. Implement rate limiting on API endpoints
4. Add proper email templates