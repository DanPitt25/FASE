import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, FieldValue } from '../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Helper to verify the user is authenticated and belongs to the organization
async function verifyUserAccess(request: NextRequest, organizationId: string) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check if user is a member of this organization
    const memberDoc = await adminDb
      .collection('accounts')
      .doc(organizationId)
      .collection('members')
      .doc(userId)
      .get();

    if (!memberDoc.exists) {
      return { error: 'Not a member of this organization', status: 403 };
    }

    const memberData = memberDoc.data();
    const isAdmin = memberData?.isAccountAdministrator === true;

    return { userId, isAdmin, memberData };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

// GET - List team members
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const authResult = await verifyUserAccess(request, organizationId);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const db = adminDb;
    const membersSnapshot = await db
      .collection('accounts')
      .doc(organizationId)
      .collection('members')
      .get();

    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, members });
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Add a new team member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, email, personalName, jobTitle } = body;

    if (!organizationId || !email || !personalName) {
      return NextResponse.json({
        error: 'organizationId, email, and personalName are required'
      }, { status: 400 });
    }

    const authResult = await verifyUserAccess(request, organizationId);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!authResult.isAdmin) {
      return NextResponse.json({ error: 'Only administrators can add members' }, { status: 403 });
    }

    const db = adminDb;

    // Check member count
    const membersSnapshot = await db
      .collection('accounts')
      .doc(organizationId)
      .collection('members')
      .get();

    if (membersSnapshot.size >= 3) {
      return NextResponse.json({
        error: 'Maximum of 3 team members allowed'
      }, { status: 400 });
    }

    // Generate member ID
    const memberId = `member_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const memberData = {
      id: memberId,
      email: email.toLowerCase().trim(),
      personalName: personalName.trim(),
      jobTitle: jobTitle?.trim() || '',
      isAccountAdministrator: false,
      isRegistrant: false,
      accountConfirmed: false,
      addedBy: authResult.userId,
      joinedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await db
      .collection('accounts')
      .doc(organizationId)
      .collection('members')
      .doc(memberId)
      .set(memberData);

    return NextResponse.json({
      success: true,
      member: { ...memberData, id: memberId }
    });
  } catch (error: any) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH - Update a team member
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, memberId, personalName, jobTitle, isAccountAdministrator } = body;

    if (!organizationId || !memberId) {
      return NextResponse.json({
        error: 'organizationId and memberId are required'
      }, { status: 400 });
    }

    const authResult = await verifyUserAccess(request, organizationId);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Users can edit their own profile, admins can edit anyone
    const isEditingSelf = authResult.userId === memberId;
    if (!authResult.isAdmin && !isEditingSelf) {
      return NextResponse.json({
        error: 'You can only edit your own profile'
      }, { status: 403 });
    }

    const db = adminDb;

    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp()
    };

    if (personalName !== undefined) updateData.personalName = personalName;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;

    // Only admins can change admin status
    if (isAccountAdministrator !== undefined && authResult.isAdmin) {
      updateData.isAccountAdministrator = isAccountAdministrator;
    }

    await db
      .collection('accounts')
      .doc(organizationId)
      .collection('members')
      .doc(memberId)
      .update(updateData);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating team member:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a team member
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const memberId = searchParams.get('memberId');

    if (!organizationId || !memberId) {
      return NextResponse.json({
        error: 'organizationId and memberId are required'
      }, { status: 400 });
    }

    const authResult = await verifyUserAccess(request, organizationId);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!authResult.isAdmin) {
      return NextResponse.json({
        error: 'Only administrators can remove members'
      }, { status: 403 });
    }

    // Prevent self-removal
    if (authResult.userId === memberId) {
      return NextResponse.json({
        error: 'You cannot remove yourself'
      }, { status: 400 });
    }

    const db = adminDb;

    await db
      .collection('accounts')
      .doc(organizationId)
      .collection('members')
      .doc(memberId)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
