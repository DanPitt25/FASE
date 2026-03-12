import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../../../lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '../../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { memberId, transactionId, transactionSource } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Get the member document
    const memberRef = adminDb.collection('accounts').doc(memberId);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Update member status to approved
    await memberRef.update({
      status: 'approved',
      paymentConfirmedAt: FieldValue.serverTimestamp(),
      paymentConfirmedVia: transactionSource || 'manual',
      paymentTransactionId: transactionId || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Log activity
    await adminDb.collection('accounts').doc(memberId).collection('activities').add({
      type: 'payment_confirmed',
      title: 'Payment Confirmed',
      description: transactionId
        ? `Payment matched to ${transactionSource} transaction ${transactionId}`
        : 'Payment confirmed manually',
      performedBy: 'admin',
      performedByName: 'Admin',
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Confirmed payment for member: ${memberId}`);

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully',
    });
  } catch (error: any) {
    console.error('Error confirming member payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
