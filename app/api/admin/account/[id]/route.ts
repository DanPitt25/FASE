import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET: Get account details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing account ID' },
        { status: 400 }
      );
    }

    const accountDoc = await adminDb.collection('accounts').doc(id).get();

    if (!accountDoc.exists) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const data = accountDoc.data();

    // Format timestamps
    const account = {
      id: accountDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || null,
    };

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error: any) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch account' },
      { status: 500 }
    );
  }
}
