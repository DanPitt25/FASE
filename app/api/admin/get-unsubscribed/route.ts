import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const unsubscribedSnapshot = await adminDb.collection('email-unsubscribes').get();

    const unsubscribed = unsubscribedSnapshot.docs.map(doc => ({
      email: doc.data().email?.toLowerCase() || doc.id,
      unsubscribedAt: doc.data().unsubscribedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      unsubscribed,
    });
  } catch (error: any) {
    console.error('Error fetching unsubscribed emails:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unsubscribed emails' },
      { status: 500 }
    );
  }
}
