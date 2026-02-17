import { NextRequest, NextResponse } from 'next/server';
import { getWiseClient, matchTransactionToInvoice } from '../../../../lib/wise-api';

export const dynamic = 'force-dynamic';

let admin: any;
let db: FirebaseFirestore.Firestore;

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
      });
    }

    db = admin.firestore();
  }

  return { admin, db };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const matchInvoices = searchParams.get('match_invoices') === 'true';

    const wiseClient = getWiseClient();

    // Get incoming payments
    const transactions = await wiseClient.getIncomingPayments({
      currency: currency || undefined,
      from: from || undefined,
      to: to || undefined,
    });

    // If matching is requested, get unpaid invoices from Firestore
    let invoiceMatches: Record<string, string> = {};
    if (matchInvoices) {
      const { db } = await initializeFirebase();

      const unpaidInvoices = await db
        .collection('invoices')
        .where('status', '!=', 'paid')
        .get();

      const invoiceNumbers = unpaidInvoices.docs.map((doc) => doc.data().invoiceNumber);

      // Match each transaction
      for (const transaction of transactions) {
        const matchedInvoice = matchTransactionToInvoice(transaction, invoiceNumbers);
        if (matchedInvoice) {
          invoiceMatches[transaction.referenceNumber] = matchedInvoice;
        }
      }
    }

    // Format transactions for response
    const formattedTransactions = transactions.map((t) => ({
      referenceNumber: t.referenceNumber,
      date: t.date,
      amount: t.amount.value,
      currency: t.amount.currency,
      senderName: t.details.senderName,
      paymentReference: t.details.paymentReference,
      description: t.details.description,
      runningBalance: t.runningBalance.value,
      fees: t.totalFees.value,
      matchedInvoice: invoiceMatches[t.referenceNumber] || null,
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      count: formattedTransactions.length,
      matchedCount: Object.keys(invoiceMatches).length,
    });
  } catch (error: any) {
    console.error('Error fetching Wise transfers:', error);

    if (error.message?.includes('environment variable')) {
      return NextResponse.json(
        {
          error: 'Wise API not configured',
          details: error.message,
          configured: false,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}
