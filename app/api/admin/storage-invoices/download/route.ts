import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '../../../../../lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '../../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET: Get a signed download URL for a specific invoice
 *
 * Query params:
 * - path: Full path to the invoice (e.g., invoices/company-name/FASE-12345.pdf)
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Validate path starts with invoices/
    if (!filePath.startsWith('invoices/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Generate a signed URL valid for 1 hour
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    return NextResponse.json({
      success: true,
      url: signedUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Error getting invoice download URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get download URL' },
      { status: 500 }
    );
  }
}
