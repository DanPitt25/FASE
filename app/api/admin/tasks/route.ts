import { NextRequest, NextResponse } from 'next/server';
import { logTaskCreated, logTaskCompleted } from '../../../../lib/activity-logger';
import { Task, TaskStatus, TaskPriority } from '../../../../lib/firestore';

export const dynamic = 'force-dynamic';

let admin: any;
let db: FirebaseFirestore.Firestore;

const initializeFirebase = async () => {
  if (!admin) {
    admin = await import('firebase-admin');

    if (admin.apps.length === 0) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
      }

      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }

    db = admin.firestore();
  }

  return { admin, db };
};

/**
 * GET: List tasks
 * Without account_id: returns general admin tasks from top-level tasks collection
 * With account_id: returns account-specific tasks (legacy, kept for compatibility)
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await initializeFirebase();

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const status = searchParams.get('status') as TaskStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const now = new Date();

    // General admin tasks (no accountId) - from top-level tasks collection
    if (!accountId) {
      let query: FirebaseFirestore.Query = db.collection('tasks').orderBy('createdAt', 'desc');

      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.limit(Math.min(limit, 100)).get();

      const tasks = snapshot.docs.map((doc) => {
        const data = doc.data();
        const dueDate = data.dueDate?.toDate?.();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
          dueDate: dueDate?.toISOString() || null,
          completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
          isOverdue: dueDate && dueDate < now && data.status !== 'completed' && data.status !== 'cancelled',
        };
      });

      return NextResponse.json({
        success: true,
        tasks,
        count: tasks.length,
      });
    }

    // Account-specific tasks (legacy) - from accounts subcollection
    let query: FirebaseFirestore.Query = db
      .collection('accounts')
      .doc(accountId)
      .collection('tasks')
      .orderBy('createdAt', 'desc')
      .limit(Math.min(limit, 100));

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();

    const tasks = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        dueDate: data.dueDate?.toDate?.()?.toISOString() || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length,
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new task
 * Without accountId: creates general admin task in top-level tasks collection
 * With accountId: creates account-specific task (legacy)
 */
export async function POST(request: NextRequest) {
  try {
    const { admin, db } = await initializeFirebase();

    const body = await request.json();
    const {
      accountId,
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      assignedToName,
      createdBy,
      createdByName,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const task: any = {
      title,
      description: description || '',
      status: 'pending',
      priority: priority || 'medium',
      dueDate: dueDate ? admin.firestore.Timestamp.fromDate(new Date(dueDate)) : null,
      assignedTo: assignedTo || null,
      assignedToName: assignedToName || null,
      createdBy: createdBy || 'unknown',
      createdByName: createdByName || 'Unknown',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Remove null values
    const cleanTask = Object.fromEntries(
      Object.entries(task).filter(([_, v]) => v !== null && v !== undefined)
    );

    let taskRef;

    if (accountId) {
      // Account-specific task (legacy)
      const accountDoc = await db.collection('accounts').doc(accountId).get();
      cleanTask.accountId = accountId;
      cleanTask.accountName = accountDoc.data()?.organizationName || 'Unknown';
      taskRef = db.collection('accounts').doc(accountId).collection('tasks').doc();
      await taskRef.set(cleanTask);
      await logTaskCreated(accountId, title, taskRef.id, createdBy, createdByName);
    } else {
      // General admin task
      taskRef = db.collection('tasks').doc();
      await taskRef.set(cleanTask);
    }

    return NextResponse.json({
      success: true,
      taskId: taskRef.id,
      message: 'Task created successfully',
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update a task
 * Without accountId: updates general admin task
 * With accountId: updates account-specific task (legacy)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { admin, db } = await initializeFirebase();

    const body = await request.json();
    const {
      accountId,
      taskId,
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
      assignedToName,
      performedBy,
      performedByName,
    } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Determine which collection to use
    const taskRef = accountId
      ? db.collection('accounts').doc(accountId).collection('tasks').doc(taskId)
      : db.collection('tasks').doc(taskId);

    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const currentData = taskDoc.data();
    const updates: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (assignedToName !== undefined) updates.assignedToName = assignedToName;

    if (dueDate !== undefined) {
      updates.dueDate = dueDate
        ? admin.firestore.Timestamp.fromDate(new Date(dueDate))
        : null;
    }

    // Handle status change
    if (status !== undefined && status !== currentData?.status) {
      updates.status = status;

      if (status === 'completed') {
        updates.completedAt = admin.firestore.FieldValue.serverTimestamp();

        // Only log activity for account-specific tasks
        if (accountId) {
          await logTaskCompleted(
            accountId,
            currentData?.title || title || 'Task',
            taskId,
            performedBy || 'unknown',
            performedByName || 'Unknown'
          );
        }
      }
    }

    await taskRef.update(updates);

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a task
 * Without account_id: deletes from general admin tasks
 * With account_id: deletes account-specific task (legacy)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await initializeFirebase();

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const taskId = searchParams.get('task_id');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Determine which collection to use
    const taskRef = accountId
      ? db.collection('accounts').doc(accountId).collection('tasks').doc(taskId)
      : db.collection('tasks').doc(taskId);

    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await taskRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}
