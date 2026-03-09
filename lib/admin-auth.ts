import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './firebase-admin';

export interface AdminAuthResult {
  userId: string;
  isAdmin: true;
}

export interface AdminAuthError {
  error: string;
  status: number;
}

/**
 * Verifies that a request is from an authenticated admin user.
 *
 * Admin status is determined by the organization account's status field.
 * If an organization has status: 'admin', all members of that organization
 * are considered admins.
 *
 * Data structure:
 * - accounts/{accountId} - Organization document with `status` field
 * - accounts/{accountId}/members/{memberId} - Individual members with `id` = Firebase Auth UID
 */
export async function verifyAdminAccess(
  request: NextRequest
): Promise<AdminAuthResult | AdminAuthError> {
  // 1. Extract Bearer token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized - No token provided', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // 2. Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // 3. Check if user's account has admin status
    // First: Direct lookup - check if accounts/{uid} exists and is admin
    const accountDoc = await adminDb.collection('accounts').doc(uid).get();
    if (accountDoc.exists) {
      const accountData = accountDoc.data();
      if (accountData?.status === 'admin') {
        return { userId: uid, isAdmin: true };
      }
    }

    // Second: Search members subcollections for this uid
    // This handles team members who are not primary contacts
    const accountsSnapshot = await adminDb.collection('accounts').get();

    for (const orgDoc of accountsSnapshot.docs) {
      const orgData = orgDoc.data();

      // Only check admin organizations to avoid unnecessary subcollection queries
      if (orgData?.status !== 'admin') {
        continue;
      }

      const membersSnapshot = await adminDb
        .collection('accounts')
        .doc(orgDoc.id)
        .collection('members')
        .where('id', '==', uid)
        .get();

      if (!membersSnapshot.empty) {
        return { userId: uid, isAdmin: true };
      }
    }

    // User is authenticated but not an admin
    return { error: 'Admin access required', status: 403 };
  } catch (error) {
    console.error('Auth verification error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

/**
 * Helper to check if an auth result is an error
 */
export function isAuthError(
  result: AdminAuthResult | AdminAuthError
): result is AdminAuthError {
  return 'error' in result;
}
