import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, FieldValue } from '../../../../lib/firebase-admin';
import { logNoteAdded } from '../../../../lib/activity-logger';
import { Note, NoteCategory } from '../../../../lib/firestore';

export const dynamic = 'force-dynamic';

/**
 * GET: List notes for an account
 */
export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb();

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const category = searchParams.get('category') as NoteCategory | null;
    const pinnedOnly = searchParams.get('pinned_only') === 'true';

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    let query = db
      .collection('accounts')
      .doc(accountId)
      .collection('notes')
      .orderBy('createdAt', 'desc');

    if (category) {
      query = query.where('category', '==', category);
    }

    if (pinnedOnly) {
      query = query.where('isPinned', '==', true);
    }

    const snapshot = await query.get();

    const notes = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        isPinned: data.isPinned || false,
      };
    });

    // Sort to put pinned notes first
    notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    return NextResponse.json({
      success: true,
      notes,
      count: notes.length,
    });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new note
 */
export async function POST(request: NextRequest) {
  try {
    const db = getAdminDb();

    const body = await request.json();
    const { accountId, content, category, createdBy, createdByName } = body;

    if (!accountId || !content) {
      return NextResponse.json(
        { error: 'Account ID and content are required' },
        { status: 400 }
      );
    }

    const noteRef = db.collection('accounts').doc(accountId).collection('notes').doc();

    const note: Omit<Note, 'id'> = {
      accountId,
      content,
      category: category || 'general',
      createdBy: createdBy || 'unknown',
      createdByName: createdByName || 'Unknown',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isPinned: false,
    };

    await noteRef.set(note);

    // Log the activity
    await logNoteAdded(accountId, content, noteRef.id, createdBy, createdByName);

    return NextResponse.json({
      success: true,
      noteId: noteRef.id,
      message: 'Note created successfully',
    });
  } catch (error: any) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create note' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update a note
 */
export async function PATCH(request: NextRequest) {
  try {
    const db = getAdminDb();

    const body = await request.json();
    const { accountId, noteId, content, category, isPinned } = body;

    if (!accountId || !noteId) {
      return NextResponse.json(
        { error: 'Account ID and Note ID are required' },
        { status: 400 }
      );
    }

    const noteRef = db.collection('accounts').doc(accountId).collection('notes').doc(noteId);
    const noteDoc = await noteRef.get();

    if (!noteDoc.exists) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (content !== undefined) updates.content = content;
    if (category !== undefined) updates.category = category;
    if (isPinned !== undefined) updates.isPinned = isPinned;

    await noteRef.update(updates);

    return NextResponse.json({
      success: true,
      message: 'Note updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update note' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a note
 */
export async function DELETE(request: NextRequest) {
  try {
    const db = getAdminDb();

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const noteId = searchParams.get('note_id');

    if (!accountId || !noteId) {
      return NextResponse.json(
        { error: 'Account ID and Note ID are required' },
        { status: 400 }
      );
    }

    const noteRef = db.collection('accounts').doc(accountId).collection('notes').doc(noteId);
    const noteDoc = await noteRef.get();

    if (!noteDoc.exists) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await noteRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete note' },
      { status: 500 }
    );
  }
}
