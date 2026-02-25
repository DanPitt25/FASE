import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, FieldValue } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

/**
 * POST: Generate a PAID invoice PDF for a payment transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transactionId,
      source,
      organizationName,
      lineItems,
      currency,
      paidAt,
      paymentMethod,
      email,
      reference,
      accountId,
      contactName,
      address,
    } = body;

    if (!transactionId || !source || !organizationName || !lineItems || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionId, source, organizationName, lineItems' },
        { status: 400 }
      );
    }

    // Calculate total from line items
    const processedLineItems = (lineItems as LineItemInput[]).map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const totalAmount = processedLineItems.reduce((sum, item) => sum + item.total, 0);

    // Generate invoice number - simple 5-digit random number
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const invoiceNumber = `FASE-${randomNum}`;

    // Generate PDF using the paid invoice generator
    const { generatePaidInvoicePDF } = await import('@/lib/paid-invoice-generator');

    const pdfResult = await generatePaidInvoicePDF({
      invoiceNumber,
      organizationName,
      contactName: contactName || '',
      address: address || undefined,
      lineItems: processedLineItems,
      currency: currency || 'EUR',
      paidAt: paidAt || new Date().toISOString(),
      paymentMethod: paymentMethod || source,
      reference: reference || transactionId,
    });

    // Upload PDF to Firebase Storage
    const pdfBuffer = Buffer.from(pdfResult.pdfBase64, 'base64');
    const storagePath = `invoices/paid/${invoiceNumber}.pdf`;
    const file = adminStorage.bucket().file(storagePath);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          invoiceNumber,
          organizationName,
          transactionId,
          source,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Get the public URL
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '2099-12-31',
    });

    // Store invoice record in Firestore
    const paymentKey = `${source}_${transactionId}`;

    const invoiceDoc = await adminDb.collection('paid_invoices').add({
      invoiceNumber,
      paymentKey,
      transactionId,
      source,
      organizationName,
      lineItems: processedLineItems,
      totalAmount,
      currency: currency || 'EUR',
      paidAt,
      paymentMethod: paymentMethod || source,
      email: email || null,
      reference: reference || null,
      accountId: accountId || null,
      contactName: contactName || null,
      address: address || null,
      pdfUrl: signedUrl,
      storagePath,
      generatedAt: FieldValue.serverTimestamp(),
      generatedBy: 'admin',
    });

    // Log activity
    await adminDb.collection('payment_activities').add({
      paymentKey,
      transactionId,
      source,
      type: 'invoice_generated',
      title: 'PAID Invoice Generated',
      description: `Invoice ${invoiceNumber} generated for ${organizationName}`,
      performedBy: 'admin',
      performedByName: 'Admin',
      metadata: {
        invoiceId: invoiceDoc.id,
        invoiceNumber,
        totalAmount,
        currency: currency || 'EUR',
        lineItemCount: processedLineItems.length,
        pdfUrl: signedUrl,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceId: invoiceDoc.id,
      pdfBase64: pdfResult.pdfBase64,
      pdfUrl: signedUrl,
    });
  } catch (error: any) {
    console.error('Error generating paid invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
