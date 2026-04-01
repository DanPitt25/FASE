import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, FieldValue } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Helper to verify member authentication
async function verifyMemberAccess(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get the user's account data
    const accountDoc = await adminDb.collection('accounts').doc(userId).get();

    if (accountDoc.exists) {
      const accountData = accountDoc.data();
      // Check if approved member
      if (accountData?.status !== 'approved' && accountData?.status !== 'admin') {
        return { error: 'Member access required', status: 403 };
      }
      return {
        userId,
        email: decodedToken.email || '',
        organizationId: userId,
        organizationName: accountData?.organizationName || accountData?.companyName || '',
        personalName: accountData?.personalName || '',
      };
    }

    // Check if user is in a members subcollection
    const accountsSnapshot = await adminDb.collection('accounts').get();
    for (const doc of accountsSnapshot.docs) {
      const memberDoc = await adminDb
        .collection('accounts')
        .doc(doc.id)
        .collection('members')
        .doc(userId)
        .get();

      if (memberDoc.exists) {
        const parentAccountData = doc.data();
        const memberData = memberDoc.data();
        if (parentAccountData?.status !== 'approved' && parentAccountData?.status !== 'admin') {
          return { error: 'Member access required', status: 403 };
        }
        return {
          userId,
          email: decodedToken.email || '',
          organizationId: doc.id,
          organizationName: parentAccountData?.organizationName || parentAccountData?.companyName || '',
          personalName: memberData?.personalName || '',
        };
      }
    }

    return { error: 'Member not found', status: 403 };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

// GET - Get member's own submissions
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyMemberAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { organizationId } = authResult;

    // Get submissions for this organization
    const submissionsSnapshot = await adminDb
      .collection('capacity-matching')
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .get();

    const submissions = submissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    console.error('Error fetching capacity matching submissions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Submit new capacity matching questionnaire
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyMemberAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { userId, email, organizationId, organizationName, personalName } = authResult;
    const body = await request.json();
    const { entries, contactName, contactEmail, companyName } = body;

    // Validate entries
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'At least one entry is required' }, { status: 400 });
    }

    // Validate each entry has required fields
    for (const entry of entries) {
      if (!entry.lineOfBusiness || !entry.country) {
        return NextResponse.json({ error: 'Each entry must have a line of business and country' }, { status: 400 });
      }
    }

    const submission = {
      memberId: userId,
      memberEmail: email,
      organizationId,
      organizationName: companyName || organizationName,
      contactName: contactName || personalName,
      contactEmail: contactEmail || email,
      entries: entries.map((entry: any) => ({
        lineOfBusiness: entry.lineOfBusiness,
        country: entry.country,
        gwp2025: Number(entry.gwp2025) || 0,
        targetYear1: Number(entry.targetYear1) || 0,
        targetYear2: Number(entry.targetYear2) || 0,
        targetYear3: Number(entry.targetYear3) || 0,
        notes: entry.notes || '',
      })),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('capacity-matching').add(submission);

    return NextResponse.json({
      success: true,
      submissionId: docRef.id,
      message: 'Capacity matching submission saved successfully'
    });
  } catch (error: any) {
    console.error('Error saving capacity matching submission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
