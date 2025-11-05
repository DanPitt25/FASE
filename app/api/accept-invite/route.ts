import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
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
    const { email, password, inviteData } = await request.json();

    // Validate required fields
    if (!email || !password || !inviteData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { auth, db } = await initializeAdmin();

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: true // Since they came from an invite
    });

    console.log('Created Firebase Auth user:', userRecord.uid);

    // Update the existing member document with Firebase Auth UID
    const memberRef = db.collection('accounts').doc(inviteData.companyId).collection('members').doc(inviteData.memberId);

    // Check if member document exists
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
      // Clean up the auth user we just created
      await auth.deleteUser(userRecord.uid);
      return NextResponse.json(
        { error: 'Member invitation not found or has already been used' },
        { status: 404 }
      );
    }

    // Update the member document with Firebase Auth UID and confirmation
    await memberRef.update({
      id: userRecord.uid,
      accountConfirmed: true,
      inviteAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Successfully moved member from', inviteData.memberId, 'to', userRecord.uid);

    // Generate a custom token for immediate login
    const customToken = await auth.createCustomToken(userRecord.uid);

    return NextResponse.json({ 
      success: true, 
      customToken: customToken,
      message: 'Account created successfully' 
    });

  } catch (error: any) {
    console.error('Error accepting invite:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}