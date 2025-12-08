import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { convertCurrency, getWiseBankDetails, getCurrencySymbol } from '../../../lib/currency-conversion';

// Load email translations from JSON files
function loadEmailTranslations(language: string): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'email.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileContent);
    return parsed;
  } catch (error) {
    console.log('Error loading translation file:', error);
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
    const requestData = await request.json();
    
    // Validate required fields
    const requiredFields = ['email', 'organizationName', 'invoiceNumber'];
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!requestData[field] || requestData[field].trim() === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const invoiceData = {
      email: requestData.email,
      organizationName: requestData.organizationName,
      invoiceNumber: requestData.invoiceNumber,
      greeting: requestData.greeting || requestData.fullName || 'Client',
      gender: requestData.gender || 'm',
      totalAmount: requestData.totalAmount || 0,
      fullName: requestData.greeting || requestData.fullName || 'Client',
      address: requestData.address || {
        line1: 'Not provided',
        line2: '',
        city: 'Not provided',
        postcode: 'Not provided',
        country: requestData.country || 'Netherlands'
      },
      originalAmount: requestData.originalAmount || requestData.totalAmount || 0,
      discountAmount: 0,
      discountReason: ""
    };

    // Check if this is a preview request
    const isPreview = requestData.preview === true;
    
    // Detect language for email content
    const userLocale = requestData.userLocale || requestData.locale || requestData.language || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';
    
    // Load email content translations from JSON files
    const emailTranslations = loadEmailTranslations(locale);
    const invoiceEmail = emailTranslations.invoice_delivery || {};
    
    // Apply template variable replacements with gender-aware content
    const genderSuffix = invoiceData.gender === 'f' ? '_f' : '_m';
    const genderAwareDear = invoiceEmail[`dear${genderSuffix}`] || invoiceEmail.dear;
    const genderAwareSubject = invoiceEmail[`subject${genderSuffix}`] || invoiceEmail.subject;
    
    const emailContent = {
      subject: genderAwareSubject?.replace('{invoiceNumber}', invoiceData.invoiceNumber) || `Invoice ${invoiceData.invoiceNumber}`,
      dear: genderAwareDear || 'Dear',
      deliveredText: invoiceEmail.delivered_text?.replace('{organizationName}', invoiceData.organizationName) || `Your invoice for ${invoiceData.organizationName} has been delivered.`,
      instructionsText: invoiceEmail.instructions_text || 'Please follow the payment instructions included in the attached PDF.',
      contactText: invoiceEmail.contact_text || 'If you have any questions, please contact us at admin@fasemga.com',
      regards: invoiceEmail.regards || 'Best regards,',
      signature: invoiceEmail.signature || 'The FASE Team'
    };

    // Convert currency based on customer country, or use amount as-is if forceCurrency matches
    let currencyConversion;
    if (requestData.forceCurrency && requestData.forceCurrency !== 'EUR' && requestData.originalAmount) {
      // Amount is already converted, use originalAmount for base and totalAmount for converted
      currencyConversion = {
        originalAmount: requestData.originalAmount,
        originalCurrency: 'EUR',
        convertedAmount: invoiceData.totalAmount,
        convertedCurrency: requestData.forceCurrency,
        roundedAmount: invoiceData.totalAmount,
        exchangeRate: invoiceData.totalAmount / requestData.originalAmount,
        displayText: `Converted from EUR using pre-calculated amount`
      };
    } else {
      currencyConversion = await convertCurrency(invoiceData.totalAmount, invoiceData.address.country, requestData.forceCurrency);
    }
    const wiseBankDetails = getWiseBankDetails(currencyConversion.convertedCurrency);
    
    console.log('💰 Currency conversion:', currencyConversion);

    // Generate PDF invoice with complete functionality from send-membership-invoice
    let pdfBase64 = requestData.pdfAttachment;
    
    if (!pdfBase64) {
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
      
      // Currency formatting functions
      const formatEuro = (amount: number) => `€ ${amount}`;
      const formatCurrency = (amount: number, currency: string) => {
        const symbols: Record<string, string> = { 'EUR': '€', 'USD': '$', 'GBP': '£' };
        return `${symbols[currency] || currency} ${amount}`;
      };
      
      // Load PDF text translations from JSON files
      const translations = loadEmailTranslations(locale);
      const pdfTexts = {
        invoice: 'INVOICE', // Always use INVOICE for all types including lost invoices
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
      const dateLocales = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', nl: 'nl-NL' };
      const dateLocale = dateLocales[locale as keyof typeof dateLocales] || 'en-GB';
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
      firstPage.drawText(`${pdfTexts.invoiceNumber} ${invoiceData.invoiceNumber}`, {
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
        
        firstPage.drawText(`-${formatEuro(invoiceData.discountAmount)}`, {
          x: colX[3] + 10,
          y: currentY - 15,
          size: 10,
          font: bodyFont,
          color: discountGreen,
        });
      }
      
      currentY -= sectionGap + 20;
      
      // TOTAL SECTION - Expanded for dual currency display
      const totalSectionWidth = 320; // Expanded width for dual currency
      const totalX = width - margins.right - totalSectionWidth;
      const fixedGapBetweenTextAndAmount = 15; // Smaller gap for more space
      
      // Determine section height based on whether currency conversion is needed
      const sectionHeight = currencyConversion.convertedCurrency === 'EUR' ? 35 : 55;
      
      firstPage.drawRectangle({
        x: totalX,
        y: currentY - sectionHeight,
        width: totalSectionWidth,
        height: sectionHeight,
        borderColor: faseNavy,
        borderWidth: 2,
      });
      
      const labelX = totalX + 15;
      
      if (currencyConversion.convertedCurrency === 'EUR') {
        // EUR only - single line display
        firstPage.drawText(pdfTexts.totalAmountDue, {
          x: labelX,
          y: currentY - 22,
          size: 12,
          font: boldFont,
          color: faseNavy,
        });
        
        const textWidth = boldFont.widthOfTextAtSize(pdfTexts.totalAmountDue, 12);
        const amountX = labelX + textWidth + fixedGapBetweenTextAndAmount;
        
        firstPage.drawText(formatEuro(invoiceData.totalAmount), {
          x: amountX,
          y: currentY - 22,
          size: 13,
          font: boldFont,
          color: faseNavy,
        });
      } else {
        // Dual currency display
        firstPage.drawText('Base Amount (EUR):', {
          x: labelX,
          y: currentY - 18,
          size: 11,
          font: bodyFont,
          color: faseNavy,
        });
        
        firstPage.drawText(formatEuro(invoiceData.totalAmount), {
          x: labelX + 130,
          y: currentY - 18,
          size: 11,
          font: bodyFont,
          color: faseNavy,
        });
        
        firstPage.drawText(pdfTexts.totalAmountDue, {
          x: labelX,
          y: currentY - 38,
          size: 12,
          font: boldFont,
          color: faseNavy,
        });
        
        firstPage.drawText(formatCurrency(currencyConversion.roundedAmount, currencyConversion.convertedCurrency), {
          x: labelX + 130,
          y: currentY - 38,
          size: 13,
          font: boldFont,
          color: faseNavy,
        });
      }
      
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
      
      // Load payment instructions from translations
      const invoiceT = translations.pdf_invoice || {};
      
      // Currency-specific bank details from Wise
      if (!wiseBankDetails) {
        throw new Error('Wise bank details not available for regular invoices');
      }
      
      const paymentLines = [
        `${invoiceT.reference || 'Reference'}: ${wiseBankDetails.reference}`,
        `${invoiceT.account_holder || 'Account holder'}: ${wiseBankDetails.accountHolder}`,
      ];
      
      // Add currency-specific payment details
      switch (currencyConversion.convertedCurrency) {
        case 'USD':
          paymentLines.push(
            `ACH and Wire routing number: ${wiseBankDetails.routingNumber}`,
            `Account number: ${wiseBankDetails.accountNumber}`,
            `Account type: ${wiseBankDetails.accountType}`
          );
          break;
        case 'GBP':
          paymentLines.push(
            `Sort code: ${wiseBankDetails.sortCode}`,
            `Account number: ${wiseBankDetails.accountNumber}`,
            `IBAN: ${wiseBankDetails.iban}`
          );
          break;
        case 'EUR':
        default:
          paymentLines.push(
            `BIC: ${wiseBankDetails.bic}`,
            `IBAN: ${wiseBankDetails.iban}`
          );
          break;
      }
      
      paymentLines.push(
        '',
        `${invoiceT.bank_name_address || 'Bank name and address'}:`,
        wiseBankDetails.bankName,
        ...wiseBankDetails.address
      );
      
      paymentLines.forEach((line, index) => {
        firstPage.drawText(line, {
          x: margins.left,
          y: currentY - 50 - (index * standardLineHeight),
          size: 10,
          font: bodyFont,
          color: faseBlack,
        });
      });
      
      // Generate PDF bytes and convert to base64
      const pdfBytes = await pdfDoc.save();
      pdfBase64 = Buffer.from(pdfBytes).toString('base64');
      console.log('PDF generated successfully, size:', pdfBytes.length);
    }

    const emailData = {
      email: invoiceData.email,
      cc: requestData.cc,
      subject: emailContent.subject,
      invoiceHTML: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
            </div>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.dear} ${invoiceData.greeting},
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.deliveredText}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
              ${emailContent.instructionsText}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
              ${emailContent.contactText}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>${emailContent.signature}</strong>
            </p>
          </div>
        </div>
      `,
      invoiceNumber: invoiceData.invoiceNumber,
      organizationName: invoiceData.organizationName,
      totalAmount: invoiceData.totalAmount.toString(),
      pdfAttachment: pdfBase64,
      pdfFilename: requestData.pdfFilename || `Invoice-${invoiceData.invoiceNumber}.pdf`
    };

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        to: invoiceData.email,
        cc: requestData.cc || null,
        subject: emailContent.subject,
        htmlContent: emailData.invoiceHTML,
        textContent: null,
        attachments: [{ filename: emailData.pdfFilename, type: 'application/pdf' }],
        invoiceNumber: invoiceData.invoiceNumber
      });
    }

    // Call Firebase Function directly via HTTP for actual sending
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
    console.log('✅ Invoice delivery email sent successfully:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Invoice delivery email sent successfully',
      result: result
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