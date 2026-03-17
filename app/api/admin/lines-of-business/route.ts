import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET - Fetch all accounts with otherLinesOfBusiness data
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const accountsSnapshot = await adminDb.collection('accounts').get();

    const entries: Array<{
      accountId: string;
      organizationName: string;
      other1: string;
      other2: string;
      other3: string;
    }> = [];

    accountsSnapshot.forEach(doc => {
      const data = doc.data();
      const otherLOB = data.portfolio?.otherLinesOfBusiness;

      // Only include if the account has otherLinesOfBusiness object
      if (otherLOB) {
        entries.push({
          accountId: doc.id,
          organizationName: data.organizationName || data.companyName || 'Unknown',
          other1: otherLOB.other1 || '',
          other2: otherLOB.other2 || '',
          other3: otherLOB.other3 || '',
        });
      }
    });

    // Sort by organization name
    entries.sort((a, b) => a.organizationName.localeCompare(b.organizationName));

    return NextResponse.json({ success: true, entries });
  } catch (error: any) {
    console.error('Error fetching lines of business:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update a specific otherLinesOfBusiness field
export async function PATCH(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { accountId, field, value } = await request.json();

    // Validate field
    if (!['other1', 'other2', 'other3'].includes(field)) {
      return NextResponse.json(
        { success: false, error: 'Invalid field' },
        { status: 400 }
      );
    }

    // Validate accountId
    if (!accountId || typeof accountId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid accountId' },
        { status: 400 }
      );
    }

    // Update the specific field
    await adminDb.collection('accounts').doc(accountId).update({
      [`portfolio.otherLinesOfBusiness.${field}`]: value,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating lines of business:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
