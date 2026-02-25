import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET: Get notes for a specific payment transaction
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const source = searchParams.get('source');

    if (!transactionId || !source) {
      return NextResponse.json(
        { error: 'Missing transactionId or source parameter' },
        { status: 400 }
      );
    }

    const paymentKey = `${source}_${transactionId}`;

    // Get notes from the payment_notes collection
    const notesRef = adminDb.collection('payment_notes');
    const snapshot = await notesRef
      .where('paymentKey', '==', paymentKey)
      .orderBy('createdAt', 'desc')
      .get();

    const notes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    return NextResponse.json({
      success: true,
      notes,
    });
  } catch (error: any) {
    console.error('Error fetching payment notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST: Add a note for a payment transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transactionId,
      source,
      content,
      category,
      createdBy,
      createdByName,
    } = body;

    if (!transactionId || !source || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const paymentKey = `${source}_${transactionId}`;

    const noteData = {
      paymentKey,
      transactionId,
      source,
      content,
      category: category || 'general',
      createdBy: createdBy || 'admin',
      createdByName: createdByName || 'Admin',
      isPinned: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('payment_notes').add(noteData);

    // Also log an activity
    await adminDb.collection('payment_activities').add({
      paymentKey,
      transactionId,
      source,
      type: 'note_added',
      title: 'Note Added',
      description: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      performedBy: createdBy || 'admin',
      performedByName: createdByName || 'Admin',
      metadata: { noteId: docRef.id },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      noteId: docRef.id,
    });
  } catch (error: any) {
    console.error('Error adding payment note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add note' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a note
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');
    const transactionId = searchParams.get('transactionId');
    const source = searchParams.get('source');

    if (!noteId) {
      return NextResponse.json(
        { error: 'Missing noteId parameter' },
        { status: 400 }
      );
    }

    await adminDb.collection('payment_notes').doc(noteId).delete();

    // Log activity if we have transaction info
    if (transactionId && source) {
      const paymentKey = `${source}_${transactionId}`;
      await adminDb.collection('payment_activities').add({
        paymentKey,
        transactionId,
        source,
        type: 'note_deleted',
        title: 'Note Deleted',
        performedBy: 'admin',
        performedByName: 'Admin',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Error deleting payment note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete note' },
      { status: 500 }
    );
  }
}
