import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';
import { adminDb, FieldValue } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST: Suppress or unsuppress a rendezvous registration
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { registrationId, suppressed } = await request.json();

    if (!registrationId) {
      return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
    }

    const docRef = adminDb.collection('suppressed-rendezvous').doc(registrationId);

    if (suppressed) {
      // Add to suppressed list
      await docRef.set({
        registrationId,
        suppressedAt: FieldValue.serverTimestamp(),
        suppressedBy: authResult.userId || 'admin',
      });
    } else {
      // Remove from suppressed list
      await docRef.delete();
    }

    return NextResponse.json({
      success: true,
      registrationId,
      suppressed,
    });
  } catch (error: any) {
    console.error('Error suppressing registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to suppress registration' },
      { status: 500 }
    );
  }
}

/**
 * GET: Get list of suppressed registration IDs
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const snapshot = await adminDb.collection('suppressed-rendezvous').get();
    const suppressedIds = snapshot.docs.map(doc => doc.id);

    return NextResponse.json({
      success: true,
      suppressedIds,
    });
  } catch (error: any) {
    console.error('Error fetching suppressed registrations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch suppressed registrations' },
      { status: 500 }
    );
  }
}
