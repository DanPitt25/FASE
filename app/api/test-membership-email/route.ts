import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

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
    // Read data from request body instead of hardcoded values
    const requestData = await request.json();
    const testData = {
      email: requestData.email || "danielhpitt@gmail.com",
      fullName: requestData.fullName || "Daniel Pitt", 
      organizationName: requestData.organizationName || "Test Organization Ltd",
      totalAmount: requestData.totalAmount || 1500,
      userId: requestData.userId || "test-user-123",
      membershipType: requestData.membershipType || "corporate",
      organizationType: requestData.organizationType || "MGA",
      grossWrittenPremiums: requestData.grossWrittenPremiums || "10-20m",
      hasOtherAssociations: requestData.hasOtherAssociations || false,
      greeting: requestData.greeting || requestData.fullName || "Daniel Pitt",
      gender: requestData.gender || "m", // "m" for masculine, "f" for feminine
      originalAmount: requestData.originalAmount || requestData.totalAmount,
      discountAmount: requestData.discountAmount || 0,
      discountReason: requestData.discountReason || "",
      address: requestData.address
    };

    // Validate required basic fields
    const requiredBasicFields = ['email', 'fullName', 'organizationName'];
    const missingBasicFields = [];
    
    for (const field of requiredBasicFields) {
      if (!testData[field as keyof typeof testData] || testData[field as keyof typeof testData].trim() === '') {
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

    console.log(`Sending test membership acceptance email to ${testData.email}...`, testData);
    
    // Generate 5-digit invoice number
    const invoiceNumber = "FASE-" + Math.floor(10000 + Math.random() * 90000);
    
    // Create payment link with amount and user email for PayPal
    const paypalParams = new URLSearchParams({
      amount: testData.totalAmount.toString(),
      email: testData.email,
      organization: testData.organizationName
    });
    const paypalLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-payment-link?${paypalParams.toString()}`;
    
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
      
      // Helper function
      const formatEuro = (amount: number) => `€ ${amount}`;
      
      // Load PDF text translations from JSON files
      const translations = loadEmailTranslations(locale);
      const pdfTexts = {
        invoice: translations.pdf_invoice?.invoice || 'INVOICE',
        billTo: translations.pdf_invoice?.bill_to || 'Bill To:',
        invoiceNumber: translations.pdf_invoice?.invoice_number || 'Invoice #:',
        date: translations.pdf_invoice?.date || 'Date:',
        dueDate: translations.pdf_invoice?.due_date || 'Due Date:',
        terms: translations.pdf_invoice?.terms || 'Terms: Net 30',
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
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(dateLocale);
      
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
      
      firstPage.drawText(`${pdfTexts.dueDate} ${dueDate}`, {
        x: invoiceDetailsX,
        y: currentY - 32,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(pdfTexts.terms, {
        x: invoiceDetailsX,
        y: currentY - 48,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      currentY -= 20;
      const billToLines = [
        testData.organizationName,
        testData.fullName,
        testData.address.line1,
        ...(testData.address.line2 ? [testData.address.line2] : []),
        `${testData.address.city}, ${testData.address.county} ${testData.address.postcode}`,
        testData.address.country
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
      
      firstPage.drawText(formatEuro(testData.originalAmount), {
        x: colX[2] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(formatEuro(testData.originalAmount), {
        x: colX[3] + 10,
        y: currentY - 15,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      // Add discount row if applicable
      if (testData.discountAmount > 0) {
        currentY -= rowHeight;
        
        // Define green color for discount
        const discountGreen = rgb(0.0, 0.6, 0.0); // Dark green
        
        firstPage.drawText(testData.discountReason || 'Association Member Discount', {
          x: colX[0] + 10,
          y: currentY - 15,
          size: 10,
          font: bodyFont,
          color: discountGreen,
          maxWidth: colWidths[0] - 20,
        });
        
        // Skip quantity and unit price columns for discount
        
        firstPage.drawText(`-${formatEuro(testData.discountAmount)}`, {
          x: colX[3] + 10,
          y: currentY - 15,
          size: 10,
          font: bodyFont,
          color: discountGreen,
        });
      }
      
      currentY -= sectionGap + 20;
      
      // TOTAL SECTION
      const totalSectionWidth = 200;
      const totalX = width - margins.right - totalSectionWidth;
      
      firstPage.drawRectangle({
        x: totalX,
        y: currentY - 35,
        width: totalSectionWidth,
        height: 35,
        borderColor: faseNavy,
        borderWidth: 2,
      });
      
      firstPage.drawText(pdfTexts.totalAmountDue, {
        x: totalX + 15,
        y: currentY - 22,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      firstPage.drawText(formatEuro(testData.totalAmount), {
        x: totalX + totalSectionWidth - 60,
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
      
      // Load payment lines from translations
      const paymentReference = translations.pdf_invoice?.payment_reference?.replace('{invoiceNumber}', invoiceNumber) || `Payment Reference: ${invoiceNumber}`;
      const paymentLines = [
        translations.pdf_invoice?.payment_company || 'Lexicon Associates, LLC is accepting payments on behalf of Fédération des Agences de Souscription (FASE B.V.)',
        'Citibank, N.A.',
        'USCC CITISWEEP',
        '100 Citibank Drive',
        'San Antonio, TX 78245',
        '',
        translations.pdf_invoice?.account_number || 'Account number: 1255828998',
        'ABA: 221172610',
        'Swift: CITIUS33',
        '',
        paymentReference
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
    const genderSuffix = testData.gender === 'f' ? '_f' : '_m';
    const genderAwareDear = adminEmail[`dear${genderSuffix}`] || adminEmail.dear || "Dear";
    const genderAwareSubject = adminEmail[`subject${genderSuffix}`] || adminEmail.subject || "Welcome to FASE - Membership Approved";
    const genderAwareWelcome = adminEmail[`welcome${genderSuffix}`] || adminEmail.welcome || "Welcome to FASE";
    const genderAwareWelcomeText = adminEmail[`welcome_text${genderSuffix}`] || adminEmail.welcome_text || "Welcome to FASE. Your application for {organizationName} has been approved.";
    
    const emailContent = {
      subject: genderAwareSubject,
      welcome: genderAwareWelcome,
      dear: genderAwareDear,
      welcomeText: genderAwareWelcomeText.replace('{organizationName}', `<strong>${testData.organizationName}</strong>`),
      paymentText: (adminEmail.payment_text || "To complete your membership, please remit payment of €{totalAmount} using one of the following methods:").replace('{totalAmount}', testData.totalAmount.toString()),
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

    const emailData = {
      email: testData.email,
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
              ${emailContent.dear} ${testData.greeting},
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
      `,
      invoiceNumber: invoiceNumber,
      organizationName: testData.organizationName,
      totalAmount: testData.totalAmount.toString(),
      // Add PDF attachment if generated successfully
      ...(pdfAttachment && {
        pdfAttachment: pdfAttachment,
        pdfFilename: `FASE-Invoice-${invoiceNumber}.pdf`
      })
    };

    // Call Firebase Function directly via HTTP (server-side)
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
    console.log('✅ Test membership acceptance email sent successfully:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
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