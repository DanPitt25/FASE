import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { checkRateLimit, logSecurityEvent, getClientInfo, RateLimitError } from '../../../../lib/auth-security';

// Initialize Firebase Admin using service account key
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
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
  const clientInfo = getClientInfo(request);
  
  try {
    const { email, code } = await request.json();
    
    // Rate limiting by IP and email
    await checkRateLimit(`ip:${clientInfo.ip}`, 10, 15 * 60 * 1000); // 10 attempts per IP per 15 min
    await checkRateLimit(`email:${email}`, 5, 15 * 60 * 1000); // 5 attempts per email per 15 min

    // Validate inputs
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Verification code must be 6 digits' },
        { status: 400 }
      );
    }

    const { auth, db } = await initializeAdmin();

    // Get verification code from Firestore
    const doc = await db.collection('verification_codes').doc(email).get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { error: 'No verification code found' },
        { status: 400 }
      );
    }

    const data = doc.data();
    
    if (!data) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }
    
    // Check if code matches
    if (data.code !== code) {
      await logSecurityEvent({
        type: 'auth_failure',
        email,
        details: { reason: 'invalid_code', submittedCode: code },
        severity: 'medium',
        ...clientInfo
      });
      
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check if expired
    if (data.expiresAt.toDate() < new Date()) {
      await logSecurityEvent({
        type: 'auth_failure',
        email,
        details: { reason: 'expired_code' },
        severity: 'low',
        ...clientInfo
      });
      
      return NextResponse.json(
        { error: 'Verification code expired' },
        { status: 400 }
      );
    }

    // Check if already used
    if (data.used) {
      return NextResponse.json(
        { error: 'Code already used' },
        { status: 400 }
      );
    }

    // Mark as used (delete the document)
    await db.collection('verification_codes').doc(email).delete();
    
    // Log successful verification
    await logSecurityEvent({
      type: 'auth_success',
      email,
      details: { action: 'email_verification' },
      severity: 'low',
      ...clientInfo
    });

    // Don't update any user accounts here - accounts don't exist yet
    // Account creation happens after payment/invoice selection
    // This just verifies the email code is valid

    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      await logSecurityEvent({
        type: 'rate_limit',
        email: (await request.json().catch(() => ({})))?.email,
        details: { message: error.message },
        severity: 'high',
        ...clientInfo
      });
      
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }
    
    console.error('Verify code error:', error);
    await logSecurityEvent({
      type: 'auth_failure',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      severity: 'medium',
      ...clientInfo
    });
    
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}