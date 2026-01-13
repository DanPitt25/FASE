import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin using service account key from environment variable
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
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
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { auth, db } = await initializeAdmin();

    // Delete user from Firebase Auth
    try {
      await auth.deleteUser(userId);
    } catch {
      // User auth record may not exist
    }

    // Delete account document from Firestore
    try {
      await db.collection('accounts').doc(userId).delete();
    } catch {
      // Account document may not exist
    }

    // Delete draft application if it exists
    try {
      await db.collection('draft_applications').doc(userId).delete();
    } catch {
      // Draft application may not exist
    }

    return NextResponse.json({
      success: true,
      message: 'Account cleanup completed'
    });

  } catch (error: any) {
    console.error('Account cleanup error:', error);
    
    return NextResponse.json(
      { error: 'Failed to cleanup account' },
      { status: 500 }
    );
  }
}