import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '../../../lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const auth = getAdminAuth();
    const db = getAdminDb();

    // Delete user from Firebase Auth
    try {
      await auth.deleteUser(userId);
    } catch (authError) {
      console.log('User auth record may not exist:', authError);
    }

    // Delete account document from Firestore
    try {
      await db.collection('accounts').doc(userId).delete();
    } catch (accountError) {
      console.log('Account document may not exist:', accountError);
    }

    // Delete draft application if it exists
    try {
      await db.collection('draft_applications').doc(userId).delete();
    } catch (draftError) {
      console.log('Draft application may not exist:', draftError);
    }

    return NextResponse.json({
      success: true,
      message: 'Account cleanup completed'
    });

  } catch (error: any) {
    console.error('Account cleanup error:', error);
    
    return NextResponse.json(
      { error: 'Failed to cleanup account' },
      { status: 500 }
    );
  }
}