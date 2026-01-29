import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const initAdmin = () => {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
};

// Verify API key for security
const verifyApiKey = (request: NextRequest): boolean => {
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.FIRESTORE_ADMIN_API_KEY;

  if (!validKey) {
    console.warn('FIRESTORE_ADMIN_API_KEY not set - API access disabled');
    return false;
  }

  return apiKey === validKey;
};

// GET - List all top-level collections, or subcollections of a document
// Query params:
//   parentPath: optional - document path to get subcollections (e.g., "accounts/abc123")
export async function GET(request: NextRequest) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized - Invalid or missing API key' }, { status: 401 });
  }

  try {
    const db = initAdmin();
    const { searchParams } = new URL(request.url);
    const parentPath = searchParams.get('parentPath');

    let collections;

    if (parentPath) {
      // Get subcollections of a specific document
      const docRef = db.doc(parentPath);
      collections = await docRef.listCollections();
    } else {
      // Get top-level collections
      collections = await db.listCollections();
    }

    const collectionNames = collections.map(col => col.id);

    return NextResponse.json({
      success: true,
      collections: collectionNames,
      count: collectionNames.length,
      parentPath: parentPath || '(root)'
    });

  } catch (error) {
    console.error('Firestore collections list error:', error);
    return NextResponse.json({
      error: 'Failed to list collections',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
