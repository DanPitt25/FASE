import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { CompanyMember } from '../../../lib/unified-member';
import { verifyAuth } from '../../../lib/auth-middleware';

// Initialize Firebase Admin
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn('Firebase Admin credentials not configured - this API may not work properly');
      throw new Error('Firebase credentials not configured');
    }

    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    admin.initializeApp({
      credential: serviceAccount 
        ? admin.credential.cert(serviceAccount)
        : admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  
  return {
    auth: admin.auth(),
    db: admin.firestore()
  };
};

// GET - Fetch company members
export async function GET(request: NextRequest) {
  // Verify the requesting user's token first
  const authenticatedUser = await verifyAuth(request);
  if (!authenticatedUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const userUid = searchParams.get('userUid');

  try {
    if (!companyId || !userUid) {
      return NextResponse.json(
        { error: 'Company ID and User UID are required' },
        { status: 400 }
      );
    }

    // Verify the authenticated user matches the requested userUid
    if (authenticatedUser.uid !== userUid) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot access other users\' data' },
        { status: 403 }
      );
    }


    const { db } = await initializeAdmin();

    // First verify the user has access to this company
    const userInCompany = await db
      .collection('accounts')
      .doc(companyId)
      .collection('members')
      .doc(userUid)
      .get();

    if (!userInCompany.exists) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get company information
    const companyDoc = await db.collection('accounts').doc(companyId).get();
    
    if (!companyDoc.exists) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const companyData = companyDoc.data();

    // Get all company members using Admin SDK
    console.log('About to get company members with:', companyId);
    const membersSnapshot = await db.collection('accounts').doc(companyId).collection('members').get();
    console.log('Members snapshot size:', membersSnapshot.size);
    
    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('Members data:', members);

    return NextResponse.json({
      success: true,
      company: {
        id: companyId,
        organizationName: companyData?.organizationName,
        organizationType: companyData?.organizationType,
        status: companyData?.status
      },
      members
    });

  } catch (error) {
    console.error('Get members error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      companyId,
      userUid
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch members',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update member information
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, userUid, memberUid, updates } = body;

    if (!companyId || !userUid || !memberUid || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await initializeAdmin();

    // Verify the user has access to this company and has admin privileges
    const userInCompany = await db
      .collection('accounts')
      .doc(companyId)
      .collection('members')
      .doc(userUid)
      .get();

    if (!userInCompany.exists) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const userData = userInCompany.data();
    if (!userData?.isPrimaryContact) {
      return NextResponse.json(
        { error: 'Only primary contacts can update member information' },
        { status: 403 }
      );
    }

    // Update the member
    const memberRef = db
      .collection('accounts')
      .doc(companyId)
      .collection('members')
      .doc(memberUid);

    const allowedUpdates: any = {
      personalName: updates.personalName,
      jobTitle: updates.jobTitle,
      isPrimaryContact: updates.isPrimaryContact,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      }
    });

    await memberRef.update(allowedUpdates);

    return NextResponse.json({
      success: true,
      message: 'Member updated successfully'
    });

  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

// DELETE - Remove member from company
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, userUid, memberUid } = body;

    if (!companyId || !userUid || !memberUid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await initializeAdmin();

    // Verify the user has access to this company and has admin privileges
    const userInCompany = await db
      .collection('accounts')
      .doc(companyId)
      .collection('members')
      .doc(userUid)
      .get();

    if (!userInCompany.exists) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const userData = userInCompany.data();
    if (!userData?.isPrimaryContact) {
      return NextResponse.json(
        { error: 'Only primary contacts can remove members' },
        { status: 403 }
      );
    }

    // Don't allow removing themselves
    if (userUid === memberUid) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the company' },
        { status: 400 }
      );
    }

    // Remove the member
    await db
      .collection('accounts')
      .doc(companyId)
      .collection('members')
      .doc(memberUid)
      .delete();

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}