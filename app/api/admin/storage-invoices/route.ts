import { NextRequest, NextResponse } from 'next/server';
import { adminStorage } from '../../../../lib/firebase-admin';
import { verifyAdminAccess, isAuthError } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

interface StoredInvoice {
  name: string;
  path: string;
  company: string;
  invoiceNumber: string;
  size: number;
  updated: string;
}

/**
 * GET: List all invoices stored in Firebase Storage
 *
 * Structure: invoices/{company-slug}/{invoiceNumber}.pdf
 *
 * Query params:
 * - company: Filter by company slug (optional)
 * - prefix: Filter by invoice number prefix (optional)
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const companyFilter = searchParams.get('company');
    const prefixFilter = searchParams.get('prefix');

    const bucket = adminStorage.bucket();

    // List all files in the invoices folder
    const [files] = await bucket.getFiles({
      prefix: companyFilter ? `invoices/${companyFilter}/` : 'invoices/',
    });

    const invoices: StoredInvoice[] = [];

    for (const file of files) {
      // Skip folder placeholders
      if (file.name.endsWith('/')) continue;

      // Only include PDF files
      if (!file.name.toLowerCase().endsWith('.pdf')) continue;

      // Parse path: invoices/{company}/{invoiceNumber}.pdf
      const parts = file.name.split('/');
      if (parts.length !== 3) continue;

      const company = parts[1];
      const filename = parts[2];
      const invoiceNumber = filename.replace('.pdf', '');

      // Apply prefix filter if specified
      if (prefixFilter && !invoiceNumber.toLowerCase().includes(prefixFilter.toLowerCase())) {
        continue;
      }

      const [metadata] = await file.getMetadata();

      invoices.push({
        name: filename,
        path: file.name,
        company,
        invoiceNumber,
        size: parseInt(metadata.size as string) || 0,
        updated: metadata.updated || '',
      });
    }

    // Sort by updated date descending (newest first)
    invoices.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());

    // Get unique companies for filtering
    const companies = [...new Set(invoices.map(inv => inv.company))].sort();

    return NextResponse.json({
      success: true,
      invoices,
      companies,
      count: invoices.length,
    });
  } catch (error: any) {
    console.error('Error listing storage invoices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list invoices' },
      { status: 500 }
    );
  }
}
