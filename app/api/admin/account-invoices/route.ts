import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET: Get invoices for a specific account
 */
export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb();

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get account to find organization name
    const accountDoc = await db.collection('accounts').doc(accountId).get();
    if (!accountDoc.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const accountData = accountDoc.data();
    const organizationName = accountData?.organizationName;

    // Search invoices by accountId first
    let invoicesSnapshot = await db
      .collection('invoices')
      .where('accountId', '==', accountId)
      .orderBy('sentAt', 'desc')
      .get();

    // If no results and we have an organization name, try matching by that
    if (invoicesSnapshot.empty && organizationName) {
      invoicesSnapshot = await db
        .collection('invoices')
        .where('organizationName', '==', organizationName)
        .orderBy('sentAt', 'desc')
        .get();
    }

    const invoices = invoicesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        type: data.type,
        sentAt: data.sentAt?.toDate?.()?.toISOString() || null,
        paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
        paymentMethod: data.paymentMethod,
        pdfUrl: data.pdfUrl,
      };
    });

    return NextResponse.json({
      success: true,
      invoices,
      count: invoices.length,
    });
  } catch (error: any) {
    console.error('Error fetching account invoices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
