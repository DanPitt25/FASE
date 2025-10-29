import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAuthToken, logSecurityEvent, getClientInfo, AuthError } from '../../../lib/auth-security';

// Initialize Firebase Admin using Application Default Credentials
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  
  return {
    auth: admin.auth(),
    db: admin.firestore()
  };
};


export async function POST(request: NextRequest) {
  const clientInfo = getClientInfo(request);
  
  try {
    // Verify authentication first
    const authResult = await verifyAuthToken(request);
    const userUid = authResult.uid;
    
    const membershipData = await request.json();
    console.log('Membership data received:', JSON.stringify(membershipData, null, 2));
    
    const { auth, db } = await initializeAdmin();

    // Validate required fields and ensure user can only create membership for themselves
    if (!membershipData.membershipType) {
      return NextResponse.json(
        { error: 'Membership type is required' },
        { status: 400 }
      );
    }
    
    // Use authenticated user's UID, not from request body
    membershipData.userUid = userUid;

    const { 
      membershipType,
      personalName,
      organizationName,
      organizationType,
      primaryContact,
      registeredAddress,
      portfolio,
      hasOtherAssociations,
      otherAssociations,
      logoUrl
    } = membershipData;

    // Simply update the existing account document with membership information
    const updateData: any = {
      status: 'pending_payment',
      membershipType,
      personalName,
      primaryContact,
      registeredAddress,
      hasOtherAssociations: hasOtherAssociations ?? false,
      otherAssociations: hasOtherAssociations ? otherAssociations : [],
      logoUrl: logoUrl || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (membershipType === 'individual') {
      updateData.organizationName = personalName;
    } else {
      updateData.organizationName = organizationName;
      updateData.organizationType = organizationType;
      
      // Add portfolio for MGAs
      if (organizationType === 'MGA' && portfolio) {
        updateData.portfolio = portfolio;
      }
    }

    // Update the existing account document
    await db.collection('accounts').doc(userUid).update(updateData);
    
    // Log membership creation
    await logSecurityEvent({
      type: 'auth_success',
      userId: userUid,
      email: authResult.email,
      details: { action: 'membership_created', membershipType },
      severity: 'low',
      ...clientInfo
    });

    return NextResponse.json({
      success: true,
      message: 'Membership application created successfully'
    });
  } catch (error) {
    console.error('Create membership error:', error);
    
    if (error instanceof AuthError) {
      await logSecurityEvent({
        type: 'auth_failure',
        details: { error: error.message, action: 'membership_creation' },
        severity: 'medium',
        ...clientInfo
      });
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create membership application' },
      { status: 500 }
    );
  }
}