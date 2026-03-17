import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, isAuthError } from '@/lib/admin-auth';
import { generateInvoiceNumber, generateAndStore } from '@/lib/invoice-service';
import { generatePaidInvoicePDF } from '@/lib/paid-invoice-generator';

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
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      transactionId,
      source,
      organizationName,
      lineItems,
      currency = 'EUR',
      paidAt,
      paymentMethod,
      email,
      reference,
      accountId,
      contactName,
      address,
      vatNumber,
      invoiceNumber: customInvoiceNumber,  // Optional: use existing invoice number
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
    // Use custom invoice number if provided, otherwise auto-generate
    const invoiceNumber = customInvoiceNumber || generateInvoiceNumber({ type: 'finance_paid' });
    const paymentKey = `${source}_${transactionId}`;

    // Generate, upload, record, and log in one operation
    const result = await generateAndStore({
      type: 'finance_paid',
      organizationName,
      totalAmount,
      currency,
      generatePdf: () => generatePaidInvoicePDF({
        invoiceNumber,
        organizationName,
        contactName: contactName || '',
        address: address || undefined,
        vatNumber: vatNumber || undefined,
        lineItems: processedLineItems,
        currency,
        paidAt: paidAt || new Date().toISOString(),
        paymentMethod: paymentMethod || source,
        reference: reference || transactionId,
      }),
      upload: true,
      folder: 'invoices/paid',
      createRecord: true,
      logActivity: true,
      payment: { paymentKey, transactionId, source },
      recordExtra: {
        paymentKey,
        transactionId,
        source,
        lineItems: processedLineItems,
        paidAt,
        paymentMethod: paymentMethod || source,
        email: email || null,
        reference: reference || null,
        accountId: accountId || null,
        contactName: contactName || null,
        address: address || null,
        generatedBy: 'admin',
      },
      storageMetadata: {
        transactionId,
        source,
      },
    });

    return NextResponse.json({
      success: true,
      invoiceNumber: result.invoiceNumber,
      invoiceId: result.recordId,
      pdfBase64: result.pdfBase64,
      pdfUrl: result.signedUrl,
    });
  } catch (error: any) {
    console.error('Error generating paid invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
