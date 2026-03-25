import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '../../../lib/firebase-admin';
import { verifyAuthToken, logSecurityEvent, getClientInfo, AuthError } from '../../../lib/auth-security';
import sharp from 'sharp';

export const runtime = 'nodejs';

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

    // Convert File to Buffer
    const originalBuffer = Buffer.from(await file.arrayBuffer());

    // Process image to trim whitespace (skip SVG as Sharp doesn't support it well)
    let processedBuffer: Buffer;
    let outputType = file.type;

    if (file.type === 'image/svg+xml') {
      // SVGs can't be processed with Sharp, use as-is
      processedBuffer = originalBuffer;
    } else {
      try {
        // Step 1: Trim whitespace/transparent borders
        let sharpInstance = sharp(originalBuffer).trim({
          threshold: 10,
        });

        // Step 2: Get dimensions after trim
        const trimmedBuffer = await sharpInstance.toBuffer();
        const metadata = await sharp(trimmedBuffer).metadata();
        const currentHeight = metadata.height || 0;

        // Step 3: Scale up if too small (minimum 180px height for good quality at 90px display)
        const minHeight = 180;
        if (currentHeight > 0 && currentHeight < minHeight) {
          const scale = minHeight / currentHeight;
          processedBuffer = await sharp(trimmedBuffer)
            .resize({
              height: minHeight,
              width: Math.round((metadata.width || 100) * scale),
              fit: 'fill',
            })
            .png()
            .toBuffer();
        } else {
          processedBuffer = await sharp(trimmedBuffer).png().toBuffer();
        }

        outputType = 'image/png';
      } catch (trimError) {
        // If processing fails, use original
        console.warn('Image processing failed, using original:', trimError);
        processedBuffer = originalBuffer;
      }
    }

    // Create file path - use graphics/logos for consistency with existing sponsors
    const extension = outputType === 'image/svg+xml' ? 'svg' : 'png';
    const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove original extension
    const fileName = `${Date.now()}_${baseName}.${extension}`;
    const filePath = `graphics/logos/${fileName}`;

    // Upload to Firebase Storage - explicitly specify bucket name
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`;
    const bucket = adminStorage.bucket(bucketName);
    const fileRef = bucket.file(filePath);

    await fileRef.save(processedBuffer, {
      metadata: {
        contentType: outputType,
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
