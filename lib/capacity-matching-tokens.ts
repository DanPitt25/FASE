import { adminDb, FieldValue } from './firebase-admin';
import crypto from 'crypto';

const COLLECTION = 'capacity-matching-tokens';
const TOKEN_EXPIRY_HOURS = 48;

export interface CapacityMatchingToken {
  id: string;
  token: string;
  companyName: string;
  contactEmail: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  used: boolean;
  usedAt?: FirebaseFirestore.Timestamp;
  submissionId?: string;
  createdBy: 'admin' | 'self-request';
  adminUserId?: string;
}

/**
 * Generates a cryptographically random 32-character hex string
 */
export function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Creates a magic link token and stores it in Firestore
 */
export async function createMagicLink(
  companyName: string,
  contactEmail: string,
  createdBy: 'admin' | 'self-request',
  adminUserId?: string
): Promise<{ token: string; url: string; expiresAt: Date }> {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  const tokenDoc: Omit<CapacityMatchingToken, 'id'> = {
    token,
    companyName,
    contactEmail: contactEmail.toLowerCase().trim(),
    createdAt: FieldValue.serverTimestamp() as any,
    expiresAt: adminDb.Timestamp ? adminDb.Timestamp.fromDate(expiresAt) : expiresAt as any,
    used: false,
    createdBy,
    ...(adminUserId && { adminUserId }),
  };

  // Use auto-generated ID to prevent enumeration
  await adminDb.collection(COLLECTION).add(tokenDoc);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com';
  const url = `${baseUrl}/capacity-matching?token=${token}&email=${encodeURIComponent(contactEmail.toLowerCase().trim())}`;

  return { token, url, expiresAt };
}

/**
 * Validates a token and returns the token data if valid
 */
export async function validateToken(
  token: string,
  email: string
): Promise<{ valid: true; data: CapacityMatchingToken } | { valid: false; error: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('token', '==', token)
    .where('contactEmail', '==', normalizedEmail)
    .where('used', '==', false)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { valid: false, error: 'Invalid or expired link' };
  }

  const doc = snapshot.docs[0];
  const data = { id: doc.id, ...doc.data() } as CapacityMatchingToken;

  // Check expiration
  const expiresAt = data.expiresAt?.toDate?.() || new Date(0);
  if (expiresAt < new Date()) {
    return { valid: false, error: 'This link has expired' };
  }

  return { valid: true, data };
}

/**
 * Marks a token as used after successful submission
 */
export async function markTokenUsed(token: string, submissionId: string): Promise<void> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('token', '==', token)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    await snapshot.docs[0].ref.update({
      used: true,
      usedAt: FieldValue.serverTimestamp(),
      submissionId,
    });
  }
}

/**
 * Checks rate limiting for self-service requests
 * Returns true if the request should be allowed
 */
export async function checkRateLimit(email: string, maxRequests = 3, windowHours = 24): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('contactEmail', '==', normalizedEmail)
    .where('createdBy', '==', 'self-request')
    .get();

  // Count requests within the time window
  const recentRequests = snapshot.docs.filter(doc => {
    const createdAt = doc.data().createdAt?.toDate?.();
    return createdAt && createdAt > windowStart;
  });

  return recentRequests.length < maxRequests;
}

/**
 * Gets all tokens for admin view (with pagination)
 */
export async function getAllTokens(limit = 50): Promise<CapacityMatchingToken[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    expiresAt: doc.data().expiresAt?.toDate?.()?.toISOString() || null,
    usedAt: doc.data().usedAt?.toDate?.()?.toISOString() || null,
  })) as any;
}
