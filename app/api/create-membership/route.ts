import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin using same approach as stripe webhook
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
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

export async function POST(request: NextRequest) {
  try {
    const membershipData = await request.json();
    console.log('Membership data received:', JSON.stringify(membershipData, null, 2));
    
    const { auth, db } = await initializeAdmin();

    // Validate required fields
    if (!membershipData.userUid || !membershipData.membershipType) {
      return NextResponse.json(
        { error: 'User UID and membership type are required' },
        { status: 400 }
      );
    }

    const { 
      userUid,
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

    return NextResponse.json({
      success: true,
      message: 'Membership application created successfully'
    });
  } catch (error) {
    console.error('Create membership error:', error);
    return NextResponse.json(
      { error: 'Failed to create membership application' },
      { status: 500 }
    );
  }
}