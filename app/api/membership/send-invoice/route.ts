import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';
import { generateInvoiceFromLineItems } from '../../../../lib/invoice-pdf-generator';
import { uploadInvoicePDF } from '../../../../lib/invoice-storage';
import { adminDb, FieldValue } from '../../../../lib/firebase-admin';
import { convertCurrency, getWiseBankDetails } from '../../../../lib/currency-conversion';

export const runtime = 'nodejs';

// Initialize Stripe
let stripe: Stripe | null = null;

const initializeStripe = () => {
  if (!stripe) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });
  }
  return stripe;
};

// Load email translations
function loadEmailTranslations(language: string): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'email.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    if (language !== 'en') {
      return loadEmailTranslations('en');
    }
    return {};
  }
}

/**
 * Unified Membership Invoice API
 *
 * Consolidates all membership invoice sending into one endpoint that:
 * - Accepts flexible line items (supports negative values for credits)
 * - Creates Stripe Payment Link only if total > 0 and includeStripeLink: true
 * - Generates PDF with bank transfer details always
 * - Stores invoice record in `invoices` collection
 * - Sends email via Firebase Function with PDF attachment
 */
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();

    // =========================================================================
    // VALIDATE INPUT
    // =========================================================================
    const {
      accountId,
      recipientEmail,
      recipientName,
      organizationName,
      lineItems,
      currency = 'EUR',
      locale = 'en',
      sender = 'admin',
      customMessage,
      ccEmails,
      address,
      preview = false,
      gender = 'm',
      // Rendezvous pass data - stored in invoice for webhook to process on payment
      rendezvousPassReservation,
    } = requestData;

    // Validate required fields
    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }
    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 });
    }
    if (!organizationName) {
      return NextResponse.json({ error: 'organizationName is required' }, { status: 400 });
    }
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    // Validate line items structure
    for (const item of lineItems) {
      if (!item.description || typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
        return NextResponse.json(
          { error: 'Each line item must have description, quantity, and unitPrice' },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // CALCULATE TOTALS
    // =========================================================================
    const subtotal = lineItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    // Can be zero or negative for credit notes
    const total = subtotal;

    // Convert line items for PDF generator format
    const pdfLineItems = lineItems.map((item: any) => ({
      description: item.description,
      amount: item.quantity * item.unitPrice,
      isDiscount: item.unitPrice < 0 || (item.quantity * item.unitPrice) < 0,
    }));

    // =========================================================================
    // GENERATE INVOICE NUMBER
    // =========================================================================
    const invoiceNumber = `FASE-${Math.floor(10000 + Math.random() * 90000)}`;

    // =========================================================================
    // CURRENCY HANDLING
    // =========================================================================
    const supportedCurrencies = ['EUR', 'GBP', 'USD'];
    const paymentCurrency = currency === 'auto'
      ? 'EUR' // Default to EUR for auto
      : (supportedCurrencies.includes(currency) ? currency : 'EUR');

    // Get bank details for this currency
    const bankDetails = getWiseBankDetails(paymentCurrency);

    // Convert amount if not EUR (for display purposes)
    let convertedAmount = total;
    let exchangeRate = 1;
    if (paymentCurrency !== 'EUR' && total > 0) {
      const conversion = await convertCurrency(total, '', paymentCurrency);
      convertedAmount = conversion.roundedAmount;
      exchangeRate = conversion.exchangeRate;
    }

    // =========================================================================
    // GENERATE PDF
    // =========================================================================
    console.log(`🧾 Generating unified invoice PDF: ${invoiceNumber}`);

    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const safeLocale = supportedLocales.includes(locale) ? locale : 'en';

    const pdfResult = await generateInvoiceFromLineItems({
      invoiceNumber,
      email: recipientEmail,
      fullName: recipientName || '',
      organizationName,
      greeting: recipientName || '',
      gender,
      address: address || {
        line1: 'Not provided',
        city: 'Not provided',
        postcode: '',
        country: 'Netherlands',
      },
      lineItems: pdfLineItems,
      paymentCurrency,
      userLocale: safeLocale,
      generationSource: 'unified_api',
    });

    // =========================================================================
    // CREATE STRIPE PAYMENT LINK (only if total > 0)
    // =========================================================================
    let stripePaymentLinkId: string | null = null;
    let stripePaymentLinkUrl: string | null = null;

    if (total > 0) {
      try {
        const stripeInstance = initializeStripe();
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const host = request.headers.get('host');
        const baseUrl = `${protocol}://${host}`;

        // Use a single reusable product for all FASE membership invoices
        const FASE_INVOICE_PRODUCT_ID = 'prod_fase_membership_invoice';
        let product;
        try {
          // Try to retrieve existing product
          product = await stripeInstance.products.retrieve(FASE_INVOICE_PRODUCT_ID);
        } catch {
          // Product doesn't exist, create it with a specific ID
          product = await stripeInstance.products.create({
            id: FASE_INVOICE_PRODUCT_ID,
            name: 'FASE Membership Dues',
            description: 'Membership dues for FASE',
          });
        }

        // Create price for this specific amount (prices are immutable, so we need one per amount)
        // The price stores metadata for this specific invoice
        const price = await stripeInstance.prices.create({
          currency: 'eur',
          product: product.id,
          unit_amount: Math.round(total * 100), // Convert to cents
          metadata: {
            invoice_number: invoiceNumber,
            organization_name: organizationName,
            account_id: accountId,
          },
        });

        // Create Payment Link
        const paymentLink = await stripeInstance.paymentLinks.create({
          line_items: [{ price: price.id, quantity: 1 }],
          metadata: {
            invoice_number: invoiceNumber,
            organization_name: organizationName,
            account_id: accountId,
            user_email: recipientEmail,
          },
          after_completion: {
            type: 'redirect',
            redirect: {
              url: `${baseUrl}/payment-succeeded?payment_link_id={PAYMENT_LINK_ID}&invoice=${invoiceNumber}`,
            },
          },
          allow_promotion_codes: true,
          billing_address_collection: 'auto',
        });

        stripePaymentLinkId = paymentLink.id;
        stripePaymentLinkUrl = paymentLink.url;
        console.log('✅ Stripe Payment Link created:', stripePaymentLinkUrl);
      } catch (stripeError: any) {
        console.error('⚠️ Failed to create Stripe Payment Link:', stripeError.message);
        // Continue without Stripe link - bank transfer is still available
      }
    }

    // =========================================================================
    // UPLOAD PDF TO STORAGE
    // =========================================================================
    let pdfUrl: string | null = null;
    let storagePath: string | null = null;

    try {
      const uploadResult = await uploadInvoicePDF(
        pdfResult.pdfBase64,
        invoiceNumber,
        organizationName
      );
      pdfUrl = uploadResult.downloadURL;
      storagePath = uploadResult.filePath;
      console.log('✅ Invoice PDF uploaded:', pdfUrl);
    } catch (storageError: any) {
      console.error('⚠️ Failed to upload PDF:', storageError.message);
      // Continue - PDF is still in memory for email attachment
    }

    // =========================================================================
    // CREATE INVOICE RECORD IN FIRESTORE
    // =========================================================================
    const invoiceRecord: Record<string, any> = {
      invoiceNumber,
      accountId,
      accountName: organizationName,
      recipientEmail,
      recipientName: recipientName || null,

      // Line items
      lineItems: lineItems.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal,
      total,
      currency: 'EUR', // Base currency is always EUR
      paymentCurrency,
      convertedAmount: paymentCurrency !== 'EUR' ? convertedAmount : null,
      exchangeRate: paymentCurrency !== 'EUR' ? exchangeRate : null,

      // Payment tracking
      status: 'sent' as const,
      stripePaymentLinkId,
      stripePaymentLinkUrl,

      // File storage
      pdfUrl,
      storagePath,

      // Metadata
      sender,
      locale: safeLocale,
      customMessage: customMessage || null,
      createdAt: FieldValue.serverTimestamp(),
      sentAt: preview ? null : FieldValue.serverTimestamp(),

      // Rendezvous pass data (for webhook to process on payment)
      rendezvousPassReservation: rendezvousPassReservation || null,
    };

    let invoiceDocId: string | null = null;

    if (!preview) {
      try {
        const docRef = await adminDb.collection('invoices').add(invoiceRecord);
        invoiceDocId = docRef.id;
        console.log('✅ Invoice record created:', invoiceDocId);
      } catch (dbError: any) {
        console.error('⚠️ Failed to create invoice record:', dbError.message);
        // Continue - invoice was still generated
      }
    }

    // =========================================================================
    // BUILD EMAIL CONTENT
    // =========================================================================
    const translations = loadEmailTranslations(safeLocale);
    const invoiceEmail = translations.invoice_delivery || {};
    const adminEmail = translations.membership_acceptance_admin || {};

    const genderSuffix = gender === 'f' ? '_f' : '_m';

    const isCreditNote = total <= 0;

    // Build the email body
    let emailBodyHtml = '';

    if (isCreditNote) {
      // Credit note - no payment needed
      const creditDear = invoiceEmail[`dear${genderSuffix}`] || invoiceEmail.dear;

      emailBodyHtml = `
        <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
          ${creditDear},
        </p>
        <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
          ${invoiceEmail.credit_note_text?.replace('{organizationName}', organizationName)}
        </p>
        ${customMessage ? `<p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">${customMessage}</p>` : ''}
        <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
          ${invoiceEmail.contact_text}
        </p>
      `;
    } else {
      // Normal invoice with Stripe payment link
      const membershipDear = adminEmail[`dear${genderSuffix}`] || adminEmail.dear;
      const genderAwareWelcome = adminEmail[`welcome${genderSuffix}`] || adminEmail.welcome;
      const genderAwareWelcomeText = adminEmail[`welcome_text${genderSuffix}`] || adminEmail.welcome_text;

      // Check if there's a rendezvous pass reservation bundled
      const hasRendezvousPasses = rendezvousPassReservation && rendezvousPassReservation.reserved;
      const paymentText = hasRendezvousPasses
        ? adminEmail.payment_text_with_rendezvous
        : adminEmail.payment_text;
      const bankTransferText = adminEmail.bank_transfer_text;

      emailBodyHtml = `
        <h2 style="color: #2D5574; margin: 0 0 20px 0; font-size: 20px;">${genderAwareWelcome}</h2>

        <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
          ${membershipDear} ${recipientName || ''},
        </p>

        <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
          ${genderAwareWelcomeText.replace('{organizationName}', `<strong>${organizationName}</strong>`)}
        </p>

        <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
          ${paymentText.replace('{totalAmount}', total.toLocaleString())}
        </p>
        ${customMessage ? `<p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">${customMessage}</p>` : ''}
        ${stripePaymentLinkUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${stripePaymentLinkUrl}" style="display: inline-block; background-color: #2D5574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            ${adminEmail.payment_button || 'Pay membership dues'}
          </a>
        </div>
        ` : ''}
        <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 10px 0;">
          ${bankTransferText}
        </p>
        <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
          ${adminEmail.engagement}
        </p>
      `;
    }

    // Wrap email body in template
    const signatureTranslations = isCreditNote ? invoiceEmail : adminEmail;
    const fullEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
          </div>
          ${emailBodyHtml}
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
            ${signatureTranslations.regards}<br><br>
            <strong>${signatureTranslations.signature}</strong>
          </p>
        </div>
      </div>
    `;

    // Determine subject line
    let subject: string;
    if (isCreditNote) {
      const creditSubject = invoiceEmail.credit_note_subject || invoiceEmail[`credit_note_subject${genderSuffix}`];
      subject = creditSubject?.replace('{invoiceNumber}', invoiceNumber);
    } else {
      const genderAwareSubject = adminEmail[`subject${genderSuffix}`] || adminEmail.subject;
      subject = genderAwareSubject;
    }

    // =========================================================================
    // PREVIEW MODE - Return without sending
    // =========================================================================
    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        invoiceNumber,
        total,
        convertedAmount: paymentCurrency !== 'EUR' ? convertedAmount : undefined,
        paymentCurrency,
        stripePaymentLinkUrl,
        pdfUrl,
        pdfBase64: pdfResult.pdfBase64,
        email: {
          to: recipientEmail,
          cc: ccEmails || null,
          subject,
          html: fullEmailHtml,
        },
      });
    }

    // =========================================================================
    // SEND EMAIL VIA FIREBASE FUNCTION
    // =========================================================================
    const emailData = {
      email: recipientEmail,
      cc: ccEmails?.join(',') || undefined,
      subject,
      invoiceHTML: fullEmailHtml,
      invoiceNumber,
      organizationName,
      totalAmount: total.toString(),
      pdfAttachment: pdfResult.pdfBase64,
      pdfFilename: `Invoice-${invoiceNumber}.pdf`,
    };

    const response = await fetch('https://us-central1-fase-site.cloudfunctions.net/sendInvoiceEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: emailData }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firebase Function error: ${response.status} - ${errorText}`);
    }

    const emailResult = await response.json();
    console.log('✅ Invoice email sent successfully');

    // =========================================================================
    // LOG ACTIVITY TO ACCOUNT
    // =========================================================================
    try {
      await adminDb.collection('accounts').doc(accountId).collection('activities').add({
        type: 'invoice_sent',
        title: 'Invoice Sent',
        description: `Invoice ${invoiceNumber} sent to ${recipientEmail} (€${total.toLocaleString()})`,
        metadata: {
          invoiceNumber,
          invoiceId: invoiceDocId,
          total,
          currency: paymentCurrency,
          hasStripeLink: !!stripePaymentLinkUrl,
        },
        performedBy: 'admin',
        performedByName: sender === 'william' ? 'William van der Valk' : sender === 'aline' ? 'Aline van Maaren' : 'Admin',
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (activityError: any) {
      console.error('⚠️ Failed to log activity:', activityError.message);
    }

    // =========================================================================
    // RETURN SUCCESS
    // =========================================================================
    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceId: invoiceDocId,
      total,
      convertedAmount: paymentCurrency !== 'EUR' ? convertedAmount : undefined,
      paymentCurrency,
      stripePaymentLinkId,
      stripePaymentLinkUrl,
      pdfUrl,
      emailSent: true,
    });

  } catch (error: any) {
    console.error('❌ Unified invoice API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
