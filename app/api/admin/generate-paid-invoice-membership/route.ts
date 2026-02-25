import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '../../../../lib/firebase-admin';
import { generatePaidInvoicePDF, PaymentInfo, InvoiceGenerationData } from '../../../../lib/invoice-pdf-generator';
import { uploadInvoicePDF } from '../../../../lib/invoice-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST: Generate a PAID invoice PDF for a membership payment
 *
 * Can be called with:
 * 1. invoiceId - looks up invoice from Firestore and generates paid version
 * 2. Direct invoice data - generates paid PDF from provided data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let invoiceData: InvoiceGenerationData;
    let paymentInfo: PaymentInfo;
    let invoiceId: string | undefined;

    // Option 1: Look up from Firestore by invoiceId
    if (body.invoiceId) {
      invoiceId = body.invoiceId;
      const invoiceDoc = await adminDb.collection('invoices').doc(invoiceId).get();

      if (!invoiceDoc.exists) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const firestoreData = invoiceDoc.data()!;

      // Build invoice data from Firestore document
      invoiceData = {
        invoiceNumber: firestoreData.invoiceNumber,
        email: firestoreData.recipientEmail || firestoreData.email || '',
        fullName: firestoreData.recipientName || firestoreData.fullName || '',
        organizationName: firestoreData.organizationName,
        totalAmount: firestoreData.amount || firestoreData.totalAmount,
        originalAmount: firestoreData.originalAmount,
        discountAmount: firestoreData.discountAmount,
        discountReason: firestoreData.discountReason,
        organizationType: firestoreData.organizationType,
        address: firestoreData.address,
        userLocale: firestoreData.locale || body.locale || 'en',
        forceCurrency: firestoreData.currency || body.currency || 'EUR',
      };

      // Use payment info from Firestore or request body
      paymentInfo = {
        paidAt: firestoreData.paidAt?.toDate?.() || body.paidAt || new Date(),
        paymentMethod: firestoreData.paymentMethod || body.paymentMethod || 'manual',
        paymentReference: firestoreData.paymentId || firestoreData.paymentReference || body.paymentReference,
        amountPaid: firestoreData.amount || firestoreData.totalAmount,
        currency: firestoreData.currency || body.currency || 'EUR',
      };
    }
    // Option 2: Direct invoice data provided
    else if (body.invoiceNumber && body.organizationName) {
      invoiceData = {
        invoiceNumber: body.invoiceNumber,
        email: body.email || '',
        fullName: body.fullName || body.recipientName || '',
        organizationName: body.organizationName,
        totalAmount: body.amount || body.totalAmount,
        originalAmount: body.originalAmount,
        discountAmount: body.discountAmount,
        discountReason: body.discountReason,
        organizationType: body.organizationType,
        address: body.address,
        userLocale: body.locale || 'en',
        forceCurrency: body.currency || 'EUR',
        customLineItem: body.customLineItem,
      };

      paymentInfo = {
        paidAt: body.paidAt || new Date(),
        paymentMethod: body.paymentMethod || 'manual',
        paymentReference: body.paymentReference,
        amountPaid: body.amount || body.totalAmount,
        currency: body.currency || 'EUR',
      };
    }
    // Option 3: Look up by accountId
    else if (body.accountId) {
      const accountDoc = await adminDb.collection('accounts').doc(body.accountId).get();

      if (!accountDoc.exists) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      const accountData = accountDoc.data()!;

      // Try to find the most recent invoice for this account
      const invoicesSnapshot = await adminDb
        .collection('invoices')
        .where('accountId', '==', body.accountId)
        .orderBy('sentAt', 'desc')
        .limit(1)
        .get();

      if (invoicesSnapshot.empty) {
        // No invoice found, generate from account data
        invoiceData = {
          invoiceNumber: body.invoiceNumber || `FASE-${Math.floor(10000 + Math.random() * 90000)}`,
          email: accountData.email || '',
          fullName: accountData.primaryContact?.name || '',
          organizationName: accountData.organizationName,
          totalAmount: body.amount || accountData.membershipFee || 0,
          organizationType: accountData.organizationType,
          address: accountData.address,
          userLocale: accountData.preferredLanguage || 'en',
          forceCurrency: body.currency || 'EUR',
        };
      } else {
        const firestoreData = invoicesSnapshot.docs[0].data();
        invoiceId = invoicesSnapshot.docs[0].id;

        invoiceData = {
          invoiceNumber: firestoreData.invoiceNumber,
          email: firestoreData.recipientEmail || firestoreData.email || '',
          fullName: firestoreData.recipientName || firestoreData.fullName || '',
          organizationName: firestoreData.organizationName,
          totalAmount: firestoreData.amount || firestoreData.totalAmount,
          originalAmount: firestoreData.originalAmount,
          discountAmount: firestoreData.discountAmount,
          discountReason: firestoreData.discountReason,
          organizationType: firestoreData.organizationType,
          address: firestoreData.address,
          userLocale: firestoreData.locale || body.locale || 'en',
          forceCurrency: firestoreData.currency || body.currency || 'EUR',
        };
      }

      paymentInfo = {
        paidAt: body.paidAt || new Date(),
        paymentMethod: body.paymentMethod || 'manual',
        paymentReference: body.paymentReference,
        amountPaid: invoiceData.totalAmount,
        currency: body.currency || 'EUR',
      };
    }
    else {
      return NextResponse.json(
        { error: 'Must provide either invoiceId, accountId, or invoice details (invoiceNumber + organizationName)' },
        { status: 400 }
      );
    }

    // Generate the paid invoice PDF
    const result = await generatePaidInvoicePDF(invoiceData, paymentInfo);

    // Upload to Firebase Storage
    let pdfUrl: string | undefined;
    try {
      const uploadResult = await uploadInvoicePDF(
        result.pdfBase64,
        `${invoiceData.invoiceNumber}-PAID`,
        invoiceData.organizationName
      );
      pdfUrl = uploadResult.downloadURL;
      console.log('✅ PAID invoice PDF stored:', pdfUrl);
    } catch (storageError) {
      console.error('❌ Failed to store PAID PDF:', storageError);
      // Continue without storage - still return the PDF
    }

    // Update Firestore invoice with paid PDF URL if we have an invoiceId
    if (invoiceId && pdfUrl) {
      try {
        await adminDb.collection('invoices').doc(invoiceId).update({
          paidPdfUrl: pdfUrl,
          paidPdfGeneratedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (updateError) {
        console.error('Failed to update invoice with paid PDF URL:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      invoiceNumber: invoiceData.invoiceNumber,
      pdfBase64: result.pdfBase64,
      pdfUrl,
      totalAmount: result.totalAmount,
      currency: result.currency,
      paymentMethod: paymentInfo.paymentMethod,
      paidAt: paymentInfo.paidAt,
      filename: `${invoiceData.invoiceNumber}-PAID.pdf`
    });

  } catch (error: any) {
    console.error('Error generating paid membership invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate paid invoice' },
      { status: 500 }
    );
  }
}
