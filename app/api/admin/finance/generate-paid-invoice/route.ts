import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

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
      description,
      amount,
      currency,
      paidAt,
      paymentMethod,
      email,
      reference,
      accountId,
      // Editable address fields (take precedence over fetched data)
      contactName: providedContactName,
      address: providedAddress,
    } = body;

    if (!transactionId || !source || !organizationName || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionId, source, organizationName, amount' },
        { status: 400 }
      );
    }

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

    // Generate PDF using the existing invoice generator
    const { generatePaidInvoicePDF } = await import('@/lib/paid-invoice-generator');

    // Use provided address fields (from the editable form)
    const pdfResult = await generatePaidInvoicePDF({
      invoiceNumber: invoiceNumber!,
      organizationName,
      description: description || 'FASE Annual Membership',
      amount,
      currency: currency || 'EUR',
      paidAt: paidAt || new Date().toISOString(),
      paymentMethod: paymentMethod || source,
      reference: reference || transactionId,
      contactName: providedContactName || '',
      address: providedAddress || undefined,
    });

    // Store invoice record in Firestore
    const paymentKey = `${source}_${transactionId}`;

    const invoiceDoc = await adminDb.collection('paid_invoices').add({
      invoiceNumber: invoiceNumber!,
      paymentKey,
      transactionId,
      source,
      organizationName: memberData?.organizationName || organizationName,
      description: description || 'FASE Annual Membership',
      amount,
      currency: currency || 'EUR',
      paidAt,
      paymentMethod: paymentMethod || source,
      email: memberData?.primaryContact?.email || email || null,
      reference: reference || null,
      accountId: accountId || null,
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
        amount,
        currency: currency || 'EUR',
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
