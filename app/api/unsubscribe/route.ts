import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../lib/firebase-admin';
import { validateUnsubscribeToken } from '../../../lib/unsubscribe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate token
    if (!validateUnsubscribeToken(normalizedEmail, token)) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 403 }
      );
    }

    // Add to unsubscribe collection (use email as doc ID to prevent duplicates)
    const docId = normalizedEmail.replace(/[.@]/g, '_');
    await adminDb.collection('email-unsubscribes').doc(docId).set({
      email: normalizedEmail,
      unsubscribedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`✅ Email unsubscribed: ${normalizedEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed',
    });
  } catch (error: any) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
