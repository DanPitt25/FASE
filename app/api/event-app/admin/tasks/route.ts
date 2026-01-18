import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const initAdmin = () => {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getFirestore();
};

// GET - Fetch tasks
export async function GET(request: NextRequest) {
  try {
    const db = initAdmin();
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');

    const tasksSnapshot = await db
      .collection('event-tasks')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const tasks = tasksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST - Create new task
export async function POST(request: NextRequest) {
  try {
    const db = initAdmin();
    const body = await request.json();

    const { title, description, assignee, priority, dueDate, createdBy } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const taskData = {
      title,
      description: description || '',
      assignee: assignee || 'Unassigned',
      priority: priority || 'medium',
      status: 'todo',
      dueDate: dueDate || null,
      createdBy: createdBy || 'Unknown',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('event-tasks').add(taskData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      ...taskData,
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}

// PATCH - Update task
export async function PATCH(request: NextRequest) {
  try {
    const db = initAdmin();
    const body = await request.json();

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await db.collection('event-tasks').doc(id).update({
      ...cleanUpdates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE - Delete task
export async function DELETE(request: NextRequest) {
  try {
    const db = initAdmin();
    const body = await request.json();

    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await db.collection('event-tasks').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}
