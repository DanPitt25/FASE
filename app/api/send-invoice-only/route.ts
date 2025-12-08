import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

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
      totalAmount: requestData.totalAmount || 0
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
      subject: genderAwareSubject?.replace('{invoiceNumber}', invoiceData.invoiceNumber) || `FASE Invoice ${invoiceData.invoiceNumber}`,
      dear: genderAwareDear || 'Dear',
      deliveredText: invoiceEmail.delivered_text?.replace('{organizationName}', invoiceData.organizationName) || `Your invoice for ${invoiceData.organizationName} has been delivered.`,
      instructionsText: invoiceEmail.instructions_text || 'Please follow the payment instructions included in the attached PDF.',
      contactText: invoiceEmail.contact_text || 'If you have any questions, please contact us at admin@fasemga.com',
      regards: invoiceEmail.regards || 'Best regards,',
      signature: invoiceEmail.signature || 'The FASE Team'
    };

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
      pdfAttachment: requestData.pdfAttachment,
      pdfFilename: requestData.pdfFilename || `FASE-Invoice-${invoiceData.invoiceNumber}.pdf`
    };

    // Generate PDF invoice
    let pdfBase64 = requestData.pdfAttachment;
    
    if (!pdfBase64) {
      // Load the cleaned letterhead template
      const letterheadPath = path.join(process.cwd(), 'cleanedpdf.pdf');
      const letterheadBytes = fs.readFileSync(letterheadPath);
      const pdfDoc = await PDFDocument.load(letterheadBytes);
      
      // Get the first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Embed fonts
      const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // FASE Brand Colors
      const faseNavy = rgb(0.176, 0.333, 0.455);      // #2D5574
      const faseBlack = rgb(0.137, 0.122, 0.125);     // #231F20
      
      // Layout constants
      const margins = { left: 50, right: 50, top: 150, bottom: 80 };
      const contentWidth = width - margins.left - margins.right;
      
      // Load PDF text translations
      const translations = loadEmailTranslations(locale);
      const pdfTexts = {
        invoice: 'INVOICE',
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

      // Current date
      const dateLocales = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', nl: 'nl-NL' };
      const dateLocale = dateLocales[locale as keyof typeof dateLocales] || 'en-GB';
      const currentDate = new Date().toLocaleDateString(dateLocale);
      
      // Start drawing invoice content
      let currentY = height - margins.top;
      
      // INVOICE HEADER
      firstPage.drawText(pdfTexts.invoice, {
        x: margins.left,
        y: currentY,
        size: 18,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 50;
      
      // BILL TO section
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
      
      currentY -= 20;
      
      // Organization details
      firstPage.drawText(invoiceData.organizationName, {
        x: margins.left,
        y: currentY,
        size: 11,
        font: bodyFont,
        color: faseBlack,
      });
      
      currentY -= 60;
      
      // Line items table header
      firstPage.drawText(pdfTexts.description, {
        x: margins.left,
        y: currentY,
        size: 10,
        font: boldFont,
        color: faseNavy,
      });
      
      firstPage.drawText(pdfTexts.quantity, {
        x: margins.left + 300,
        y: currentY,
        size: 10,
        font: boldFont,
        color: faseNavy,
      });
      
      firstPage.drawText(pdfTexts.unitPrice, {
        x: margins.left + 380,
        y: currentY,
        size: 10,
        font: boldFont,
        color: faseNavy,
      });
      
      firstPage.drawText(pdfTexts.total, {
        x: margins.left + 460,
        y: currentY,
        size: 10,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 25;
      
      // Line item
      firstPage.drawText('FASE Annual Membership', {
        x: margins.left,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText('1', {
        x: margins.left + 300,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(`€${invoiceData.totalAmount}`, {
        x: margins.left + 380,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      firstPage.drawText(`€${invoiceData.totalAmount}`, {
        x: margins.left + 460,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      currentY -= 40;
      
      // Total amount due
      firstPage.drawText(`${pdfTexts.totalAmountDue} €${invoiceData.totalAmount}`, {
        x: margins.left + 350,
        y: currentY,
        size: 12,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 40;
      
      // Payment instructions
      firstPage.drawText(pdfTexts.paymentInstructions, {
        x: margins.left,
        y: currentY,
        size: 11,
        font: boldFont,
        color: faseNavy,
      });
      
      currentY -= 20;
      
      // Bank details
      const bankText = translations.pdf_invoice?.payment_company || 'Lexicon Associates, LLC accepts payments on behalf of Fédération des Agences de Souscription (FASE B.V.)';
      firstPage.drawText(bankText, {
        x: margins.left,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      currentY -= 16;
      
      const accountText = translations.pdf_invoice?.account_number || 'Account Number: 1255828998';
      firstPage.drawText(accountText, {
        x: margins.left,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      currentY -= 16;
      
      const referenceText = (translations.pdf_invoice?.payment_reference || 'Payment Reference: {invoiceNumber}').replace('{invoiceNumber}', invoiceData.invoiceNumber);
      firstPage.drawText(referenceText, {
        x: margins.left,
        y: currentY,
        size: 10,
        font: bodyFont,
        color: faseBlack,
      });
      
      // Generate PDF bytes and convert to base64
      const pdfBytes = await pdfDoc.save();
      pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    }

    // Update email data with PDF attachment
    emailData.pdfAttachment = pdfBase64;

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