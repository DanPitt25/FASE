import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicePDF, generateInvoiceFromLineItems, InvoiceGenerationData } from '../../../lib/invoice-pdf-generator';
import { uploadInvoicePDF } from '../../../lib/invoice-storage';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();

    // Validate required fields
    if (!requestData.organizationName?.trim()) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    // Generate invoice number
    const invoiceNumber = requestData.invoiceNumber || `FASE-${Math.floor(10000 + Math.random() * 90000)}`;

    let result;

    // Check if using new line-items format
    if (requestData.lineItems && Array.isArray(requestData.lineItems)) {
      // New line-items-first approach
      console.log('Generating invoice from line items:', invoiceNumber);

      result = await generateInvoiceFromLineItems({
        invoiceNumber,
        email: requestData.email || '',
        fullName: requestData.fullName || requestData.recipientName || '',
        organizationName: requestData.organizationName,
        greeting: requestData.greeting || requestData.fullName || requestData.recipientName || '',
        gender: requestData.gender || 'm',
        address: requestData.address || {},
        lineItems: requestData.lineItems,
        paymentCurrency: requestData.paymentCurrency || 'EUR',
        userLocale: requestData.locale || 'en',
        generationSource: 'admin_portal'
      });
    } else {
      // Legacy format - require totalAmount
      if (!requestData.totalAmount || requestData.totalAmount <= 0) {
        return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
      }

      const invoiceGenerationData: InvoiceGenerationData = {
        invoiceNumber,
        invoiceType: 'regular',
        email: requestData.email || '',
        fullName: requestData.fullName || requestData.recipientName || '',
        organizationName: requestData.organizationName,
        greeting: requestData.greeting || requestData.fullName || requestData.recipientName || '',
        gender: requestData.gender || 'm',
        address: requestData.address || {},
        totalAmount: requestData.totalAmount,
        originalAmount: requestData.originalAmount || requestData.totalAmount,
        discountAmount: requestData.discountAmount || 0,
        discountReason: requestData.discountReason || '',
        hasOtherAssociations: requestData.hasOtherAssociations || false,
        forceCurrency: requestData.currency || 'EUR',
        userLocale: requestData.locale || 'en',
        customLineItem: requestData.customLineItem || null,
        generationSource: 'admin_portal',
        isPreview: false
      };

      console.log('Generating custom invoice PDF (legacy):', invoiceNumber);
      result = await generateInvoicePDF(invoiceGenerationData);
    }

    // Upload to Firebase Storage
    let pdfUrl: string | undefined;
    try {
      const uploadResult = await uploadInvoicePDF(
        result.pdfBase64,
        invoiceNumber,
        requestData.organizationName
      );
      pdfUrl = uploadResult.downloadURL;
      console.log('✅ Custom invoice PDF stored:', pdfUrl);
    } catch (storageError) {
      console.error('❌ Failed to store PDF:', storageError);
    }

    return NextResponse.json({
      success: true,
      invoiceNumber,
      pdfBase64: result.pdfBase64,
      pdfUrl,
      totalAmount: result.totalAmount,
      currency: result.currency,
      convertedCurrency: result.convertedCurrency,
      convertedAmount: result.convertedAmount
    });

  } catch (error: any) {
    console.error('Failed to generate invoice PDF:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
