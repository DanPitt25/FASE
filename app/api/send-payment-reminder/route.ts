import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import Stripe from 'stripe';

// Force Node.js runtime to enable file system access
export const runtime = 'nodejs';
import { generateInvoicePDF, InvoiceGenerationData } from '../../../lib/invoice-pdf-generator';
import { getCurrencySymbol } from '../../../lib/currency-conversion';
import { uploadInvoicePDF } from '../../../lib/invoice-storage';

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

// Load email translations from JSON files
function loadEmailTranslations(language: string): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'email.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    // Fallback to English if file not found
    if (language !== 'en') {
      return loadEmailTranslations('en');
    }
    // Return empty object if even English fails
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    // Read data from request body
    const requestData = await request.json();
    const testData = {
      email: requestData.email || "danielhpitt@gmail.com",
      fullName: requestData.fullName || "Daniel Pitt",
      organizationName: requestData.organizationName || "Test Organization Ltd",
      totalAmount: requestData.totalAmount || 1500,
      userId: requestData.userId || "test-user-123",
      organizationType: requestData.organizationType || "MGA",
      grossWrittenPremiums: requestData.grossWrittenPremiums || "10-20m",
      hasOtherAssociations: requestData.hasOtherAssociations || false,
      greeting: requestData.greeting || requestData.fullName || "Daniel Pitt",
      gender: requestData.gender || "m", // "m" for masculine, "f" for feminine
      originalAmount: requestData.originalAmount || requestData.totalAmount,
      discountAmount: requestData.discountAmount || 0,
      discountReason: requestData.discountReason || "",
      address: requestData.address,
      applicationDate: requestData.applicationDate || requestData.createdAt || null
    };

    // Validate required basic fields
    const requiredBasicFields = ['email', 'fullName', 'organizationName'];
    const missingBasicFields = [];

    for (const field of requiredBasicFields) {
      if (!testData[field as keyof typeof testData] || (testData[field as keyof typeof testData] as string).trim() === '') {
        missingBasicFields.push(field);
      }
    }

    if (missingBasicFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingBasicFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate required address fields
    if (!testData.address || typeof testData.address !== 'object') {
      return NextResponse.json(
        { error: 'Address object is required' },
        { status: 400 }
      );
    }

    const requiredAddressFields = ['line1', 'city', 'postcode', 'country'];
    const missingAddressFields = [];

    for (const field of requiredAddressFields) {
      if (!testData.address[field] || testData.address[field].trim() === '') {
        missingAddressFields.push(`address.${field}`);
      }
    }

    if (missingAddressFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required address fields: ${missingAddressFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if this is a preview request
    const isPreview = requestData.preview === true;

    if (isPreview) {
      console.log(`Generating payment reminder preview for ${testData.email}...`);
    } else {
      console.log(`Sending payment reminder email to ${testData.email}...`, testData);
    }

    // Generate reminder invoice number
    const reminderNumber = "FASE-REM-" + Math.floor(10000 + Math.random() * 90000);

    // Initialize Stripe and create payment link
    const stripeInstance = initializeStripe();

    // Get base URL for redirect
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'fasemga.com';
    const baseUrl = `${protocol}://${host}`;

    // Create product for Payment Link
    const product = await stripeInstance.products.create({
      name: `FASE Annual Membership`,
      description: `Annual membership for ${testData.organizationName}`,
      metadata: {
        invoice_number: reminderNumber,
        organization_name: testData.organizationName,
        organization_type: testData.organizationType || 'MGA',
      }
    });

    // Create price for the product (annual subscription)
    const price = await stripeInstance.prices.create({
      currency: 'eur',
      product: product.id,
      unit_amount: testData.totalAmount * 100, // Convert euros to cents
      recurring: {
        interval: 'year',
      }
    });

    // Create Payment Link
    const stripePaymentLink = await stripeInstance.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        }
      ],
      metadata: {
        invoice_number: reminderNumber,
        organization_name: testData.organizationName,
        organization_type: testData.organizationType || 'MGA',
        user_id: testData.userId || '',
        user_email: testData.email,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${baseUrl}/payment-succeeded?payment_link_id={PAYMENT_LINK_ID}&invoice=${reminderNumber}`,
        }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    });

    const paymentLink = stripePaymentLink.url;
    console.log('✅ Stripe payment link generated:', paymentLink);

    // Detect language for email translations
    const userLocale = requestData.userLocale || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';

    // Currency conversion for email content
    const { convertCurrency } = await import('../../../lib/currency-conversion');
    const currencyConversion = await convertCurrency(testData.totalAmount, testData.address.country, requestData.forceCurrency);

    // Generate PDF invoice using the shared generator
    let pdfAttachment: string | null = null;
    try {
      console.log('🧾 Generating payment reminder invoice PDF...');

      const invoiceGenerationData: InvoiceGenerationData = {
        invoiceNumber: reminderNumber,
        invoiceType: 'reminder',
        isLostInvoice: false,

        email: testData.email,
        fullName: testData.fullName,
        organizationName: testData.organizationName,
        greeting: testData.greeting,
        gender: testData.gender,
        address: testData.address,

        totalAmount: testData.totalAmount,
        originalAmount: testData.originalAmount,
        discountAmount: testData.discountAmount,
        discountReason: testData.discountReason,
        hasOtherAssociations: testData.hasOtherAssociations,

        organizationType: testData.organizationType,
        grossWrittenPremiums: testData.grossWrittenPremiums,
        userId: testData.userId,

        forceCurrency: requestData.forceCurrency,
        userLocale: locale,

        generationSource: 'admin_portal',
        isPreview: isPreview
      };

      const result = await generateInvoicePDF(invoiceGenerationData);
      pdfAttachment = result.pdfBase64;

    } catch (pdfError: any) {
      console.error('Failed to generate reminder PDF:', pdfError);
      console.error('PDF Error stack:', pdfError.stack);
      // Continue without PDF - will send HTML email instead
    }

    // Load email content translations from JSON files
    const emailTranslations = loadEmailTranslations(locale);
    const reminderEmail = emailTranslations.payment_reminder || {};
    const signatures = emailTranslations.signatures || {};

    // Get signature based on sender (defaults to Aline Sullivan for payment reminders)
    const senderEmail = requestData.freeformSender || 'aline.sullivan@fasemga.com';
    const senderSignatureMap: Record<string, string> = {
      'william.pitt@fasemga.com': 'william_pitt',
      'aline.sullivan@fasemga.com': 'aline_sullivan',
      'admin@fasemga.com': 'admin_team',
      'info@fasemga.com': 'info_team',
      'media@fasemga.com': 'media_team'
    };

    const signatureKey = senderSignatureMap[senderEmail] || 'aline_sullivan';
    const signature = signatures[signatureKey] || signatures['aline_sullivan'] || {
      regards: 'Best regards,',
      name: 'Aline Sullivan',
      title: 'Chief Operating Officer, FASE'
    };

    // Apply template variable replacements with gender-aware content
    const genderSuffix = testData.gender === 'f' ? '_f' : '_m';
    const genderAwareDear = reminderEmail[`dear${genderSuffix}`] || reminderEmail.dear || "Dear";
    const genderAwareSubject = reminderEmail[`subject${genderSuffix}`] || reminderEmail.subject || "FASE Membership - Invoice Reminder";
    const genderAwareGreeting = reminderEmail[`greeting${genderSuffix}`] || reminderEmail.greeting || "FASE Membership - Invoice Reminder";
    const genderAwareReminderText = reminderEmail[`reminder_text${genderSuffix}`] || reminderEmail.reminder_text || "Following your membership application for {organizationName} on {applicationDate}, please find attached your updated invoice.";

    // Format application date for display
    // Handle Firestore timestamps (objects with _seconds) or ISO strings
    let formattedApplicationDate = '';
    if (testData.applicationDate) {
      let appDate: Date;
      if (typeof testData.applicationDate === 'object' && testData.applicationDate._seconds) {
        // Firestore Timestamp object
        appDate = new Date(testData.applicationDate._seconds * 1000);
      } else if (typeof testData.applicationDate === 'object' && testData.applicationDate.seconds) {
        // Firestore Timestamp (without underscore)
        appDate = new Date(testData.applicationDate.seconds * 1000);
      } else {
        // ISO string or other date format
        appDate = new Date(testData.applicationDate);
      }
      if (!isNaN(appDate.getTime())) {
        formattedApplicationDate = appDate.toLocaleDateString(locale === 'en' ? 'en-GB' : locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    }

    // Build payment text with converted currency
    let paymentAmountText;
    if (currencyConversion.convertedCurrency === 'EUR') {
      paymentAmountText = `€${testData.totalAmount}`;
    } else {
      const convertedSymbol = getCurrencySymbol(currencyConversion.convertedCurrency);
      paymentAmountText = `${convertedSymbol}${currencyConversion.roundedAmount}`;
    }

    let emailContent = {
      subject: genderAwareSubject,
      greeting: genderAwareGreeting,
      dear: genderAwareDear,
      reminderText: genderAwareReminderText
        .replace('{organizationName}', testData.organizationName)
        .replace('{applicationDate}', formattedApplicationDate),
      paymentText: (reminderEmail.payment_text || "The membership fee of €{totalAmount} is payable by bank transfer. Full payment details are provided in the attached invoice.").replace('€{totalAmount}', paymentAmountText).replace('{totalAmount}', testData.totalAmount.toString()),
      bankDetailsNote: reminderEmail.bank_details_note ?? "Please note, our bank account details have recently changed. The current details are set out in the attached invoice.",
      accessText: reminderEmail.access_text || "Once payment is received, you'll receive access to the FASE member portal and our logo for your marketing materials. We'll also provide instructions for adding your company to our member directory. We look forward to welcoming you to FASE.",
      contactText: reminderEmail.contact_text || "If you have any questions, please don't hesitate to contact me.",
      regards: signature.regards,
      signature: signature.name,
      title: signature.title
    };

    // Apply customizations if provided
    if (requestData.customizedEmailContent) {
      const customContent = requestData.customizedEmailContent;

      emailContent = {
        subject: customContent[`subject${genderSuffix}`] || customContent.subject || emailContent.subject,
        greeting: customContent[`greeting${genderSuffix}`] || customContent.greeting || emailContent.greeting,
        dear: customContent[`dear${genderSuffix}`] || customContent.dear || emailContent.dear,
        reminderText: (customContent[`reminder_text${genderSuffix}`] || customContent.reminder_text || reminderEmail.reminder_text || emailContent.reminderText)
          .replace('{organizationName}', testData.organizationName)
          .replace('{applicationDate}', formattedApplicationDate),
        paymentText: (customContent.payment_text || reminderEmail.payment_text || emailContent.paymentText).replace('{totalAmount}', paymentAmountText).replace('€{totalAmount}', paymentAmountText),
        bankDetailsNote: customContent.bank_details_note ?? emailContent.bankDetailsNote,
        accessText: customContent.access_text || emailContent.accessText,
        contactText: customContent.contact_text || emailContent.contactText,
        regards: customContent.regards || emailContent.regards,
        signature: customContent.signature || emailContent.signature,
        title: customContent.title || emailContent.title
      };
    }

    const emailData = {
      email: testData.email,
      cc: requestData.cc,
      subject: emailContent.subject,
      invoiceHTML: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
            </div>
            <h2 style="color: #2D5574; margin: 0 0 20px 0; font-size: 20px;">${emailContent.greeting}</h2>

            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.dear} ${testData.greeting},
            </p>

            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.reminderText}
            </p>

            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.paymentText}
            </p>

            ${emailContent.bankDetailsNote ? `<p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">${emailContent.bankDetailsNote}</p>` : ''}

            <div style="text-align: center; margin: 25px 0;">
              <a href="${paymentLink}" style="display: inline-block; background-color: #2D5574; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 500;">Pay Online</a>
            </div>

            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.accessText}
            </p>

            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.contactText}
            </p>

            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>${emailContent.signature}</strong><br>
              ${emailContent.title ? `${emailContent.title}<br>` : ''}
              <a href="mailto:${senderEmail}" style="color: #2D5574;">${senderEmail}</a>
            </p>
          </div>
        </div>
      `,
      organizationName: testData.organizationName,
      totalAmount: testData.totalAmount.toString(),
      // Add PDF attachment if generated successfully
      ...(pdfAttachment && {
        pdfAttachment: pdfAttachment,
        pdfFilename: `FASE-Invoice-${reminderNumber}.pdf`
      })
    };

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      const pdfPreviewUrl = pdfAttachment ? `data:application/pdf;base64,${pdfAttachment}` : null;

      return NextResponse.json({
        success: true,
        preview: true,
        to: testData.email,
        cc: requestData.cc || null,
        subject: emailContent.subject,
        htmlContent: emailData.invoiceHTML,
        textContent: null,
        pdfUrl: pdfPreviewUrl,
        attachments: pdfAttachment ? ['Generated Invoice PDF'] : [],
        totalAmount: testData.totalAmount,
        invoiceNumber: reminderNumber
      });
    }

    // Send email using Resend API
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    try {
      console.log('Sending payment reminder email via Resend...');

      // Prepare PDF attachment for Resend if available
      const resendAttachments = [];
      if (pdfAttachment) {
        resendAttachments.push({
          filename: `FASE-Invoice-${reminderNumber}.pdf`,
          content: Array.from(Buffer.from(pdfAttachment, 'base64'))
        });
      }

      // Map sender email to proper from address
      const senderMap: Record<string, string> = {
        'admin@fasemga.com': 'FASE Admin <admin@fasemga.com>',
        'aline.sullivan@fasemga.com': 'Aline Sullivan <aline.sullivan@fasemga.com>',
        'william.pitt@fasemga.com': 'William Pitt <william.pitt@fasemga.com>',
        'info@fasemga.com': 'FASE Info <info@fasemga.com>',
        'media@fasemga.com': 'FASE Media <media@fasemga.com>'
      };

      const emailPayload: any = {
        from: senderMap[senderEmail] || senderMap['aline.sullivan@fasemga.com'],
        to: emailData.email,
        subject: emailData.subject,
        html: emailData.invoiceHTML,
        attachments: resendAttachments
      };

      if (emailData.cc) {
        emailPayload.cc = emailData.cc;
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

      const result = await response.json();
      console.log(`✅ Payment reminder email sent to ${emailData.email} via Resend:`, result.id);

      // Store PDF in Firebase Storage
      let pdfUrl: string | undefined;
      try {
        if (pdfAttachment) {
          const uploadResult = await uploadInvoicePDF(
            pdfAttachment,
            reminderNumber,
            testData.organizationName
          );
          pdfUrl = uploadResult.downloadURL;
          console.log('✅ Reminder PDF stored:', pdfUrl);
        }
      } catch (storageError) {
        console.error('❌ Failed to store PDF:', storageError);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment reminder email sent successfully',
        emailId: result.id,
        totalAmount: testData.totalAmount,
        pdfUrl,
        invoiceNumber: reminderNumber
      });
    } catch (emailError: any) {
      console.error('Failed to send payment reminder email via Resend:', emailError);
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

  } catch (error: any) {
    console.error('Payment reminder function call failed:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
