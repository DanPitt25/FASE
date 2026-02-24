import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    // Fetch members from the subcollection
    const membersRef = adminDb.collection('accounts').doc(companyId).collection('members');
    const membersSnapshot = await membersRef.get();

    const members = membersSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        personalName: data.personalName || data.name || 'Unknown',
        jobTitle: data.jobTitle,
        isPrimaryContact: data.isPrimaryContact,
        isAccountAdministrator: data.isAccountAdministrator
      };
    });

    return NextResponse.json({
      success: true,
      members
    });
  } catch (error: any) {
    console.error('Error fetching company members:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
