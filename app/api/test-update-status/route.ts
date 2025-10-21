import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
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
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { db } = await initializeAdmin();
    
    const accountRef = db.collection('accounts').doc(userId);
    await accountRef.update({
      status: 'approved',
      paymentStatus: 'paid',
      paymentMethod: 'stripe',
      paymentId: 'test_payment',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      message: 'Status updated to approved'
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}