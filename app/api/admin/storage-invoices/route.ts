import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let admin: any;

const initializeFirebase = async () => {
  if (!admin) {
    admin = await import('firebase-admin');

    if (admin.apps.length === 0) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
      }

      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`
      });
    }
  }

  return admin;
};

export interface StorageInvoice {
  id: string;
  invoiceNumber: string;
  organizationName: string;
  organizationSlug: string;
  url: string;
  uploadedAt: string | null;
  size: number;
}

/**
 * GET: List all invoice PDFs from Firebase Storage
 */
export async function GET() {
  try {
    const admin = await initializeFirebase();
    const bucket = admin.storage().bucket();

    // Get all files with metadata in a single call
    const [files] = await bucket.getFiles({
      prefix: 'invoices/',
      autoPaginate: true
    });

    const invoices: StorageInvoice[] = files
      .filter(file => {
        const parts = file.name.split('/');
        return parts.length >= 3 && parts[2].endsWith('.pdf');
      })
      .map(file => {
        const parts = file.name.split('/');
        const orgSlug = parts[1];
        const invoiceNumber = parts[2].replace('.pdf', '');

        // file.metadata is already populated from getFiles()
        const meta = file.metadata;

        return {
          id: `${orgSlug}/${invoiceNumber}`,
          invoiceNumber,
          organizationName: meta.metadata?.organizationName || orgSlug.replace(/-/g, ' '),
          organizationSlug: orgSlug,
          url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
          uploadedAt: meta.metadata?.uploadedAt || meta.timeCreated || null,
          size: parseInt(meta.size, 10) || 0
        };
      });

    // Sort by upload date, newest first
    invoices.sort((a, b) => {
      if (!a.uploadedAt) return 1;
      if (!b.uploadedAt) return -1;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });

    return NextResponse.json({
      success: true,
      invoices,
      count: invoices.length
    });
  } catch (error: any) {
    console.error('Error listing storage invoices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list invoices' },
      { status: 500 }
    );
  }
}
