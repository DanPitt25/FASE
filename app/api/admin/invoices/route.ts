import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET: Get all invoices with optional filters
 * Query params: ?status=unpaid|paid|all&limit=100
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let query: FirebaseFirestore.Query = adminDb.collection('invoices');

    // Apply status filter
    if (status === 'unpaid') {
      query = query.where('status', '!=', 'paid');
    } else if (status === 'paid') {
      query = query.where('status', '==', 'paid');
    }

    // Order by sentAt descending and limit
    query = query.orderBy('sentAt', 'desc').limit(limit);

    const snapshot = await query.get();

    const invoices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        invoiceNumber: data.invoiceNumber,
        organizationName: data.organizationName,
        amount: data.amount || data.totalAmount,
        currency: data.currency || 'EUR',
        status: data.status,
        type: data.type,
        accountId: data.accountId,
        sentAt: data.sentAt?.toDate?.()?.toISOString() || null,
        paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
        paymentMethod: data.paymentMethod,
        pdfUrl: data.pdfUrl,
        paidPdfUrl: data.paidPdfUrl,
      };
    });

    return NextResponse.json({
      success: true,
      invoices,
      count: invoices.length,
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
