import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET: Get activities for a specific payment transaction
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const source = searchParams.get('source');

    if (!transactionId || !source) {
      return NextResponse.json(
        { error: 'Missing transactionId or source parameter' },
        { status: 400 }
      );
    }

    // Create a unique key for the payment
    const paymentKey = `${source}_${transactionId}`;

    // Get activities from the payment_activities collection
    const activitiesRef = adminDb.collection('payment_activities');
    const snapshot = await activitiesRef
      .where('paymentKey', '==', paymentKey)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const activities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    return NextResponse.json({
      success: true,
      activities,
    });
  } catch (error: any) {
    console.error('Error fetching payment activities:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

/**
 * POST: Add an activity for a payment transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transactionId,
      source,
      type,
      title,
      description,
      performedBy,
      performedByName,
      metadata,
    } = body;

    if (!transactionId || !source || !type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const paymentKey = `${source}_${transactionId}`;

    const activityData = {
      paymentKey,
      transactionId,
      source,
      type,
      title,
      description: description || '',
      performedBy: performedBy || 'system',
      performedByName: performedByName || 'System',
      metadata: metadata || {},
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('payment_activities').add(activityData);

    return NextResponse.json({
      success: true,
      activityId: docRef.id,
    });
  } catch (error: any) {
    console.error('Error adding payment activity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add activity' },
      { status: 500 }
    );
  }
}
