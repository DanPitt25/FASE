import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAuthToken, logSecurityEvent, getClientInfo, AuthError } from '../../../lib/auth-security';

export const runtime = 'nodejs';

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
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  return {
    storage: admin.storage()
  };
};

export async function POST(request: NextRequest) {
  const clientInfo = getClientInfo(request);

  try {
    const authResult = await verifyAuthToken(request);
    const userUid = authResult.uid;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sponsorName = formData.get('sponsorName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File must be PNG, JPG, SVG, or WebP format' },
        { status: 400 }
      );
    }

    const { storage } = await initializeAdmin();

    // Create file path - use graphics/logos for consistency with existing sponsors
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `graphics/logos/${fileName}`;

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Firebase Storage - explicitly specify bucket name
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`;
    const bucket = storage.bucket(bucketName);
    const fileRef = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          firebaseStorageDownloadTokens: crypto.randomUUID(),
        },
      },
    });

    // Make the file publicly readable
    await fileRef.makePublic();

    // Log successful upload
    await logSecurityEvent({
      type: 'auth_success',
      userId: userUid,
      email: authResult.email,
      details: { action: 'sponsor_logo_uploaded', fileName, sponsorName, fileSize: file.size },
      severity: 'low',
      ...clientInfo
    });

    // Get metadata to retrieve the download token
    const [metadata] = await fileRef.getMetadata();
    const token = metadata.metadata?.firebaseStorageDownloadTokens;

    // Generate Firebase Storage download URL
    const encodedPath = encodeURIComponent(filePath);
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

    return NextResponse.json({
      success: true,
      downloadURL,
      filePath,
      fileName,
    });
  } catch (error) {
    console.error('Sponsor logo upload error:', error);

    if (error instanceof AuthError) {
      await logSecurityEvent({
        type: 'auth_failure',
        details: { error: error.message, action: 'sponsor_logo_upload' },
        severity: 'medium',
        ...clientInfo
      });

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload sponsor logo' },
      { status: 500 }
    );
  }
}
