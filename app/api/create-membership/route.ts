import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, FieldValue } from '../../../lib/firebase-admin';
import { verifyAuthToken, logSecurityEvent, getClientInfo, AuthError } from '../../../lib/auth-security';


export async function POST(request: NextRequest) {
  const clientInfo = getClientInfo(request);
  
  try {
    // Verify authentication first
    const authResult = await verifyAuthToken(request);
    const userUid = authResult.uid;
    
    const membershipData = await request.json();
    console.log('Membership data received:', JSON.stringify(membershipData, null, 2));
    
    const db = getAdminDb();

    // Use authenticated user's UID, not from request body
    membershipData.userUid = userUid;

    const { 
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
      personalName,
      primaryContact,
      registeredAddress,
      hasOtherAssociations: hasOtherAssociations ?? false,
      otherAssociations: hasOtherAssociations ? otherAssociations : [],
      logoUrl: logoUrl || null,
      updatedAt: FieldValue.serverTimestamp()
    };

    // All memberships are corporate
    updateData.organizationName = organizationName;
    updateData.organizationType = organizationType;
    
    // Add portfolio for MGAs
    if (organizationType === 'MGA' && portfolio) {
      updateData.portfolio = portfolio;
    }

    // Update the existing account document
    await db.collection('accounts').doc(userUid).update(updateData);
    
    // Log membership creation
    await logSecurityEvent({
      type: 'auth_success',
      userId: userUid,
      email: authResult.email,
      details: { action: 'membership_created', organizationType },
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