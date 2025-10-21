import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin using same approach as other API routes
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('Firebase credentials not configured');
    }

    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    admin.initializeApp({
      credential: serviceAccount 
        ? admin.credential.cert(serviceAccount)
        : admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  
  return {
    auth: admin.auth(),
    db: admin.firestore()
  };
};

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { auth } = await initializeAdmin();

    // Mark user's email as verified in Firebase Auth
    await auth.updateUser(uid, {
      emailVerified: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Email verification status updated'
    });
  } catch (error: any) {
    console.error('Verify user email error:', error);
    return NextResponse.json(
      { error: 'Failed to verify user email' },
      { status: 500 }
    );
  }
}