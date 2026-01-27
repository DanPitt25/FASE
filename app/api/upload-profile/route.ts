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
    storage: admin.storage(),
    firestore: admin.firestore()
  };
};

export async function POST(request: NextRequest) {
  const clientInfo = getClientInfo(request);
  
  try {
    // Verify authentication first
    const authResult = await verifyAuthToken(request);
    const userUid = authResult.uid;
    
    const formData = await request.formData();
    const logoFile = formData.get('logo') as File | null;
    const bio = formData.get('bio') as string | null;
    const usageConsent = formData.get('usageConsent') as string;
    const organizationName = formData.get('organizationName') as string;
    const contactEmail = formData.get('contactEmail') as string;

    // Validate that at least one of logo or bio is provided
    if (!logoFile && !bio) {
      return NextResponse.json(
        { error: 'Either logo or bio is required' },
        { status: 400 }
      );
    }

    // Validate usage consent
    if (usageConsent !== 'true') {
      return NextResponse.json(
        { error: 'Usage consent is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!organizationName || !contactEmail) {
      return NextResponse.json(
        { error: 'Organization name and contact email are required' },
        { status: 400 }
      );
    }

    const { storage, firestore } = await initializeAdmin();
    let logoDownloadURL = null;

    // Handle logo upload if provided
    if (logoFile) {
      // Validate file
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (logoFile.size > maxSize) {
        return NextResponse.json(
          { error: 'Logo file size must be less than 5MB' },
          { status: 400 }
        );
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
      if (!allowedTypes.includes(logoFile.type)) {
        return NextResponse.json(
          { error: 'Logo must be PNG, JPG, SVG, or WebP format' },
          { status: 400 }
        );
      }

      // Create file path using authenticated user ID
      const fileExtension = logoFile.name.split('.').pop() || 'png';
      const fileName = `${userUid}-logo.${fileExtension}`;
      const filePath = `graphics/logos/${fileName}`;

      // Convert File to Buffer
      const buffer = Buffer.from(await logoFile.arrayBuffer());

      // Upload to Firebase Storage - explicitly specify bucket name
      const bucketToUse = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`;
      const bucket = storage.bucket(bucketToUse);
      const fileRef = bucket.file(filePath);

      await fileRef.save(buffer, {
        metadata: {
          contentType: logoFile.type,
        },
      });

      // Make the file publicly readable
      await fileRef.makePublic();
      logoDownloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    }

    // Store profile data in Firestore
    const profileData = {
      userId: userUid,
      organizationName,
      contactEmail,
      bio: bio || null,
      logoURL: logoDownloadURL,
      usageConsent: true,
      consentTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save to Firestore
    await firestore.collection('memberProfiles').doc(userUid).set(profileData, { merge: true });

    // Send email notification to admin
    try {
      await sendAdminNotification({
        organizationName,
        contactEmail,
        bio,
        logoURL: logoDownloadURL,
        uploadedBy: authResult.email || contactEmail
      });
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Don't fail the entire request if email fails
    }
    
    // Log successful upload
    await logSecurityEvent({
      type: 'auth_success',
      userId: userUid,
      email: authResult.email,
      details: { 
        action: 'profile_uploaded', 
        hasLogo: !!logoFile,
        hasBio: !!bio,
        logoSize: logoFile?.size || 0
      },
      severity: 'low',
      ...clientInfo
    });
    
    await DatabaseMonitor.logDatabaseOperation({
      type: 'write',
      collection: 'memberProfiles',
      documentId: userUid,
      userId: userUid
    });

    return NextResponse.json({
      success: true,
      logoURL: logoDownloadURL,
      bio: bio,
      message: 'Profile uploaded successfully'
    });
  } catch (error: any) {
    console.error('Profile upload error:', error);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.substring(0, 500)
    });

    if (error instanceof AuthError) {
      await logSecurityEvent({
        type: 'auth_failure',
        details: { error: error.message, action: 'profile_upload' },
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
      { error: error?.message || 'Failed to upload profile' },
      { status: 500 }
    );
  }
}

// Function to send admin notification email
async function sendAdminNotification(data: {
  organizationName: string;
  contactEmail: string;
  bio: string | null;
  logoURL: string | null;
  uploadedBy: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY environment variable is not configured');
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2D5574;">New Member Profile Submission</h2>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px 0; color: #2D5574;">Organization Details</h3>
        <p><strong>Organization:</strong> ${data.organizationName}</p>
        <p><strong>Contact Email:</strong> ${data.contactEmail}</p>
        <p><strong>Uploaded by:</strong> ${data.uploadedBy}</p>
        <p><strong>Upload Time:</strong> ${new Date().toISOString()}</p>
      </div>

      ${data.bio ? `
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #2D5574;">Company Bio</h3>
          <div style="white-space: pre-wrap; line-height: 1.5;">${data.bio}</div>
        </div>
      ` : ''}

      ${data.logoURL ? `
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #2D5574;">Company Logo</h3>
          <p><a href="${data.logoURL}" target="_blank" style="color: #2D5574;">View Logo</a></p>
          <img src="${data.logoURL}" alt="Company Logo" style="max-width: 200px; max-height: 100px; display: block; margin-top: 10px;">
        </div>
      ` : ''}

      <div style="background-color: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #0066cc;">
          <strong>Usage Consent:</strong> The member has provided consent for FASE to use their logo in the member directory and other public materials, as well as to edit, translate, and publish their bio.
        </p>
      </div>

      <p style="color: #666; font-size: 14px;">
        This submission requires review and approval for inclusion in the FASE member directory.
      </p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FASE Member Portal <admin@fasemga.com>',
      to: ['admin@fasemga.com'],
      subject: `New Member Profile Submission - ${data.organizationName}`,
      html: emailContent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}