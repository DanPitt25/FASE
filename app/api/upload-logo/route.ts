import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAuthToken, logSecurityEvent, getClientInfo, AuthError } from '../../../lib/auth-security';
import { DatabaseMonitor } from '../../../lib/monitoring';
import { getGCPCredentials } from '../../../lib/gcp-credentials';

// Initialize Firebase Admin using GCP credentials
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    const gcpCredentials = getGCPCredentials();
    
    admin.initializeApp({
      credential: gcpCredentials.credentials 
        ? admin.credential.cert(gcpCredentials.credentials)
        : admin.credential.applicationDefault(),
      projectId: gcpCredentials.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: `${gcpCredentials.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
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

    // Validate inputs and ensure user can only upload for themselves
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }
    
    // Use authenticated user's UID as identifier for security
    const safeIdentifier = userUid;

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

    // Create file path using authenticated user ID
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `${safeIdentifier}-logo.${fileExtension}`;
    const filePath = `graphics/logos/${fileName}`;

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Firebase Storage
    const bucket = storage.bucket();
    const fileRef = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Make the file publicly readable
    await fileRef.makePublic();
    
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

    // Get the download URL
    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return NextResponse.json({
      success: true,
      downloadURL,
      filePath,
      fileName,
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    
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
    
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}