import { NextRequest, NextResponse } from 'next/server';
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
        attachments: requestData.pdfAttachment ? [{ filename: emailData.pdfFilename, type: 'application/pdf' }] : [],
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