import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../../lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET - Get company details
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
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
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { companyId, website, bioText } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
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
