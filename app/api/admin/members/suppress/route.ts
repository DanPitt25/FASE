import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';
import { adminDb, FieldValue } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST: Suppress or unsuppress a member
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { memberId, suppressed } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    const docRef = adminDb.collection('suppressed-members').doc(memberId);

    if (suppressed) {
      // Add to suppressed list
      await docRef.set({
        memberId,
        suppressedAt: FieldValue.serverTimestamp(),
        suppressedBy: authResult.userId || 'admin',
      });
    } else {
      // Remove from suppressed list
      await docRef.delete();
    }

    return NextResponse.json({
      success: true,
      memberId,
      suppressed,
    });
  } catch (error: any) {
    console.error('Error suppressing member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to suppress member' },
      { status: 500 }
    );
  }
}

/**
 * GET: Get list of suppressed member IDs
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const snapshot = await adminDb.collection('suppressed-members').get();
    const suppressedIds = snapshot.docs.map(doc => doc.id);

    return NextResponse.json({
      success: true,
      suppressedIds,
    });
  } catch (error: any) {
    console.error('Error fetching suppressed members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch suppressed members' },
      { status: 500 }
    );
  }
}
