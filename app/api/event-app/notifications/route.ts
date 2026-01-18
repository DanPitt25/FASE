import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

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

    const notificationsSnapshot = await db
      .collection('event-notifications')
      .orderBy('sentAt', 'desc')
      .limit(50)
      .get();

    const notifications = notificationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt?.toDate?.()?.toISOString() || doc.data().sentAt,
    }));

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
