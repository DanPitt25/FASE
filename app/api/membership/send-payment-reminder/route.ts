import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';
import { generateInvoiceFromLineItems } from '../../../../lib/invoice-pdf-generator';
import { uploadInvoicePDF } from '../../../../lib/invoice-storage';
import { adminDb, FieldValue } from '../../../../lib/firebase-admin';
import { convertCurrency, getWiseBankDetails, detectCurrency } from '../../../../lib/currency-conversion';

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

// Format date for display
function formatDate(date: Date, locale: string): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const localeMap: Record<string, string> = {
    'en': 'en-GB',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'es': 'es-ES',
    'it': 'it-IT',
    'nl': 'nl-NL'
  };
  return date.toLocaleDateString(localeMap[locale] || 'en-GB', options);
}

/**
 * Payment Reminder API
 *
 * Sends a follow-up email with updated invoice to members who haven't paid.
 * - References original application date
 * - Notes that bank details have changed
 * - Includes updated invoice with current bank details
 * - Creates new Stripe payment link
 */
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();

    const {
      accountId,
      recipientEmail,
      recipientName,
      greeting,
      organizationName,
      lineItems,
      applicationDate, // Original application date (ISO string or timestamp)
      currency = 'EUR',
      locale = 'en',
      sender = 'william.pitt@fasemga.com',
      address,
      preview = false,
      gender = 'm',
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

    // Calculate totals
    const subtotal = lineItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    const total = subtotal;

    // Convert line items for PDF generator
    const pdfLineItems = lineItems.map((item: any) => ({
      description: item.description,
      amount: item.quantity * item.unitPrice,
      isDiscount: item.unitPrice < 0 || (item.quantity * item.unitPrice) < 0,
    }));

    // Generate invoice number
    const invoiceNumber = `FASE-${Math.floor(10000 + Math.random() * 90000)}`;

    // Currency handling
    const supportedCurrencies = ['EUR', 'GBP', 'USD'];
    let paymentCurrency: string;
    if (currency === 'auto') {
      const country = address?.country || '';
      paymentCurrency = detectCurrency(country);
    } else {
      paymentCurrency = supportedCurrencies.includes(currency) ? currency : 'EUR';
    }

    const bankDetails = getWiseBankDetails(paymentCurrency);

    let convertedAmount = total;
    let exchangeRate = 1;
    if (paymentCurrency !== 'EUR' && total > 0) {
      const conversion = await convertCurrency(total, '', paymentCurrency);
      convertedAmount = conversion.roundedAmount;
      exchangeRate = conversion.exchangeRate;
    }

    // Generate PDF
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const safeLocale = supportedLocales.includes(locale) ? locale : 'en';

    const pdfResult = await generateInvoiceFromLineItems({
      invoiceNumber,
      email: recipientEmail,
      fullName: recipientName || '',
      organizationName,
      greeting: greeting || recipientName || '',
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
      generationSource: 'payment_reminder',
    });

    // Create Stripe Payment Link
    let stripePaymentLinkId: string | null = null;
    let stripePaymentLinkUrl: string | null = null;

    if (total > 0) {
      try {
        const stripeInstance = initializeStripe();
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const host = request.headers.get('host');
        const baseUrl = `${protocol}://${host}`;

        const FASE_INVOICE_PRODUCT_ID = 'prod_fase_membership_invoice';
        let product;
        try {
          product = await stripeInstance.products.retrieve(FASE_INVOICE_PRODUCT_ID);
        } catch {
          product = await stripeInstance.products.create({
            id: FASE_INVOICE_PRODUCT_ID,
            name: 'FASE Membership Dues',
            description: 'Membership dues for FASE',
          });
        }

        const price = await stripeInstance.prices.create({
          currency: 'eur',
          product: product.id,
          unit_amount: Math.round(total * 100),
          metadata: {
            invoice_number: invoiceNumber,
            organization_name: organizationName,
            account_id: accountId,
            type: 'payment_reminder',
          },
        });

        const paymentLink = await stripeInstance.paymentLinks.create({
          line_items: [{ price: price.id, quantity: 1 }],
          metadata: {
            invoice_number: invoiceNumber,
            organization_name: organizationName,
            account_id: accountId,
            user_email: recipientEmail,
            type: 'payment_reminder',
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
      } catch (err: any) {
        console.error('Failed to create Stripe Payment Link:', err.message);
      }
    }

    // Upload PDF
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
    } catch (storageError: any) {
      console.error('Failed to upload PDF:', storageError.message);
    }

    // Create invoice record
    const invoiceRecord: Record<string, any> = {
      invoiceNumber,
      accountId,
      accountName: organizationName,
      recipientEmail,
      recipientName: recipientName || null,
      lineItems: lineItems.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal,
      total,
      currency: 'EUR',
      paymentCurrency,
      convertedAmount: paymentCurrency !== 'EUR' ? convertedAmount : null,
      exchangeRate: paymentCurrency !== 'EUR' ? exchangeRate : null,
      status: 'sent',
      type: 'payment_reminder',
      stripePaymentLinkId,
      stripePaymentLinkUrl,
      pdfUrl,
      storagePath,
      sender,
      locale: safeLocale,
      createdAt: FieldValue.serverTimestamp(),
      sentAt: preview ? null : FieldValue.serverTimestamp(),
    };

    let invoiceDocId: string | null = null;

    if (!preview) {
      try {
        const docRef = await adminDb.collection('invoices').add(invoiceRecord);
        invoiceDocId = docRef.id;
      } catch (dbError: any) {
        console.error('Failed to create invoice record:', dbError.message);
      }
    }

    // Build email content
    const translations = loadEmailTranslations(safeLocale);
    const reminderEmail = translations.payment_reminder || {};
    const genderSuffix = gender === 'f' ? '_f' : '_m';
    const dear = reminderEmail[`dear${genderSuffix}`] || reminderEmail.dear || 'Dear';

    // Format application date
    let formattedAppDate = '';
    if (applicationDate) {
      const appDate = typeof applicationDate === 'string'
        ? new Date(applicationDate)
        : new Date(applicationDate.seconds ? applicationDate.seconds * 1000 : applicationDate);
      formattedAppDate = formatDate(appDate, safeLocale);
    }

    // Build email body - payment reminder specific
    const reminderText = (reminderEmail[`reminder_text${genderSuffix}`] || reminderEmail.reminder_text || '')
      .replace('{organizationName}', `<strong>${organizationName}</strong>`)
      .replace('{applicationDate}', formattedAppDate);

    const paymentText = (reminderEmail.payment_text || '')
      .replace('{totalAmount}', total.toLocaleString());

    const emailBodyHtml = `
      <h2 style="color: #2D5574; margin: 0 0 20px 0; font-size: 20px;">${reminderEmail[`greeting${genderSuffix}`] || reminderEmail.greeting || 'Membership Invoice'}</h2>

      <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
        ${dear} ${greeting || recipientName || ''},
      </p>

      <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
        ${reminderText}
      </p>

      <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
        ${paymentText}
      </p>

      <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0; background-color: #FFF3CD; padding: 12px; border-radius: 4px; border-left: 4px solid #F0AD4E;">
        <strong>${reminderEmail.bank_details_note || 'Please note, our bank account details have recently changed. The current details are set out in the attached invoice.'}</strong>
      </p>

      ${stripePaymentLinkUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${stripePaymentLinkUrl}" style="display: inline-block; background-color: #2D5574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
          Pay Now Online
        </a>
      </div>
      ` : ''}

      <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
        ${reminderEmail.access_text || 'Once we receive your payment, we will provide access to the FASE member portal along with instructions for adding your company to our member directory.'}
      </p>

      <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
        As a reminder, <strong>FASE members receive a 50% discount on passes to the MGA Rendezvous</strong>, our annual conference taking place 11-12 May 2026 in Barcelona. Early registrations are available now at <a href="https://mgarendezvous.com" style="color: #2D5574;">mgarendezvous.com</a>.
      </p>

      <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
        ${reminderEmail.contact_text || 'We look forward to welcoming you to FASE. Should you have any questions, please do not hesitate to contact us.'}
      </p>
    `;

    // Wrap in template
    const fullEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
          </div>
          ${emailBodyHtml}
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
            Best regards,<br><br>
            <strong>William Pitt</strong><br>
            <span style="color: #666;">Executive Director, FASE</span>
          </p>
        </div>
      </div>
    `;

    const subject = reminderEmail[`subject${genderSuffix}`] || reminderEmail.subject || 'FASE Membership Invoice';

    // Preview mode
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
          subject,
          html: fullEmailHtml,
        },
      });
    }

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    const senderMap: Record<string, string> = {
      'admin@fasemga.com': 'FASE Admin <admin@fasemga.com>',
      'william.pitt@fasemga.com': 'William Pitt <william.pitt@fasemga.com>',
      'info@fasemga.com': 'FASE Info <info@fasemga.com>',
    };

    const emailPayload: any = {
      from: senderMap[sender] || senderMap['william.pitt@fasemga.com'],
      to: recipientEmail,
      subject,
      html: fullEmailHtml,
    };

    if (pdfResult.pdfBase64) {
      emailPayload.attachments = [{
        filename: `Invoice-${invoiceNumber}.pdf`,
        content: pdfResult.pdfBase64,
        type: 'application/pdf',
        disposition: 'attachment'
      }];
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errorText}`);
    }

    const emailResult = await response.json();

    // Log activity
    try {
      await adminDb.collection('accounts').doc(accountId).collection('activities').add({
        type: 'payment_reminder_sent',
        title: 'Payment Reminder Sent',
        description: `Payment reminder ${invoiceNumber} sent to ${recipientEmail} (€${total.toLocaleString()})`,
        metadata: {
          invoiceNumber,
          invoiceId: invoiceDocId,
          total,
          currency: paymentCurrency,
          hasStripeLink: !!stripePaymentLinkUrl,
        },
        performedBy: sender,
        performedByName: 'William Pitt',
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (activityError: any) {
      console.error('Failed to log activity:', activityError.message);
    }

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
    console.error('Payment reminder API error:', error);
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
