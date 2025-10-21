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

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    const { db } = await initializeAdmin();

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

    // Store verification code in Firestore
    await db.collection('verification_codes').doc(email).set({
      code,
      email,
      expiresAt,
      createdAt: new Date(),
      used: false,
    });

    // Call the Firebase Function to send the email
    try {
      const response = await fetch(`https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/sendVerificationCode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { email, code }
        }),
      });

      if (!response.ok) {
        console.error('Failed to call sendVerificationCode function:', response.status);
      }
    } catch (error) {
      console.error('Error calling Firebase function:', error);
      // Continue anyway - the code is stored and user can still verify
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    });
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}