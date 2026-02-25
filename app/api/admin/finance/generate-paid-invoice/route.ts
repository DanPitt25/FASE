import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';

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

    // Generate invoice number
    const year = new Date().getFullYear();
    const counterRef = adminDb.collection('counters').doc('paid_invoices');

    let invoiceNumber: string;

    await adminDb.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentCount = 1;

      if (counterDoc.exists) {
        const data = counterDoc.data();
        currentCount = (data?.count || 0) + 1;
      }

      transaction.set(counterRef, { count: currentCount, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      invoiceNumber = `FASE-PAID-${year}-${String(currentCount).padStart(4, '0')}`;
    });

    // Generate PDF using the paid invoice generator
    const { generatePaidInvoicePDF } = await import('@/lib/paid-invoice-generator');

    const pdfResult = await generatePaidInvoicePDF({
      invoiceNumber: invoiceNumber!,
      organizationName,
      contactName: contactName || '',
      address: address || undefined,
      lineItems: processedLineItems,
      currency: currency || 'EUR',
      paidAt: paidAt || new Date().toISOString(),
      paymentMethod: paymentMethod || source,
      reference: reference || transactionId,
    });

    // Store invoice record in Firestore
    const paymentKey = `${source}_${transactionId}`;

    const invoiceDoc = await adminDb.collection('paid_invoices').add({
      invoiceNumber: invoiceNumber!,
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
      description: `Invoice ${invoiceNumber!} generated for ${organizationName}`,
      performedBy: 'admin',
      performedByName: 'Admin',
      metadata: {
        invoiceId: invoiceDoc.id,
        invoiceNumber: invoiceNumber!,
        totalAmount,
        currency: currency || 'EUR',
        lineItemCount: processedLineItems.length,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      invoiceNumber: invoiceNumber!,
      invoiceId: invoiceDoc.id,
      pdfBase64: pdfResult.pdfBase64,
    });
  } catch (error: any) {
    console.error('Error generating paid invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
