import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin using same approach as stripe webhook
const initializeAdmin = async () => {
  if (admin.apps.length === 0) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('Firebase credentials not configured');
    }

    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    admin.initializeApp({
      credential: serviceAccount 
        ? admin.credential.cert(serviceAccount)
        : admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
    });
  }
  
  return {
    storage: admin.storage()
  };
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const identifier = formData.get('identifier') as string;

    // Validate inputs
    if (!file || !identifier) {
      return NextResponse.json(
        { error: 'File and identifier are required' },
        { status: 400 }
      );
    }

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

    // Create file path
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `${identifier}-logo.${fileExtension}`;
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
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}