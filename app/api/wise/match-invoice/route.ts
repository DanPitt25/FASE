import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue, Timestamp } from '../../../../lib/firebase-admin';
import { logPaymentReceived, logInvoicePaid } from '../../../../lib/activity-logger';
import { generatePaidInvoicePDF, InvoiceGenerationData, PaymentInfo } from '../../../../lib/invoice-pdf-generator';
import { uploadInvoicePDF } from '../../../../lib/invoice-storage';

export const dynamic = 'force-dynamic';

// Generate and store a PAID invoice PDF for Wise payments
const generateAndStorePaidInvoice = async (
  invoiceData: any,
  invoiceId: string,
  amount: number,
  currency: string,
  wiseReference?: string,
  transactionDate?: Date
): Promise<string | null> => {
  try {
    console.log(`📄 Auto-generating PAID invoice PDF for ${invoiceData.invoiceNumber} (Wise payment)`);

    const pdfInvoiceData: InvoiceGenerationData = {
      invoiceNumber: invoiceData.invoiceNumber,
      organizationName: invoiceData.organizationName,
      totalAmount: amount || invoiceData.amount,
      email: invoiceData.recipientEmail || invoiceData.email || '',
      fullName: invoiceData.recipientName || invoiceData.fullName || '',
      address: invoiceData.address,
      originalAmount: invoiceData.originalAmount,
      discountAmount: invoiceData.discountAmount,
      discountReason: invoiceData.discountReason,
      organizationType: invoiceData.organizationType,
      userLocale: invoiceData.locale || 'en',
      forceCurrency: (currency || invoiceData.currency || 'EUR').toUpperCase(),
    };

    const paymentInfo: PaymentInfo = {
      paidAt: transactionDate || new Date(),
      paymentMethod: 'wise',
      paymentReference: wiseReference,
      amountPaid: amount || invoiceData.amount,
      currency: (currency || invoiceData.currency || 'EUR').toUpperCase(),
    };

    // Generate the PDF
    const result = await generatePaidInvoicePDF(pdfInvoiceData, paymentInfo);

    // Upload to Firebase Storage
    const uploadResult = await uploadInvoicePDF(
      result.pdfBase64,
      `${invoiceData.invoiceNumber}-PAID`,
      invoiceData.organizationName
    );

    console.log(`✅ PAID invoice PDF stored: ${uploadResult.downloadURL}`);

    // Update Firestore invoice with paid PDF URL
    await adminDb.collection('invoices').doc(invoiceId).update({
      paidPdfUrl: uploadResult.downloadURL,
      paidPdfGeneratedAt: FieldValue.serverTimestamp(),
    });

    return uploadResult.downloadURL;
  } catch (error) {
    console.error('Failed to generate/store PAID invoice PDF (Wise):', error);
    return null;
  }
};

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

    // Auto-generate PAID invoice PDF
    const paidPdfUrl = await generateAndStorePaidInvoice(
      invoiceData,
      invoiceId,
      amount || invoiceData.amount,
      currency || invoiceData.currency,
      wiseReference,
      transactionDate ? new Date(transactionDate) : undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Invoice matched and marked as paid',
      invoice: {
        id: invoiceId,
        invoiceNumber: invoiceData?.invoiceNumber,
        status: 'paid',
        paymentMethod: 'wise',
        wiseReference,
        paidPdfUrl,
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
    const transactions = await wiseClient.getIncomingPayments();

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
