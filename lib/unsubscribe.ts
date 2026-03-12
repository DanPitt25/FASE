import crypto from 'crypto';

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || 'fase-unsubscribe-default-secret';

/**
 * Generate an unsubscribe token for an email address
 */
export function generateUnsubscribeToken(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  const hmac = crypto.createHmac('sha256', UNSUBSCRIBE_SECRET);
  hmac.update(normalizedEmail);
  return hmac.digest('hex').substring(0, 32); // First 32 chars is enough
}

/**
 * Validate an unsubscribe token
 */
export function validateUnsubscribeToken(email: string, token: string): boolean {
  const expectedToken = generateUnsubscribeToken(email);
  return token === expectedToken;
}

/**
 * Generate the full unsubscribe URL for an email
 */
export function generateUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email);
  const encodedEmail = encodeURIComponent(email.toLowerCase().trim());
  return `https://fasemga.com/unsubscribe?email=${encodedEmail}&token=${token}`;
}
