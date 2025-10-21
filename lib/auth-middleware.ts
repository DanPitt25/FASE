import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();

export async function verifyAuth(request: NextRequest) {
  try {
    // Check for Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await auth.verifyIdToken(token);
      return { uid: decodedToken.uid, email: decodedToken.email };
    }

    // Check for custom token in header (fallback for ad blocker scenarios)
    const customToken = request.headers.get('X-Auth-Token');
    if (customToken) {
      try {
        const decodedToken = await auth.verifyIdToken(customToken);
        return { uid: decodedToken.uid, email: decodedToken.email };
      } catch (error) {
        // Token might be a custom token, not an ID token
        console.warn('Custom token verification failed:', error);
      }
    }

    return null;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

// Middleware to protect API routes
export function withAuth(handler: Function) {
  return async (request: NextRequest) => {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Add user to request
    (request as any).user = user;
    return handler(request);
  };
}