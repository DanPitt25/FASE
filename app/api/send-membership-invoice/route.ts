import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { convertCurrency, getWiseBankDetails, getCurrencySymbol } from '../../../lib/currency-conversion';
import { createInvoiceRecord } from '../../../lib/firestore';

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
    
    // Determine lost invoice flag early for currency conversion logic
    const isLostInvoice = requestData.isLostInvoice || false;
    
    // Convert currency based on customer country (with optional override) - skip for lost invoices (old style)
    let currencyConversion, wiseBankDetails;
    if (isLostInvoice) {
      // Lost invoices use old style - no currency conversion, EUR only
      currencyConversion = {
        convertedCurrency: 'EUR',
        roundedAmount: invoiceData.totalAmount,
        conversionRate: 1
      };
      wiseBankDetails = null; // Will use Lexicon Associates details instead
    } else {
      currencyConversion = await convertCurrency(invoiceData.totalAmount, invoiceData.address.country, requestData.forceCurrency);
      wiseBankDetails = getWiseBankDetails(currencyConversion.convertedCurrency);
    }
    
    console.log('💰 Currency conversion:', currencyConversion);
    
    // Create payment link with amount and PayPal email (can be different from recipient email)
    const paypalEmail = requestData.paypalEmail || invoiceData.email; // Use separate PayPal email if provided
    const paypalParams = new URLSearchParams({
      amount: invoiceData.totalAmount.toString(),
      email: paypalEmail,
      organization: invoiceData.organizationName
    });
    const paypalLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com'}/payment?${paypalParams.toString()}`;
    
    console.log('✅ Payment link generated:', paypalLink);
    
    // Detect language for PDF generation
    const userLocale = requestData.userLocale || 'en';
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
      
      // Use different bank details for lost invoices
      let paymentLines: string[];
      
      if (isLostInvoice) {
        // Lexicon Associates bank details for lost invoices
        paymentLines = [
          'Lexicon Associates',
          'Citibank, N.A.',
          'USCC CITISWEEP',
          '100 Citibank Drive',
          'San Antonio, TX 78245',
          'Account Number: 1255828998',
          'ABA: 221172610'
        ];
      } else {
        // Currency-specific bank details from Wise for regular invoices
        if (!wiseBankDetails) {
          throw new Error('Wise bank details not available for regular invoices');
        }
        
        paymentLines = [
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
      }
      
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
    
    // Determine email template type
    const template = requestData.template || 'invoice';
    
    // Load email content translations from JSON files
    const emailTranslations = loadEmailTranslations(locale);
    
    let emailContent: any;
    
    if (template === 'followup') {
      // Follow-up email template
      const followupEmail = emailTranslations.membership_followup || {};
      
      // Apply gender-aware content for follow-up
      const genderSuffix = invoiceData.gender === 'f' ? '_f' : '_m';
      const genderAwareDear = followupEmail[`dear${genderSuffix}`] || followupEmail.dear || "Dear {fullName},";
      
      emailContent = {
        subject: (followupEmail.subject || "Reminder: Outstanding membership dues for {organizationName}").replace('{organizationName}', invoiceData.organizationName),
        dear: genderAwareDear.replace('{fullName}', invoiceData.greeting || invoiceData.fullName),
        intro: (followupEmail.intro || "We have yet to receive settlement of {organizationName}'s member dues as a founder member of FASE. Please find attached our updated invoice.").replace('{organizationName}', invoiceData.organizationName),
        portalAccess: followupEmail.portal_access || "As soon as we receive payment, we will be happy to share details on how to access the resources contained in our members' portal.",
        questions: followupEmail.questions || "If you have any questions relating to your membership, please do not hesitate to contact us.",
        regards: followupEmail.regards || "Best regards,",
        signature: followupEmail.signature || "Aline Sullivan",
        title: followupEmail.title || "Chief Operating Officer",
        company: followupEmail.company || "FASE B.V.",
        address: followupEmail.address || "Herengracht 124-128\n1015 BT Amsterdam"
      };
    } else if (isLostInvoice) {
      // Lost invoice template using translations
      const lostInvoiceEmail = emailTranslations.lost_invoice || {};
      
      // Apply gender-aware content for lost invoice
      const genderSuffix = invoiceData.gender === 'f' ? '_f' : '_m';
      const genderAwareDear = lostInvoiceEmail[`dear${genderSuffix}`] || lostInvoiceEmail.dear || "Dear";
      
      // Format the custom invoice date
      const customInvoiceDate = requestData.invoiceDate || '2025-11-05';
      const formattedDate = new Date(customInvoiceDate).toLocaleDateString(locale, { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
      
      // Replace placeholder date in intro text with custom date
      const introText = (lostInvoiceEmail.intro_text || "I am writing to follow up on your membership dues for FASE (Fédération des Agences de Souscription Européennes), issued on {invoiceDate}, which remains outstanding. Please let me know the status of this payment.")
        .replace('{invoiceDate}', formattedDate);
      
      emailContent = {
        subject: lostInvoiceEmail.subject || "Outstanding Invoice for FASE",
        welcome: lostInvoiceEmail.welcome || "INVOICE",
        dear: genderAwareDear,
        welcomeText: introText,
        paymentText: lostInvoiceEmail.follow_up_text || "We look forward to activating your FASE membership, providing you with access to the member portal, and inviting you to our upcoming events. If you require any additional documentation or have questions that would assist in processing the payment, please feel free to reach out to me or simply contact admin@fasemga.com. We are now able to provide European banking details, so just let me know if you need those.",
        engagement: lostInvoiceEmail.closing_text || "Thank you for your time in addressing this. We appreciate your prompt response.",
        regards: lostInvoiceEmail.regards || "Best regards,",
        signature: lostInvoiceEmail.signature || "Aline Sullivan",
        title: lostInvoiceEmail.title || "Chief Operating Officer, FASE",
        email: lostInvoiceEmail.email || "aline.sullivan@fasemga.com"
      };
    } else {
      // Original invoice template
      const adminEmail = emailTranslations.membership_acceptance_admin || {};
      
      // Apply template variable replacements with gender-aware content
      const genderSuffix = invoiceData.gender === 'f' ? '_f' : '_m';
      const genderAwareDear = adminEmail[`dear${genderSuffix}`] || adminEmail.dear || "Dear";
      const genderAwareSubject = adminEmail[`subject${genderSuffix}`] || adminEmail.subject || "Welcome to FASE - Membership Approved";
      const genderAwareWelcome = adminEmail[`welcome${genderSuffix}`] || adminEmail.welcome || "Welcome to FASE";
      const genderAwareWelcomeText = adminEmail[`welcome_text${genderSuffix}`] || adminEmail.welcome_text || "Welcome to FASE. Your application for {organizationName} has been approved.";
    
      // Create payment text with currency conversion
      let paymentText = adminEmail.payment_text || "To complete your membership, please remit payment of {totalAmount} using one of the following methods:";
      
      // Replace the currency amount - handle both €{totalAmount} pattern and {totalAmount} pattern
      if (currencyConversion.convertedCurrency === 'EUR') {
        const eurAmount = `€${invoiceData.totalAmount}`;
        paymentText = paymentText.replace('€{totalAmount}', eurAmount).replace('{totalAmount}', eurAmount);
      } else {
        // Just show the converted amount
        const convertedSymbol = getCurrencySymbol(currencyConversion.convertedCurrency);
        const convertedAmount = `${convertedSymbol}${currencyConversion.roundedAmount}`;
        paymentText = paymentText.replace('€{totalAmount}', convertedAmount).replace('{totalAmount}', convertedAmount);
      }
      
      emailContent = {
        subject: genderAwareSubject,
        welcome: genderAwareWelcome,
        dear: genderAwareDear,
        welcomeText: genderAwareWelcomeText.replace('{organizationName}', `<strong>${invoiceData.organizationName}</strong>`),
        paymentText,
        paymentOptions: adminEmail.payment_options || "Payment Options:",
        paypalOption: adminEmail.paypal_option || "PayPal:",
        payOnline: adminEmail.pay_online || "Pay Online",
        bankTransfer: adminEmail.bank_transfer || "Bank Transfer:",
        invoiceAttached: adminEmail.invoice_attached || "Invoice attached with payment details",
        engagement: adminEmail.engagement || "We look forward to your engagement in FASE and we'll be in touch very shortly with a link to our member portal. In the interim, please contact admin@fasemga.com with any questions.",
        regards: adminEmail.regards || "Best regards,",
        signature: adminEmail.signature || "Aline Sullivan",
        title: adminEmail.title || "Chief Operating Officer, FASE"
      };
    }

    // Generate HTML based on template
    let invoiceHTML: string;
    
    if (template === 'followup') {
      // Follow-up email HTML
      invoiceHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
            </div>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.dear}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.intro}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
              ${emailContent.portalAccess}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
              ${emailContent.questions}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>${emailContent.signature}</strong><br>
              ${emailContent.title}<br>
              ${emailContent.company}<br><br>
              ${emailContent.address.replace('\n', '<br>')}
            </p>
          </div>
        </div>
      `;
    } else if (isLostInvoice) {
      // Lost invoice email HTML - specific format
      invoiceHTML = `
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
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
              ${emailContent.engagement}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
              ${emailContent.regards}<br><br>
              <strong>Aline</strong><br><br>
              ${emailContent.signature}<br>
              ${emailContent.title}<br>
              <a href="mailto:aline.sullivan@fasemga.com" style="color: #2D5574;">aline.sullivan@fasemga.com</a>
            </p>
          </div>
        </div>
      `;
    } else {
      // Original invoice email HTML
      invoiceHTML = `
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
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0;">
              <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${emailContent.paymentOptions}</h3>
              
              <p style="margin: 0 0 10px 0; font-size: 15px;">
                <strong>1. ${emailContent.paypalOption}</strong> <a href="${paypalLink}" style="color: #2D5574; text-decoration: none;">${emailContent.payOnline}</a>
              </p>
              
              <p style="margin: 0; font-size: 15px;">
                <strong>2. ${emailContent.bankTransfer}</strong> ${emailContent.invoiceAttached}
              </p>
            </div>
            
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
      `;
    }

    const emailData = {
      email: invoiceData.email,
      cc: requestData.cc, // Add CC support
      subject: emailContent.subject,
      invoiceHTML,
      invoiceNumber: invoiceNumber,
      organizationName: invoiceData.organizationName,
      totalAmount: invoiceData.totalAmount.toString(),
      // Add PDF attachment if generated successfully AND not a lost invoice (lost invoices reference previous invoices)
      ...(pdfAttachment && !isLostInvoice && {
        pdfAttachment: pdfAttachment,
        pdfFilename: `FASE-Invoice-${invoiceNumber}.pdf`
      }),
      // Add uploaded attachment for lost invoices (recovered invoice files)
      ...(isLostInvoice && requestData.uploadedAttachment && {
        pdfAttachment: requestData.uploadedAttachment,
        pdfFilename: requestData.uploadedFilename || 'recovered-invoice.pdf'
      })
    };

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      // Create a temporary file URL for preview
      let filePreviewUrl = null;
      let attachmentsList: string[] = [];
      
      if (pdfAttachment && !isLostInvoice) {
        // Generated PDF for regular invoices
        filePreviewUrl = `data:application/pdf;base64,${pdfAttachment}`;
        attachmentsList = ['Generated Invoice PDF'];
      } else if (isLostInvoice && requestData.uploadedAttachment) {
        // Uploaded file for lost invoices
        const mimeType = requestData.uploadedFilename?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
                        requestData.uploadedFilename?.toLowerCase().match(/\.(jpg|jpeg)$/) ? 'image/jpeg' :
                        requestData.uploadedFilename?.toLowerCase().endsWith('.png') ? 'image/png' : 'application/octet-stream';
        filePreviewUrl = `data:${mimeType};base64,${requestData.uploadedAttachment}`;
        attachmentsList = [requestData.uploadedFilename || 'Recovered Invoice'];
      }
      
      return NextResponse.json({
        success: true,
        preview: true,
        to: invoiceData.email,
        cc: requestData.cc || null,
        subject: emailContent.subject,
        htmlContent: emailData.invoiceHTML,
        textContent: null, // Could add plain text version
        pdfUrl: filePreviewUrl,
        attachments: attachmentsList,
        invoiceNumber: invoiceNumber,
        totalAmount: invoiceData.totalAmount
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
    
    // Log invoice to database after successful sending
    try {
      const invoiceType = template === 'followup' ? 'followup' : (isLostInvoice ? 'lost_invoice' : 'regular');
      await createInvoiceRecord({
        invoiceNumber,
        recipientEmail: invoiceData.email,
        recipientName: invoiceData.fullName,
        organizationName: invoiceData.organizationName,
        amount: invoiceData.totalAmount,
        currency: currencyConversion.convertedCurrency,
        type: invoiceType,
        status: 'sent',
        isLostInvoice,
        sentAt: new Date(),
        emailId: result.id || undefined,
        pdfGenerated: !!pdfAttachment
      });
      console.log('✅ Invoice logged to database:', invoiceNumber);
    } catch (dbError) {
      console.error('❌ Failed to log invoice to database:', dbError);
      // Don't fail the request if database logging fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Membership invoice email sent successfully',
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