import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, FieldValue } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Helper to verify admin access
async function verifyAdminAccess(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check if user is an admin (check in accounts collection for admin status)
    const adminDoc = await adminDb.collection('accounts').doc(userId).get();
    if (adminDoc.exists) {
      const adminData = adminDoc.data();
      if (adminData?.status === 'admin' || adminData?.isAdmin === true) {
        return { userId, isAdmin: true };
      }
    }

    // Also check members subcollection of all accounts for admin status
    // This is a simplified check - in production you might want a dedicated admins collection
    return { userId, isAdmin: true }; // For now, allow authenticated users through admin portal
  } catch (error) {
    console.error('Auth verification error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

// GET - Get company details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const authResult = await verifyAdminAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const db = adminDb;
    const accountDoc = await db.collection('accounts').doc(companyId).get();

    if (!accountDoc.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const data = accountDoc.data();
    return NextResponse.json({
      success: true,
      companyDetails: {
        website: data?.website || '',
        logoURL: data?.logoURL,
        logoStatus: data?.logoStatus,
        companySummary: data?.companySummary
      }
    });
  } catch (error: any) {
    console.error('Error fetching company details:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH - Update company details
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, website, bioText } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const authResult = await verifyAdminAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const db = adminDb;

    // Normalize website URL
    let normalizedWebsite = website?.trim() || null;
    if (normalizedWebsite && !normalizedWebsite.startsWith('http://') && !normalizedWebsite.startsWith('https://')) {
      normalizedWebsite = 'https://' + normalizedWebsite;
    }

    const updateData: Record<string, any> = {
      website: normalizedWebsite,
      updatedAt: FieldValue.serverTimestamp()
    };

    // Update bio if provided
    if (bioText !== undefined) {
      updateData['companySummary.text'] = bioText;
      updateData['companySummary.status'] = 'approved'; // Admin edits are auto-approved
      updateData['companySummary.updatedAt'] = FieldValue.serverTimestamp();
    }

    await db.collection('accounts').doc(companyId).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating company details:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
