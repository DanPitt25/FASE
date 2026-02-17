import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb, FieldValue } from './firebase-admin';

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((value, key) => {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}, 60 * 60 * 1000);

export interface AuthResult {
  uid: string;
  email: string | undefined;
  role?: string;
  isAdmin?: boolean;
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Enhanced authentication with token validation
export async function verifyAuthToken(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  const auth = getAdminAuth();
  const db = getAdminDb();
  
  try {
    // Verify the ID token and check expiration
    const decodedToken = await auth.verifyIdToken(token, true); // checkRevoked = true
    
    // Get user role from custom claims or database
    let role = decodedToken.role;
    let isAdmin = decodedToken.admin === true;
    
    // If not in token, check database
    if (!role) {
      try {
        const userDoc = await db.collection('accounts').doc(decodedToken.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          role = userData?.role || 'member';
          isAdmin = userData?.isAdmin === true;
        }
      } catch (error) {
        console.warn('Could not fetch user role from database:', error);
        role = 'member'; // default role
      }
    }
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      isAdmin
    };
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      throw new AuthError('Token expired', 401);
    } else if (error.code === 'auth/id-token-revoked') {
      throw new AuthError('Token revoked', 401);
    } else {
      throw new AuthError('Invalid token', 401);
    }
  }
}

// Rate limiting for sign-in attempts
export async function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): Promise<void> {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  
  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset window
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (current.count >= maxAttempts) {
    throw new RateLimitError(`Too many attempts. Try again in ${Math.ceil((current.resetTime - now) / 60000)} minutes`);
  }
  
  current.count++;
  rateLimitMap.set(key, current);
}

// Log security events
export async function logSecurityEvent(event: {
  type: 'auth_success' | 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'admin_action';
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}) {
  const db = getAdminDb();

  try {
    await db.collection('security_logs').add({
      ...event,
      timestamp: FieldValue.serverTimestamp(),
      severity: event.severity || 'medium'
    });
    
    // Console log for immediate visibility
    console.log(`[SECURITY] ${event.type.toUpperCase()}:`, {
      userId: event.userId,
      email: event.email,
      details: event.details
    });
    
    // For critical events, you could trigger immediate alerts here
    if (event.severity === 'critical') {
      console.error(`[CRITICAL SECURITY EVENT] ${event.type}:`, event);
      // TODO: Integrate with alerting system (email, Slack, etc.)
    }
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Check if user has required role
export function requireRole(userRole: string | undefined, requiredRole: string | string[]): boolean {
  if (!userRole) return false;
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(userRole) || userRole === 'admin';
}

// Extract client info for logging
export function getClientInfo(request: NextRequest) {
  return {
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  };
}