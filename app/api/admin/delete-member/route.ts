import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { accountId, confirmationPhrase } = await request.json();

    // Safety check - require explicit confirmation phrase
    if (confirmationPhrase !== 'DELETE') {
      return NextResponse.json(
        { error: 'Invalid confirmation phrase. Type "DELETE" to confirm.' },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const auth = getAdminAuth();

    // Get the account document first to gather info
    const accountDoc = await db.collection('accounts').doc(accountId).get();

    if (!accountDoc.exists) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const accountData = accountDoc.data();
    const deletedInfo = {
      organizationName: accountData?.organizationName || 'Unknown',
      email: accountData?.email || 'Unknown',
      membersDeleted: 0,
      authUsersDeleted: 0
    };

    // Get all members in the subcollection
    const membersSnapshot = await db.collection('accounts').doc(accountId).collection('members').get();

    // Delete each member's Auth account (if exists) and their member document
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      const memberId = memberDoc.id;

      // Try to delete the Firebase Auth user
      // Only attempt if the ID looks like a Firebase Auth UID (not a member_ prefixed ID)
      if (!memberId.startsWith('member_')) {
        try {
          await auth.deleteUser(memberId);
          deletedInfo.authUsersDeleted++;
          console.log(`Deleted Auth user: ${memberId}`);
        } catch (authError: any) {
          // User might not exist in Auth, that's okay
          if (authError.code !== 'auth/user-not-found') {
            console.error(`Failed to delete Auth user ${memberId}:`, authError.message);
          }
        }
      }

      // Delete the member document
      await memberDoc.ref.delete();
      deletedInfo.membersDeleted++;
      console.log(`Deleted member document: ${memberId}`);
    }

    // Delete any join_requests subcollection
    const joinRequestsSnapshot = await db.collection('accounts').doc(accountId).collection('join_requests').get();
    for (const requestDoc of joinRequestsSnapshot.docs) {
      await requestDoc.ref.delete();
    }

    // Finally, delete the account document itself
    await db.collection('accounts').doc(accountId).delete();
    console.log(`Deleted account document: ${accountId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedInfo.organizationName}`,
      details: deletedInfo
    });

  } catch (error: any) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete member' },
      { status: 500 }
    );
  }
}
