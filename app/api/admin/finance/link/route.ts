import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * POST: Link a payment to a member account
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const {
      transactionId,
      source,
      accountId,
      accountName,
      paymentType,
      amount,
      currency,
      notes,
    } = await request.json();

    if (!transactionId || !source || !accountId || !paymentType) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionId, source, accountId, paymentType' },
        { status: 400 }
      );
    }

    if (!['membership', 'rendezvous', 'not_a_member'].includes(paymentType)) {
      return NextResponse.json(
        { error: 'Invalid paymentType. Must be "membership", "rendezvous", or "not_a_member"' },
        { status: 400 }
      );
    }

    const docId = `${source}_${transactionId}`;
    const docRef = adminDb.collection('linked-payments').doc(docId);

    await docRef.set({
      transactionId,
      source,
      accountId,
      accountName,
      paymentType,
      amount: amount || 0,
      currency: currency || 'EUR',
      notes: notes || '',
      linkedAt: FieldValue.serverTimestamp(),
      linkedBy: authResult.userId || 'admin',
      linkedByName: 'Admin',
    });

    // Log activity for the payment
    const paymentKey = `${source}_${transactionId}`;
    await adminDb.collection('payment_activities').add({
      paymentKey,
      type: 'linked_to_member',
      title: `Linked to ${accountName}`,
      description: `Payment linked as ${paymentType} for ${accountName}`,
      createdAt: FieldValue.serverTimestamp(),
      performedBy: authResult.userId || 'admin',
      performedByName: 'Admin',
    });

    // Create a finance-match record for tracking/review
    await adminDb.collection('finance-matches').doc(docId).set({
      transactionId,
      source,
      amount: amount || 0,
      currency: currency || 'EUR',
      transactionDate: new Date().toISOString(),
      accountId,
      accountName,
      paymentType,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      createdBy: authResult.userId || 'admin',
      createdByName: 'Admin',
      notes: notes || '',
    });

    return NextResponse.json({
      success: true,
      linkedPayment: {
        id: docId,
        transactionId,
        source,
        accountId,
        accountName,
        paymentType,
      },
    });
  } catch (error: any) {
    console.error('Error linking payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link payment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Unlink a payment from a member account
 */
export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const source = searchParams.get('source');

    if (!transactionId || !source) {
      return NextResponse.json(
        { error: 'Missing required params: transactionId, source' },
        { status: 400 }
      );
    }

    const docId = `${source}_${transactionId}`;
    const docRef = adminDb.collection('linked-payments').doc(docId);

    // Get existing link info for activity log
    const existingDoc = await docRef.get();
    const existingData = existingDoc.data();

    await docRef.delete();

    // Also delete the finance-match record
    await adminDb.collection('finance-matches').doc(docId).delete();

    // Log activity for the payment
    const paymentKey = `${source}_${transactionId}`;
    await adminDb.collection('payment_activities').add({
      paymentKey,
      type: 'unlinked_from_member',
      title: existingData ? `Unlinked from ${existingData.accountName}` : 'Unlinked from member',
      description: 'Payment link removed',
      createdAt: FieldValue.serverTimestamp(),
      performedBy: authResult.userId || 'admin',
      performedByName: 'Admin',
    });

    return NextResponse.json({
      success: true,
      transactionId,
      source,
    });
  } catch (error: any) {
    console.error('Error unlinking payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unlink payment' },
      { status: 500 }
    );
  }
}

/**
 * GET: Get all linked payments or filter by accountId
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    let query: FirebaseFirestore.Query = adminDb.collection('linked-payments');

    if (accountId) {
      query = query.where('accountId', '==', accountId);
    }

    const snapshot = await query.get();

    const linkedPayments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      linkedAt: doc.data().linkedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      linkedPayments,
    });
  } catch (error: any) {
    console.error('Error fetching linked payments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch linked payments' },
      { status: 500 }
    );
  }
}
