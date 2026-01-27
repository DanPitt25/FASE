import { NextRequest, NextResponse } from 'next/server';
import { logManualEntry } from '../../../../lib/activity-logger';

export const dynamic = 'force-dynamic';

let admin: any;
let db: FirebaseFirestore.Firestore;

const initializeFirebase = async () => {
  if (!admin) {
    admin = await import('firebase-admin');

    if (admin.apps.length === 0) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
      }

      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }

    db = admin.firestore();
  }

  return { admin, db };
};

/**
 * GET: List activities for an account
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await initializeFirebase();

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const startAfter = searchParams.get('start_after');
    const type = searchParams.get('type');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    let query = db
      .collection('accounts')
      .doc(accountId)
      .collection('activities')
      .orderBy('createdAt', 'desc')
      .limit(Math.min(limit, 100));

    if (type) {
      query = query.where('type', '==', type);
    }

    if (startAfter) {
      const startAfterDoc = await db
        .collection('accounts')
        .doc(accountId)
        .collection('activities')
        .doc(startAfter)
        .get();

      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const snapshot = await query.get();

    const activities = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({
      success: true,
      activities,
      hasMore: activities.length === limit,
      nextCursor: activities.length > 0 ? activities[activities.length - 1].id : null,
    });
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a manual activity entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, title, description, performedBy, performedByName } = body;

    if (!accountId || !title) {
      return NextResponse.json(
        { error: 'Account ID and title are required' },
        { status: 400 }
      );
    }

    const activityId = await logManualEntry(
      accountId,
      title,
      description || '',
      performedBy || 'unknown',
      performedByName || 'Unknown'
    );

    return NextResponse.json({
      success: true,
      activityId,
      message: 'Activity logged successfully',
    });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create activity' },
      { status: 500 }
    );
  }
}
