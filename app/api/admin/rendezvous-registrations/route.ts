import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  try {
    const db = initAdmin();

    // Fetch all rendezvous registrations
    const registrationsSnapshot = await db
      .collection('rendezvous-registrations')
      .orderBy('createdAt', 'desc')
      .get();

    const registrations = registrationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
    }));

    return NextResponse.json({
      success: true,
      registrations
    });
  } catch (error: any) {
    console.error('Error fetching rendezvous registrations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}
