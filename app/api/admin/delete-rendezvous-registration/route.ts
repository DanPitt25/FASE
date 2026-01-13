import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const initAdmin = () => {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getFirestore();
};

export async function POST(request: NextRequest) {
  try {
    const { registrationId } = await request.json();

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID is required' },
        { status: 400 }
      );
    }

    const db = initAdmin();

    // Delete the registration document
    await db.collection('rendezvous-registrations').doc(registrationId).delete();

    return NextResponse.json({
      success: true,
      message: 'Registration deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting rendezvous registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete registration' },
      { status: 500 }
    );
  }
}
