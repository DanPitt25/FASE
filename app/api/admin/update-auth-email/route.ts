import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * POST: Update a Firebase Auth user's email address
 * Body: { uid: string, newEmail: string }
 *
 * Also updates the email in the members collection if found.
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { uid, newEmail } = await request.json();

    if (!uid || !newEmail) {
      return NextResponse.json(
        { error: 'Missing uid or newEmail' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Update Firebase Auth
    const userRecord = await adminAuth.updateUser(uid, { email: newEmail });

    // Also update the members collection if they exist there
    const memberQuery = await adminDb.collection('members').where('uid', '==', uid).get();
    if (!memberQuery.empty) {
      const memberDoc = memberQuery.docs[0];
      await memberDoc.ref.update({ email: newEmail });
    }

    return NextResponse.json({
      success: true,
      message: `Email updated to ${newEmail}`,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      }
    });
  } catch (error: any) {
    console.error('Error updating auth email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update email' },
      { status: 500 }
    );
  }
}
