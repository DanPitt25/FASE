import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

export async function POST(request: NextRequest) {
  try {
    const db = initAdmin();
    const body = await request.json();

    const { title, body: messageBody } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Store the notification
    const notificationData = {
      title,
      body: messageBody,
      sentAt: FieldValue.serverTimestamp(),
      sentBy: 'admin', // In production, get from auth
      recipientCount: 0, // Would be populated by push notification service
    };

    const docRef = await db.collection('event-notifications').add(notificationData);

    // In a production app, you would:
    // 1. Fetch all push notification subscriptions from a 'push-subscriptions' collection
    // 2. Send web push notifications using web-push library
    // 3. Update recipientCount with the number of successful sends
    //
    // For now, we just store the notification for display in the app

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Notification stored. Push delivery would happen in production.',
    });
  } catch (error: any) {
    console.error('Error broadcasting notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to broadcast notification' },
      { status: 500 }
    );
  }
}
