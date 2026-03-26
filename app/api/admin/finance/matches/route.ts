import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export interface FinanceMatch {
  id: string;
  // Transaction info
  transactionId: string;
  source: 'stripe' | 'wise';
  amount: number;
  currency: string;
  transactionDate: string;
  senderName?: string;
  reference?: string;
  // Link info
  accountId: string;
  accountName: string;
  paymentType: 'membership' | 'rendezvous';
  // Status
  status: 'pending' | 'resolved';
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolution?: string; // e.g., "Invoice sent", "Already paid", "Credited to next year"
  // Metadata
  createdAt: string;
  createdBy: string;
  createdByName: string;
  notes?: string;
}

/**
 * GET: List all finance matches, optionally filtered by status
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'resolved', or null for all
    const accountId = searchParams.get('accountId');

    let query: FirebaseFirestore.Query = adminDb.collection('finance-matches');

    if (status) {
      query = query.where('status', '==', status);
    }

    if (accountId) {
      query = query.where('accountId', '==', accountId);
    }

    // Order by creation date, newest first
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();

    const matches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString() || null,
    }));

    // Count by status
    const pendingCount = matches.filter(m => m.status === 'pending').length;
    const resolvedCount = matches.filter(m => m.status === 'resolved').length;

    return NextResponse.json({
      success: true,
      matches,
      summary: {
        total: matches.length,
        pending: pendingCount,
        resolved: resolvedCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching finance matches:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch finance matches' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new finance match (called when linking a payment)
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      transactionId,
      source,
      amount,
      currency,
      transactionDate,
      senderName,
      reference,
      accountId,
      accountName,
      paymentType,
      notes,
    } = body;

    if (!transactionId || !source || !accountId || !paymentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use same doc ID pattern as linked-payments for easy lookup
    const docId = `${source}_${transactionId}`;

    const matchData = {
      transactionId,
      source,
      amount: amount || 0,
      currency: currency || 'EUR',
      transactionDate: transactionDate || new Date().toISOString(),
      senderName: senderName || '',
      reference: reference || '',
      accountId,
      accountName,
      paymentType,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      createdBy: authResult.userId || 'admin',
      createdByName: 'Admin',
      notes: notes || '',
    };

    await adminDb.collection('finance-matches').doc(docId).set(matchData);

    return NextResponse.json({
      success: true,
      match: {
        id: docId,
        ...matchData,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating finance match:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create finance match' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update a finance match (resolve it)
 */
export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { matchId, status, resolution, notes } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Missing matchId' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('finance-matches').doc(matchId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Finance match not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {};

    if (status) {
      updateData.status = status;
      if (status === 'resolved') {
        updateData.resolvedAt = FieldValue.serverTimestamp();
        updateData.resolvedBy = authResult.userId || 'admin';
        updateData.resolvedByName = 'Admin';
      }
    }

    if (resolution !== undefined) {
      updateData.resolution = resolution;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    await docRef.update(updateData);

    const updated = await docRef.get();

    return NextResponse.json({
      success: true,
      match: {
        id: matchId,
        ...updated.data(),
        createdAt: updated.data()?.createdAt?.toDate?.()?.toISOString() || null,
        resolvedAt: updated.data()?.resolvedAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (error: any) {
    console.error('Error updating finance match:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update finance match' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a finance match (when unlinking a payment)
 */
export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json(
        { error: 'Missing matchId' },
        { status: 400 }
      );
    }

    await adminDb.collection('finance-matches').doc(matchId).delete();

    return NextResponse.json({
      success: true,
      matchId,
    });
  } catch (error: any) {
    console.error('Error deleting finance match:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete finance match' },
      { status: 500 }
    );
  }
}
