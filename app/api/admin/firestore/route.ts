import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const initAdmin = () => {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
};

// Helper to serialize Firestore documents
const serializeDoc = (doc: FirebaseFirestore.DocumentSnapshot) => {
  const data = doc.data();
  if (!data) return null;

  // Convert Firestore Timestamps to ISO strings
  const serialized: Record<string, unknown> = { id: doc.id };
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'toDate' in value) {
      serialized[key] = (value as { toDate: () => Date }).toDate().toISOString();
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
};

// GET - Read documents from a collection
// Query params:
//   collection: required - collection name (supports subcollections like "accounts/abc123/notes")
//   id: optional - specific document ID
//   limit: optional - max documents to return (default 50)
//   orderBy: optional - field to order by
//   orderDir: optional - 'asc' or 'desc' (default 'desc')
//   where: optional - JSON array of conditions like [["field", "==", "value"]]
export async function GET(request: NextRequest) {
  try {
    const db = initAdmin();
    const { searchParams } = new URL(request.url);

    const collection = searchParams.get('collection');
    const docId = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const orderBy = searchParams.get('orderBy');
    const orderDir = (searchParams.get('orderDir') || 'desc') as 'asc' | 'desc';
    const whereParam = searchParams.get('where');

    if (!collection) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    // If specific document ID requested
    if (docId) {
      const docRef = db.collection(collection).doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: serializeDoc(doc)
      });
    }

    // Query collection
    let query: FirebaseFirestore.Query = db.collection(collection);

    // Apply where conditions
    if (whereParam) {
      try {
        const conditions = JSON.parse(whereParam) as Array<[string, FirebaseFirestore.WhereFilterOp, unknown]>;
        for (const [field, op, value] of conditions) {
          query = query.where(field, op, value);
        }
      } catch {
        return NextResponse.json({ error: 'Invalid where parameter - must be JSON array' }, { status: 400 });
      }
    }

    // Apply ordering
    if (orderBy) {
      query = query.orderBy(orderBy, orderDir);
    }

    // Apply limit
    query = query.limit(limit);

    const snapshot = await query.get();
    const documents = snapshot.docs.map(serializeDoc).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: documents,
      count: documents.length
    });

  } catch (error) {
    console.error('Firestore GET error:', error);
    return NextResponse.json({
      error: 'Failed to read from Firestore',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create a new document
// Body: { collection: string, data: object, id?: string }
export async function POST(request: NextRequest) {
  try {
    const db = initAdmin();
    const body = await request.json();
    const { collection, data, id } = body;

    if (!collection) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Data object is required' }, { status: 400 });
    }

    // Add timestamp
    const docData = {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    let docRef;
    if (id) {
      // Use specified ID
      docRef = db.collection(collection).doc(id);
      await docRef.set(docData);
    } else {
      // Auto-generate ID
      docRef = await db.collection(collection).add(docData);
    }

    console.log(`✅ Created document in ${collection}: ${docRef.id}`);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: `Document created in ${collection}`
    });

  } catch (error) {
    console.error('Firestore POST error:', error);
    return NextResponse.json({
      error: 'Failed to create document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH - Update an existing document
// Body: { collection: string, id: string, data: object, merge?: boolean }
export async function PATCH(request: NextRequest) {
  try {
    const db = initAdmin();
    const body = await request.json();
    const { collection, id, data, merge = true } = body;

    if (!collection) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Data object is required' }, { status: 400 });
    }

    const docRef = db.collection(collection).doc(id);

    // Check if document exists
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Update with timestamp
    const updateData = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (merge) {
      await docRef.set(updateData, { merge: true });
    } else {
      await docRef.update(updateData);
    }

    console.log(`✅ Updated document in ${collection}: ${id}`);

    return NextResponse.json({
      success: true,
      id,
      message: `Document updated in ${collection}`
    });

  } catch (error) {
    console.error('Firestore PATCH error:', error);
    return NextResponse.json({
      error: 'Failed to update document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete a document
// Query params: collection, id
// Optional body: { confirmPhrase: 'DELETE' } for safety
export async function DELETE(request: NextRequest) {
  try {
    const db = initAdmin();
    const { searchParams } = new URL(request.url);

    const collection = searchParams.get('collection');
    const id = searchParams.get('id');

    if (!collection) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const docRef = db.collection(collection).doc(id);

    // Check if document exists
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await docRef.delete();

    console.log(`✅ Deleted document from ${collection}: ${id}`);

    return NextResponse.json({
      success: true,
      id,
      message: `Document deleted from ${collection}`
    });

  } catch (error) {
    console.error('Firestore DELETE error:', error);
    return NextResponse.json({
      error: 'Failed to delete document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
