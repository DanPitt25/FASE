/**
 * Shared Firebase Admin SDK initialization
 *
 * This is the SINGLE SOURCE OF TRUTH for Firebase Admin SDK initialization.
 * All API routes should import from here instead of initializing their own instances.
 *
 * Usage:
 *   import { adminDb, adminAuth, adminStorage } from '@/lib/firebase-admin';
 *
 *   // In your API route:
 *   const snapshot = await adminDb.collection('accounts').get();
 */

import * as admin from 'firebase-admin';

// Use a single named app to avoid conflicts with any accidental default app creation
const APP_NAME = 'fase-admin';

let initialized = false;

function initializeFirebaseAdmin(): admin.app.App {
  // Check if our app already exists
  const existingApp = admin.apps.find(a => a?.name === APP_NAME);
  if (existingApp) {
    return existingApp;
  }

  // Validate environment variable
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing. ' +
      'This is required for Firebase Admin SDK initialization.'
    );
  }

  // Parse service account
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

  // Initialize with named app
  const app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`
  }, APP_NAME);

  initialized = true;
  return app;
}

// Lazy-initialize and export services
function getApp(): admin.app.App {
  return initializeFirebaseAdmin();
}

// Firestore instance
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop) {
    const db = admin.firestore(getApp());
    return (db as any)[prop];
  }
});

// Auth instance
export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_, prop) {
    const auth = admin.auth(getApp());
    return (auth as any)[prop];
  }
});

// Storage instance
export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(_, prop) {
    const storage = admin.storage(getApp());
    return (storage as any)[prop];
  }
});

// Export FieldValue and Timestamp for convenience
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

// Export the raw admin module for edge cases
export { admin };

// For backwards compatibility - returns Firestore instance
export function getAdminDb(): admin.firestore.Firestore {
  return admin.firestore(getApp());
}

// For backwards compatibility - returns Auth instance
export function getAdminAuth(): admin.auth.Auth {
  return admin.auth(getApp());
}

// For backwards compatibility - returns Storage instance
export function getAdminStorage(): admin.storage.Storage {
  return admin.storage(getApp());
}
