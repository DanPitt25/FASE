import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue, Timestamp } from '../../../../../lib/firebase-admin';
import { generatePaidInvoicePDF, InvoiceGenerationData, PaymentInfo } from '../../../../../lib/invoice-pdf-generator';
import { uploadInvoicePDF } from '../../../../../lib/invoice-storage';

export const dynamic = 'force-dynamic';

// Generate and store a PAID invoice PDF
const generateAndStorePaidInvoice = async (
  invoiceData: any,
  invoiceId: string,
  amount: number,
  currency: string,
  paymentMethod: 'stripe' | 'wise',
  paymentReference?: string,
  transactionDate?: Date
): Promise<string | null> => {
  try {
    console.log(`📄 Auto-generating PAID invoice PDF for ${invoiceData.invoiceNumber} (manual match)`);

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
      paymentMethod,
      paymentReference,
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
    console.error('Failed to generate/store PAID invoice PDF:', error);
    return null;
  }
};

/**
 * POST: Manually match a transaction to an invoice
 * Body: {
 *   transactionId: string,
 *   source: 'stripe' | 'wise',
 *   invoiceId: string,
 *   amount?: number,
 *   currency?: string,
 *   transactionDate?: string,
 *   generatePaidPdf?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transactionId,
      source,
      invoiceId,
      amount,
      currency,
      transactionDate,
      generatePaidPdf = true,
    } = body;

    if (!transactionId || !source || !invoiceId) {
      return NextResponse.json(
        { error: 'transactionId, source, and invoiceId are required' },
        { status: 400 }
      );
    }

    if (source !== 'stripe' && source !== 'wise') {
      return NextResponse.json(
        { error: 'source must be "stripe" or "wise"' },
        { status: 400 }
      );
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
    const updateData: any = {
      status: 'paid',
      paymentMethod: source,
      paidAt: transactionDate
        ? Timestamp.fromDate(new Date(transactionDate))
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (source === 'stripe') {
      updateData.paymentId = transactionId;
      updateData.stripePaymentIntentId = transactionId;
    } else {
      updateData.wiseReference = transactionId;
    }

    await invoiceRef.update(updateData);

    // Generate PAID PDF if requested
    let paidPdfUrl: string | null = null;
    if (generatePaidPdf) {
      paidPdfUrl = await generateAndStorePaidInvoice(
        invoiceData,
        invoiceId,
        amount || invoiceData?.amount,
        currency || invoiceData?.currency || 'EUR',
        source,
        transactionId,
        transactionDate ? new Date(transactionDate) : undefined
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction matched to invoice',
      match: {
        transactionId,
        source,
        invoiceId,
        invoiceNumber: invoiceData?.invoiceNumber,
        organizationName: invoiceData?.organizationName,
        status: 'paid',
        paidPdfUrl,
      },
    });
  } catch (error: any) {
    console.error('Error matching transaction to invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to match transaction' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Unmatch a transaction from an invoice (revert to unpaid)
 * Body: { invoiceId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'invoiceId is required' },
        { status: 400 }
      );
    }

    // Get the invoice
    const invoiceRef = adminDb.collection('invoices').doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoiceData = invoiceDoc.data();

    if (invoiceData?.status !== 'paid') {
      return NextResponse.json(
        { error: 'Invoice is not marked as paid' },
        { status: 400 }
      );
    }

    // Revert the invoice to sent status
    await invoiceRef.update({
      status: 'sent',
      paymentMethod: FieldValue.delete(),
      paymentId: FieldValue.delete(),
      stripePaymentIntentId: FieldValue.delete(),
      stripeCheckoutSessionId: FieldValue.delete(),
      wiseReference: FieldValue.delete(),
      paidAt: FieldValue.delete(),
      paidPdfUrl: FieldValue.delete(),
      paidPdfGeneratedAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice reverted to unpaid status',
      invoice: {
        id: invoiceId,
        invoiceNumber: invoiceData?.invoiceNumber,
        status: 'sent',
      },
    });
  } catch (error: any) {
    console.error('Error unmatching transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unmatch transaction' },
      { status: 500 }
    );
  }
}
