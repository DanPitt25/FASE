import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

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
    const filePath = path.join(process.cwd(), 'functions', 'messages', language, 'email.json');
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
    // Read data from request body instead of hardcoded values
    const requestData = await request.json();
    const invoiceData = {
      email: requestData.email || "danielhpitt@gmail.com",
      fullName: requestData.fullName || "Daniel Pitt", 
      organizationName: requestData.organizationName || "Sample Organization Ltd",
      totalAmount: requestData.totalAmount || 1500,
      userId: requestData.userId || "user-123",
      membershipType: requestData.membershipType || "corporate",
      organizationType: requestData.organizationType || "MGA",
      grossWrittenPremiums: requestData.grossWrittenPremiums || "10-20m",
      hasOtherAssociations: requestData.hasOtherAssociations || false,
      greeting: requestData.greeting || requestData.fullName || "Daniel Pitt",
      gender: requestData.gender || "m", // "m" for masculine, "f" for feminine
      originalAmount: requestData.originalAmount || 1500,
      discountAmount: requestData.discountAmount || 0,
      discountReason: requestData.discountReason || "",
      address: requestData.address
    };

    // Validate required basic fields
    const requiredBasicFields = ['email', 'fullName', 'organizationName'];
    const missingBasicFields = [];
    
    for (const field of requiredBasicFields) {
      if (!invoiceData[field as keyof typeof invoiceData] || invoiceData[field as keyof typeof invoiceData].trim() === '') {
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
    if (!invoiceData.address || typeof invoiceData.address !== 'object') {
      return NextResponse.json(
        { error: 'Address object is required' },
        { status: 400 }
      );
    }

    const requiredAddressFields = ['line1', 'city', 'postcode', 'country'];
    const missingAddressFields = [];
    
    for (const field of requiredAddressFields) {
      if (!invoiceData.address[field] || invoiceData.address[field].trim() === '') {
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
      console.log(`Generating email preview for ${invoiceData.email}...`, invoiceData);
    } else {
      console.log(`Sending membership acceptance email to ${invoiceData.email}...`, invoiceData);
    }
    
    // Generate 5-digit invoice number
    const invoiceNumber = "FASE-" + Math.floor(10000 + Math.random() * 90000);
    
    // Create Stripe checkout session for payment
    const stripeInstance = initializeStripe();
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    const session = await stripeInstance.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `FASE Membership Invoice ${invoiceNumber}`,
              description: `Payment for ${invoiceData.organizationName} membership`,
            },
            unit_amount: invoiceData.totalAmount * 100, // Convert euros to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_number: invoiceNumber,
        organization_name: invoiceData.organizationName,
        organization_type: invoiceData.organizationType || 'individual',
        membership_type: invoiceData.membershipType,
        user_id: invoiceData.userId || '',
        user_email: invoiceData.email,
      },
      success_url: `${baseUrl}/payment-succeeded?session_id={CHECKOUT_SESSION_ID}&invoice=${invoiceNumber}`,
      cancel_url: `${baseUrl}/payment-failed?invoice=${invoiceNumber}`,
      customer_email: invoiceData.email,
    });

    const stripeLink = session.url;
    
    console.log('✅ Stripe payment link generated:', stripeLink);
    
    // Detect language for PDF generation
    const userLocale = requestData.userLocale || requestData.locale || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';

    // Generate branded PDF invoice using the existing logic
    let pdfAttachment: string | null = null;
    try {
      console.log('Generating branded invoice PDF...');
      
      // Load the cleaned letterhead template
      const letterheadPath = path.join(process.cwd(), 'cleanedpdf.pdf');
      const letterheadBytes = fs.readFileSync(letterheadPath);
      const pdfDoc = await PDFDocument.load(letterheadBytes);
      
      // Get the first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Embed fonts - using brand fonts (exactly like working script)
      const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // FASE Brand Colors
      const faseNavy = rgb(0.176, 0.333, 0.455);      // #2D5574
      const faseBlack = rgb(0.137, 0.122, 0.125);     // #231F20
      const faseOrange = rgb(0.706, 0.416, 0.200);    // #B46A33
      const faseCream = rgb(0.922, 0.910, 0.894);     // #EBE8E4
      
      // STANDARD 8.5x11 INVOICE LAYOUT with proper spacing
      const margins = { left: 50, right: 50, top: 150, bottom: 80 };
      const contentWidth = width - margins.left - margins.right;
      const standardLineHeight = 18;
      const sectionGap = 25;
      
      // Helper function
      const formatEuro = (amount: number) => `€ ${amount}`;
      
      // Load PDF text translations from JSON files
      const translations = loadEmailTranslations(locale);
      const pdfTexts = {
        invoice: translations.pdf_invoice?.invoice || 'INVOICE',
        billTo: translations.pdf_invoice?.bill_to || 'Bill To:',
        invoiceNumber: translations.pdf_invoice?.invoice_number || 'Invoice #:',
        date: translations.pdf_invoice?.date || 'Date:',
        terms: translations.pdf_invoice?.terms || 'Terms: Payment upon receipt',
        description: translations.pdf_invoice?.description || 'Description',
        quantity: translations.pdf_invoice?.quantity || 'Qty',
        unitPrice: translations.pdf_invoice?.unit_price || 'Unit Price',
        total: translations.pdf_invoice?.total || 'Total',
        totalAmountDue: translations.pdf_invoice?.total_amount_due || 'Total Amount Due:',
        paymentInstructions: translations.pdf_invoice?.payment_instructions || 'Payment Instructions:'
      };

      // Current date and due date
      const dateLocales = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT' };
      const dateLocale = dateLocales[locale as keyof typeof dateLocales];
      const currentDate = new Date().toLocaleDateString(dateLocale);
      
      // INVOICE HEADER SECTION (starts 150pt from top to avoid letterhead)
      let currentY = height - margins.top;
      
      firstPage.drawText(pdfTexts.invoice, {
        x: margins.left,
        y: currentY,
        size: 18,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 50; // Space after main header
      
      // BILL TO and INVOICE DETAILS on same line
      firstPage.drawText(pdfTexts.billTo, {
        x: margins.left,
        y: currentY,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      // Invoice details (right-aligned)
      const invoiceDetailsX = width - margins.right - 150;
      firstPage.drawText(`${pdfTexts.invoiceNumber} ${invoiceNumber}`, {
        x: invoiceDetailsX,
        y: currentY,
        size: 11,
        font: boldFont,
        color: faseBlack,
      });
      
      firstPage.drawText(`${pdfTexts.date} ${currentDate}`, {
        x: invoiceDetailsX,
        y: currentY - 16,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      
      firstPage.drawText(pdfTexts.terms, {
        x: invoiceDetailsX,
        y: currentY - 32,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText('VAT Number Pending', {
        x: invoiceDetailsX,
        y: currentY - 48,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      currentY -= 20;
      const billToLines = [
        invoiceData.organizationName,
        invoiceData.fullName,
        invoiceData.address.line1,
        ...(invoiceData.address.line2 ? [invoiceData.address.line2] : []),
        `${invoiceData.address.city}, ${invoiceData.address.postcode}`,
        invoiceData.address.country
      ].filter(line => line && line.trim() !== '');
      
      billToLines.forEach((line, index) => {
        firstPage.drawText(line, {
          x: margins.left,
          y: currentY - (index * standardLineHeight),
          size: 10,
          font: index === 0 ? boldFont : bodyFont,
          color: faseBlack,
        });
      });
      
      currentY -= (billToLines.length * standardLineHeight) + sectionGap;
      
      // INVOICE TABLE
      const rowHeight = 35;
      const tableY = currentY;
      const colWidths = [280, 60, 80, 80];
      const colX = [
        margins.left,
        margins.left + colWidths[0],
        margins.left + colWidths[0] + colWidths[1],
        margins.left + colWidths[0] + colWidths[1] + colWidths[2]
      ];
      
      // Table header background
      firstPage.drawRectangle({
        x: margins.left,
        y: tableY - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: faseCream,
      });
      
      // Table headers
      const headers = [pdfTexts.description, pdfTexts.quantity, pdfTexts.unitPrice, pdfTexts.total];
      headers.forEach((header, i) => {
        firstPage.drawText(header, {
          x: colX[i] + 10,
          y: tableY - 20,
          size: 11,
          font: boldFont,
          color: faseNavy,
        });
      });
      
      currentY -= rowHeight;
      
      // Invoice item row - Membership
      firstPage.drawText('FASE Annual Membership', {
        x: colX[0] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: faseBlack,
        maxWidth: colWidths[0] - 20,
      });
      
      firstPage.drawText('1', {
        x: colX[1] + 25,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(formatEuro(invoiceData.originalAmount), {
        x: colX[2] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(formatEuro(invoiceData.originalAmount), {
        x: colX[3] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      // Add discount row if applicable
      if (invoiceData.discountAmount > 0) {
        currentY -= rowHeight;
        
        // Define green color for discount
        const discountGreen = rgb(0.0, 0.6, 0.0); // Dark green
        
        firstPage.drawText(invoiceData.discountReason || 'Association Member Discount', {
          x: colX[0] + 10,
          y: currentY - 15,
          size: 10,
          font: bodyFont,
          color: discountGreen,
          maxWidth: colWidths[0] - 20,
        });
        
        // Skip quantity and unit price columns for discount
        
        firstPage.drawText(`-${formatEuro(invoiceData.discountAmount)}`, {
          x: colX[3] + 10,
          y: currentY - 15,
          size: 10,
          font: bodyFont,
          color: discountGreen,
        });
      }
      
      currentY -= sectionGap + 20;
      
      // TOTAL SECTION
      const totalSectionWidth = 240; // Increased width to accommodate longer text
      const totalX = width - margins.right - totalSectionWidth;
      const fixedGapBetweenTextAndAmount = 20; // Fixed 20px gap between text and amount
      
      firstPage.drawRectangle({
        x: totalX,
        y: currentY - 35,
        width: totalSectionWidth,
        height: 35,
        borderColor: faseNavy,
        borderWidth: 2,
      });
      
      // Draw the label text
      const labelX = totalX + 15;
      firstPage.drawText(pdfTexts.totalAmountDue, {
        x: labelX,
        y: currentY - 22,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      // Calculate text width to position amount with fixed gap
      const textWidth = boldFont.widthOfTextAtSize(pdfTexts.totalAmountDue, 12);
      const amountX = labelX + textWidth + fixedGapBetweenTextAndAmount;
      
      firstPage.drawText(formatEuro(invoiceData.totalAmount), {
        x: amountX,
        y: currentY - 22,
        size: 13,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 60;
      
      // PAYMENT INSTRUCTIONS - Bottom section with tasteful separation line
      firstPage.drawLine({
        start: { x: margins.left, y: currentY - 10 },
        end: { x: width - margins.right, y: currentY - 10 },
        thickness: 1,
        color: faseNavy,
      });
      
      firstPage.drawText(pdfTexts.paymentInstructions, {
        x: margins.left,
        y: currentY - 30,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      // Eurozone country detection (ISO 3166-1 alpha-2 codes)
      const eurozoneCountries = [
        'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 
        'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR'
      ];
      
      // Determine if customer is in Eurozone based on country code
      const isEurozone = invoiceData.address.country && eurozoneCountries.includes(invoiceData.address.country.toUpperCase());
      
      // Load payment instructions from translations
      const invoiceT = translations.pdf_invoice || {};
      
      // Bank details (same for both Eurozone and International)
      const paymentLines = [
        `${invoiceT.reference || 'Reference'}: ${invoiceNumber}`,
        `${invoiceT.account_holder || 'Account holder'}: FASE B.V.`,
        `${isEurozone ? (invoiceT.bic || 'BIC') : (invoiceT.swift_bic || 'Swift/BIC')}: TRWIBEB1XXX`,
        `${invoiceT.iban || 'IBAN'}: BE90 9057 9070 7732`,
        '',
        `${invoiceT.bank_name_address || 'Bank name and address'}:`,
        'Wise',
        'Rue du Trône 100, 3rd floor',
        'Brussels, 1050, Belgium'
      ];
      
      paymentLines.forEach((line, index) => {
        firstPage.drawText(line, {
          x: margins.left,
          y: currentY - 50 - (index * standardLineHeight),
          size: 10,
          font: bodyFont,
          color: faseBlack,
        });
      });
      
      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      pdfAttachment = Buffer.from(pdfBytes).toString('base64');
      console.log('PDF generated successfully, size:', pdfBytes.length);
      
    } catch (pdfError: any) {
      console.error('Failed to generate branded PDF:', pdfError);
      console.error('PDF Error stack:', pdfError.stack);
      // Continue without PDF - will send HTML email instead
    }
    
    // Load email content translations from JSON files
    const emailTranslations = loadEmailTranslations(locale);
    const adminEmail = emailTranslations.membership_acceptance_admin || {};
    
    // Apply template variable replacements with gender-aware content
    const genderSuffix = invoiceData.gender === 'f' ? '_f' : '_m';
    const genderAwareDear = adminEmail[`dear${genderSuffix}`] || adminEmail.dear;
    const genderAwareSubject = adminEmail[`subject${genderSuffix}`] || adminEmail.subject;
    const genderAwareWelcome = adminEmail[`welcome${genderSuffix}`] || adminEmail.welcome;
    const genderAwareWelcomeText = adminEmail[`welcome_text${genderSuffix}`] || adminEmail.welcome_text;
    
    const emailContent = {
      subject: genderAwareSubject,
      welcome: genderAwareWelcome,
      dear: genderAwareDear,
      welcomeText: genderAwareWelcomeText.replace('{organizationName}', `<strong>${invoiceData.organizationName}</strong>`),
      paymentText: adminEmail.payment_text.replace('{totalAmount}', invoiceData.totalAmount.toString()),
      paymentButton: adminEmail.payment_button,
      bankTransferText: adminEmail.bank_transfer_text,
      bankTransferLink: adminEmail.bank_transfer_link, 
      engagement: adminEmail.engagement,
      regards: adminEmail.regards,
      signature: adminEmail.signature,
      title: adminEmail.title
    };

    const emailData = {
      email: invoiceData.email,
      cc: requestData.cc, // Add CC support
      subject: emailContent.subject,
      invoiceHTML: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
            </div>
            <h2 style="color: #2D5574; margin: 0 0 20px 0; font-size: 20px;">${emailContent.welcome}</h2>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.dear} ${invoiceData.greeting},
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.welcomeText}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
              ${emailContent.paymentText}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${stripeLink}" style="display: inline-block; background-color: #2D5574; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">${emailContent.paymentButton}</a>
            </div>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 10px 0;">
              ${emailContent.bankTransferText
                .replace('{LINK}', `<a href="${baseUrl}/bank-transfer-invoice?userId=${invoiceData.userId}&amount=${invoiceData.totalAmount}&orgName=${encodeURIComponent(invoiceData.organizationName)}" style="color: #2D5574; text-decoration: underline;">`)
                .replace('{/LINK}', '</a>')}.
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
              ${emailContent.engagement}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>Aline</strong><br><br>
              Aline Sullivan<br>
              Chief Operating Officer, FASE<br>
              <a href="mailto:aline.sullivan@fasemga.com" style="color: #2D5574;">aline.sullivan@fasemga.com</a>
            </p>
          </div>
        </div>
      `,
      invoiceNumber: invoiceNumber,
      organizationName: invoiceData.organizationName,
      totalAmount: invoiceData.totalAmount.toString()
      // PDF attachment removed - invoice available via bank transfer page only
    };

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      // Create a temporary PDF file URL for preview (in production, you'd generate and store it temporarily)
      const pdfPreviewUrl = pdfAttachment ? `data:application/pdf;base64,${pdfAttachment}` : null;
      
      return NextResponse.json({
        success: true,
        preview: true,
        to: invoiceData.email,
        cc: requestData.cc || null,
        subject: emailContent.subject,
        htmlContent: emailData.invoiceHTML,
        textContent: null, // Could add plain text version
        pdfUrl: pdfPreviewUrl,
        attachments: [], // No PDF attachments in email
        invoiceNumber: invoiceNumber,
        totalAmount: invoiceData.totalAmount,
        stripeLink: stripeLink
      });
    }

    // Call Firebase Function directly via HTTP (server-side) for actual sending
    const response = await fetch(`https://us-central1-fase-site.cloudfunctions.net/sendInvoiceEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: emailData
      }),
    });

    if (!response.ok) {
      throw new Error(`Firebase Function error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Membership acceptance email sent successfully:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Membership invoice email sent successfully with Stripe payment link',
      result: result,
      stripeLink: stripeLink
    });

  } catch (error: any) {
    console.error('Function call failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}