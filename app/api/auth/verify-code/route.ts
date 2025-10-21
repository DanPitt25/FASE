import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin using same approach as stripe webhook
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
    const { email, code } = await request.json();

    // Validate inputs
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Verification code must be 6 digits' },
        { status: 400 }
      );
    }

    const { auth, db } = await initializeAdmin();

    // Get verification code from Firestore
    const doc = await db.collection('verification_codes').doc(email).get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'No verification code found' },
        { status: 400 }
      );
    }

    const data = doc.data();
    
    if (!data) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }
    
    // Check if code matches
    if (data.code !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check if expired
    if (data.expiresAt.toDate() < new Date()) {
      return NextResponse.json(
        { error: 'Verification code expired' },
        { status: 400 }
      );
    }

    // Check if already used
    if (data.used) {
      return NextResponse.json(
        { error: 'Code already used' },
        { status: 400 }
      );
    }

    // Mark as used (delete the document)
    await db.collection('verification_codes').doc(email).delete();

    // Don't update any user accounts here - accounts don't exist yet
    // Account creation happens after payment/invoice selection
    // This just verifies the email code is valid

    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}