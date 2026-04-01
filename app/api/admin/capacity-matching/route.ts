import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET - List all capacity matching submissions
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const submissionsSnapshot = await adminDb
      .collection('capacity-matching')
      .orderBy('createdAt', 'desc')
      .get();

    const submissions = submissionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    console.error('Error fetching capacity matching submissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a submission
export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('id');

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
    }

    await adminDb.collection('capacity-matching').doc(submissionId).delete();

    return NextResponse.json({ success: true, message: 'Submission deleted' });
  } catch (error: any) {
    console.error('Error deleting capacity matching submission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
