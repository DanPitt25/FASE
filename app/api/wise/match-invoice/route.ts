import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue, Timestamp } from '../../../../lib/firebase-admin';
import { logPaymentReceived, logInvoicePaid } from '../../../../lib/activity-logger';

export const dynamic = 'force-dynamic';

/**
 * POST: Match a Wise transfer to an invoice
 * Body: { invoiceId, wiseReference, amount, currency, senderName, transactionDate }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, wiseReference, amount, currency, senderName, transactionDate } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Get the invoice
    const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoiceData = invoiceDoc.data();

    if (invoiceData?.status === 'paid') {
      return NextResponse.json(
        { error: 'Invoice is already marked as paid' },
        { status: 400 }
      );
    }

    // Update the invoice
    await invoiceRef.update({
      status: 'paid',
      paymentMethod: 'wise',
      wiseReference: wiseReference || null,
      paidAt: transactionDate
        ? Timestamp.fromDate(new Date(transactionDate))
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Log activity if we have an account ID
    if (invoiceData?.accountId) {
      await logPaymentReceived(
        invoiceData.accountId,
        amount || invoiceData.amount,
        currency || invoiceData.currency,
        'wise',
        invoiceId
      );

      await logInvoicePaid(
        invoiceData.accountId,
        invoiceData.invoiceNumber,
        amount || invoiceData.amount,
        currency || invoiceData.currency,
        invoiceId,
        'Wise Transfer'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice matched and marked as paid',
      invoice: {
        id: invoiceId,
        invoiceNumber: invoiceData?.invoiceNumber,
        status: 'paid',
        paymentMethod: 'wise',
        wiseReference,
      },
    });
  } catch (error: any) {
    console.error('Error matching Wise transfer to invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to match transfer' },
      { status: 500 }
    );
  }
}

/**
 * GET: Auto-match all unmatched transfers to invoices
 */
export async function GET(request: NextRequest) {
  try {
    // Get all unpaid invoices
    const unpaidInvoices = await adminDb
      .collection('invoices')
      .where('status', '!=', 'paid')
      .get();

    const invoiceMap = new Map<string, any>();
    unpaidInvoices.docs.forEach((doc) => {
      const data = doc.data();
      invoiceMap.set(data.invoiceNumber?.toUpperCase(), {
        id: doc.id,
        ...data,
      });
    });

    // Get Wise transactions
    const { getWiseClient } = await import('../../../../lib/wise-api');
    const wiseClient = getWiseClient();
    const wiseResult = await wiseClient.getIncomingPayments();
    const transactions = wiseResult.transactions;

    const matches: any[] = [];
    const unmatched: any[] = [];

    for (const transaction of transactions) {
      const reference = (
        transaction.details.paymentReference ||
        transaction.details.description ||
        ''
      ).toUpperCase();

      let matched = false;

      // Try to find a matching invoice
      for (const [invoiceNumber, invoice] of Array.from(invoiceMap.entries())) {
        if (reference.includes(invoiceNumber)) {
          matches.push({
            transaction: {
              referenceNumber: transaction.referenceNumber,
              date: transaction.date,
              amount: transaction.amount.value,
              currency: transaction.amount.currency,
              senderName: transaction.details.senderName,
              paymentReference: transaction.details.paymentReference,
            },
            invoice: {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.amount,
              currency: invoice.currency,
              organizationName: invoice.organizationName,
            },
            confidence: 'high',
          });
          matched = true;
          break;
        }
      }

      if (!matched) {
        unmatched.push({
          referenceNumber: transaction.referenceNumber,
          date: transaction.date,
          amount: transaction.amount.value,
          currency: transaction.amount.currency,
          senderName: transaction.details.senderName,
          paymentReference: transaction.details.paymentReference,
          description: transaction.details.description,
        });
      }
    }

    return NextResponse.json({
      success: true,
      matches,
      unmatched,
      summary: {
        totalTransactions: transactions.length,
        matchedCount: matches.length,
        unmatchedCount: unmatched.length,
        unpaidInvoicesCount: unpaidInvoices.size,
      },
    });
  } catch (error: any) {
    console.error('Error auto-matching Wise transfers:', error);

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
      { error: error.message || 'Failed to auto-match transfers' },
      { status: 500 }
    );
  }
}
