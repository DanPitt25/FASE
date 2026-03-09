import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * POST: Suppress or unsuppress a transaction
 *
 * Stores suppressed transaction IDs in Firestore so they can be
 * hidden from the Finance View (reports) while still accessible
 * in Finance Manage.
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { transactionId, source, suppressed } = await request.json();

    if (!transactionId || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionId, source' },
        { status: 400 }
      );
    }

    const docId = `${source}_${transactionId}`;
    const docRef = adminDb.collection('suppressed-transactions').doc(docId);

    if (suppressed) {
      // Add to suppressed list
      await docRef.set({
        transactionId,
        source,
        suppressedAt: FieldValue.serverTimestamp(),
        suppressedBy: authResult.userId || 'admin',
      });
    } else {
      // Remove from suppressed list
      await docRef.delete();
    }

    return NextResponse.json({
      success: true,
      transactionId,
      source,
      suppressed,
    });
  } catch (error: any) {
    console.error('Error updating suppressed status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update suppressed status' },
      { status: 500 }
    );
  }
}

/**
 * GET: Get list of suppressed transaction IDs
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const snapshot = await adminDb.collection('suppressed-transactions').get();

    const suppressed = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      suppressed,
    });
  } catch (error: any) {
    console.error('Error fetching suppressed transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch suppressed transactions' },
      { status: 500 }
    );
  }
}
