import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { generateInvoicePDF, InvoiceGenerationData } from '../../../lib/invoice-pdf-generator';
import { AdminAuditLogger } from '../../../lib/admin-audit-logger';

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
      discountAmount: requestData.hasOtherAssociations ? (requestData.originalAmount || requestData.totalAmount) * 0.2 : 0,
      discountReason: requestData.hasOtherAssociations ? "Multi-Association Member Discount (20%)" : "",
      customLineItem: requestData.customLineItem || null
    };
    
    console.log('🔍 DEBUG: Custom line item data:', JSON.stringify(invoiceData.customLineItem, null, 2));
    
    const hasOtherAssociations = requestData.hasOtherAssociations || false;

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
    
    // Handle customized email content
    let emailContent = {
      subject: genderAwareSubject?.replace('{invoiceNumber}', invoiceData.invoiceNumber) || `Invoice ${invoiceData.invoiceNumber}`,
      dear: genderAwareDear || 'Dear',
      deliveredText: invoiceEmail.delivered_text?.replace('{organizationName}', invoiceData.organizationName) || `Your invoice for ${invoiceData.organizationName} has been delivered.`,
      instructionsText: invoiceEmail.instructions_text || 'Please follow the payment instructions included in the attached PDF.',
      contactText: invoiceEmail.contact_text || 'If you have any questions, please contact us at admin@fasemga.com',
      regards: invoiceEmail.regards || 'Best regards,',
      signature: invoiceEmail.signature || 'The FASE Team'
    };

    // Apply customizations if provided
    if (requestData.customizedEmailContent) {
      const customContent = requestData.customizedEmailContent;
      emailContent = {
        subject: customContent.subject?.replace('{invoiceNumber}', invoiceData.invoiceNumber) || emailContent.subject,
        dear: customContent[`dear${genderSuffix}`] || customContent.dear || emailContent.dear,
        deliveredText: customContent.delivered_text?.replace('{organizationName}', invoiceData.organizationName) || emailContent.deliveredText,
        instructionsText: customContent.instructions_text || emailContent.instructionsText,
        contactText: customContent.contact_text || emailContent.contactText,
        regards: customContent.regards || emailContent.regards,
        signature: customContent.signature || emailContent.signature
      };
    }

    // Generate PDF invoice using the shared generator
    let pdfBase64 = requestData.pdfAttachment;
    
    if (!pdfBase64) {
      console.log('🧾 Generating invoice PDF using shared generator...');
      
      const invoiceGenerationData: InvoiceGenerationData = {
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceType: 'regular',
        
        email: invoiceData.email,
        fullName: invoiceData.fullName,
        organizationName: invoiceData.organizationName,
        greeting: invoiceData.greeting,
        gender: invoiceData.gender,
        address: invoiceData.address,
        
        totalAmount: invoiceData.totalAmount,
        originalAmount: invoiceData.originalAmount,
        discountAmount: invoiceData.discountAmount,
        discountReason: invoiceData.discountReason,
        hasOtherAssociations,
        
        forceCurrency: requestData.forceCurrency,
        userLocale: locale,
        
        customLineItem: invoiceData.customLineItem,
        
        generationSource: 'customer_request',
        isPreview: isPreview
      };

      const result = await generateInvoicePDF(invoiceGenerationData);
      pdfBase64 = result.pdfBase64;
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
    
    // Log email audit trail (only if not preview mode)
    if (!isPreview) {
      try {
        await AdminAuditLogger.logEmailSent({
          adminUserId: 'admin_portal', // TODO: Pass actual admin user ID from request
          action: 'email_sent_invoice_only',
          success: true,
          emailData: {
            toEmail: invoiceData.email,
            toName: invoiceData.greeting,
            ccEmails: requestData.cc ? [requestData.cc] : undefined,
            organizationName: invoiceData.organizationName,
            subject: emailContent.subject,
            emailType: 'invoice_only',
            htmlContent: emailData.invoiceHTML,
            emailLanguage: locale,
            templateUsed: 'invoice_only',
            customizedContent: false,
            attachments: pdfBase64 ? [{
              filename: `FASE-Invoice-${invoiceData.invoiceNumber}.pdf`,
              type: 'pdf' as const,
              size: undefined
            }] : [],
            invoiceNumber: invoiceData.invoiceNumber,
            emailServiceId: result.id,
            invoiceAmount: invoiceData.totalAmount,
            currency: 'EUR',
            paymentInstructions: 'Bank transfer or PayPal'
          }
        });
        console.log('✅ Email audit logged successfully');
      } catch (auditError) {
        console.error('❌ Failed to log email audit:', auditError);
        // Don't fail the request if audit logging fails
      }
    }
    
    // Send admin copy
    try {
      const adminEmailData = {
        ...emailData,
        email: 'admin@fasemga.com',
        subject: `Admin Copy: ${emailData.subject}`,
        pdfFilename: `ADMIN-COPY-${invoiceData.invoiceNumber}.pdf`
      };

      await fetch(`https://us-central1-fase-site.cloudfunctions.net/sendInvoiceEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: adminEmailData
        }),
      });
      console.log('✅ Admin copy sent for invoice:', invoiceData.invoiceNumber);
    } catch (adminError) {
      console.error('❌ Failed to send admin copy:', adminError);
    }
    
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