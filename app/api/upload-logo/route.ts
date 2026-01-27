import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAuthToken, logSecurityEvent, getClientInfo, AuthError } from '../../../lib/auth-security';
import { DatabaseMonitor } from '../../../lib/monitoring';

// Force Node.js runtime to enable file system access
export const runtime = 'nodejs';

// Initialize Firebase Admin using service account key
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing');
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    // Use explicit bucket name or construct from project ID (new Firebase Storage format)
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket,
    });
  }

  return {
    auth: admin.auth(),
    storage: admin.storage()
  };
};


export async function POST(request: NextRequest) {
  const clientInfo = getClientInfo(request);

  try {
    // Verify authentication first
    const authResult = await verifyAuthToken(request);
    const userUid = authResult.uid;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const identifier = formData.get('identifier') as string;
    const organizationName = formData.get('organizationName') as string;

    // Validate inputs and ensure user can only upload for themselves
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Use the organization identifier if provided, otherwise use user UID
    const safeIdentifier = identifier || userUid;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File must be PNG, JPG, SVG, or WebP format' },
        { status: 400 }
      );
    }

    const { storage } = await initializeAdmin();
    const db = admin.firestore();

    // Create file path - use sanitized organization name if provided, otherwise identifier
    let fileName: string;
    if (organizationName) {
      const sanitizedOrgName = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const fileExtension = file.name.split('.').pop() || 'png';
      fileName = `${sanitizedOrgName}-logo.${fileExtension}`;
    } else {
      const fileExtension = file.name.split('.').pop() || 'png';
      fileName = `${safeIdentifier}-logo.${fileExtension}`;
    }
    const filePath = `graphics/logos/${fileName}`;

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Firebase Storage - explicitly specify bucket name
    const bucketToUse = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`;
    const bucket = storage.bucket(bucketToUse);
    const fileRef = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Make the file publicly readable
    await fileRef.makePublic();

    // Get the download URL
    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Update the organization's logo status in Firestore if identifier provided
    // Logo goes to pending review - not immediately visible in directories
    if (identifier) {
      try {
        await db.collection('accounts').doc(identifier).update({
          'logoStatus.status': 'pending_review',
          'logoStatus.pendingURL': downloadURL,
          'logoStatus.submittedAt': admin.firestore.FieldValue.serverTimestamp(),
          'logoStatus.reviewedAt': null,
          'logoStatus.reviewedBy': null,
          'logoStatus.rejectionReason': null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Logo submitted for review - account ${identifier}`);
      } catch (firestoreError) {
        console.error('Failed to update Firestore with logo status:', firestoreError);
        // Don't fail the request, logo was still uploaded successfully
      }
    }

    // Log successful upload
    await logSecurityEvent({
      type: 'auth_success',
      userId: userUid,
      email: authResult.email,
      details: { action: 'logo_uploaded', fileName, fileSize: file.size },
      severity: 'low',
      ...clientInfo
    });

    await DatabaseMonitor.logDatabaseOperation({
      type: 'write',
      collection: 'storage',
      documentId: filePath,
      userId: userUid
    });

    return NextResponse.json({
      success: true,
      downloadURL,
      filePath,
      fileName,
    });
  } catch (error: any) {
    console.error('Logo upload error:', error);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.substring(0, 500)
    });

    if (error instanceof AuthError) {
      await logSecurityEvent({
        type: 'auth_failure',
        details: { error: error.message, action: 'logo_upload' },
        severity: 'medium',
        ...clientInfo
      });

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: error.statusCode }
      );
    }

    // Return actual error message for debugging
    return NextResponse.json(
      { error: error?.message || 'Failed to upload logo' },
      { status: 500 }
    );
  }
}