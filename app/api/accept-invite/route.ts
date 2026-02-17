import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, FieldValue } from '../../../lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password, inviteData, linkExistingUser } = await request.json();

    // Validate required fields
    if (!email || !inviteData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();
    const db = getAdminDb();

    let userRecord;
    
    if (linkExistingUser) {
      // For existing users, get their user record
      try {
        userRecord = await auth.getUserByEmail(email);
        console.log('Found existing Firebase Auth user:', userRecord.uid);
      } catch (error) {
        return NextResponse.json(
          { error: 'No existing account found with this email address' },
          { status: 404 }
        );
      }
    } else {
      // For new users, create Firebase Auth user
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required for new accounts' },
          { status: 400 }
        );
      }
      
      userRecord = await auth.createUser({
        email: email,
        password: password,
        emailVerified: true // Since they came from an invite
      });

      console.log('Created Firebase Auth user:', userRecord.uid);
    }

    // Update the existing member document with Firebase Auth UID
    const memberRef = db.collection('accounts').doc(inviteData.companyId).collection('members').doc(inviteData.memberId);

    // Check if member document exists
    const memberDoc = await memberRef.get();
    if (!memberDoc.exists) {
      // Only clean up auth user if we created a new one
      if (!linkExistingUser) {
        await auth.deleteUser(userRecord.uid);
      }
      return NextResponse.json(
        { error: 'Member invitation not found or has already been used' },
        { status: 404 }
      );
    }

    // Generate a custom token for immediate login
    const customToken = await auth.createCustomToken(userRecord.uid);

    // Only update the member document after we know everything else succeeded
    await memberRef.update({
      id: userRecord.uid,
      accountConfirmed: true,
      inviteAcceptedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log('Successfully moved member from', inviteData.memberId, 'to', userRecord.uid);

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