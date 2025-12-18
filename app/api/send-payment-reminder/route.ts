import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

// Force Node.js runtime to enable file system access
export const runtime = 'nodejs';
import { createInvoiceRecord } from '../../../lib/firestore';
import { AdminAuditLogger } from '../../../lib/admin-audit-logger';

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

    // Check if this is a preview request
    const isPreview = requestData.preview === true;
    
    if (isPreview) {
      console.log(`Generating payment reminder preview for ${testData.email}...`);
    } else {
      console.log(`Sending payment reminder email to ${testData.email}...`, testData);
    }
    
    // Create payment link with amount and PayPal email
    const paypalEmail = requestData.paypalEmail || testData.email;
    const paypalParams = new URLSearchParams({
      amount: testData.totalAmount.toString(),
      email: paypalEmail,
      organization: testData.organizationName
    });
    const paypalLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://fasemga.com'}/payment?${paypalParams.toString()}`;
    
    console.log('✅ Payment link generated:', paypalLink);
    
    // Handle uploaded PDF attachment if provided
    let pdfAttachment: string | null = null;
    if (requestData.pdfAttachment) {
      pdfAttachment = requestData.pdfAttachment;
      console.log('Using uploaded PDF attachment');
    }
    
    // Detect language for email translations
    const userLocale = requestData.userLocale || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';
    
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
    const genderAwareSubject = reminderEmail[`subject${genderSuffix}`] || reminderEmail.subject || "Payment Reminder - FASE Membership";
    const genderAwareGreeting = reminderEmail[`greeting${genderSuffix}`] || reminderEmail.greeting || "Payment Reminder";
    const genderAwareReminderText = reminderEmail[`reminder_text${genderSuffix}`] || reminderEmail.reminder_text || "We hope this message finds you well. This is a friendly reminder regarding the outstanding payment for your FASE membership application for {organizationName}.";
    
    let emailContent = {
      subject: genderAwareSubject,
      greeting: genderAwareGreeting,
      dear: genderAwareDear,
      reminderText: genderAwareReminderText.replace('{organizationName}', `<strong>${testData.organizationName}</strong>`),
      paymentText: (reminderEmail.payment_text || "The outstanding amount of €{totalAmount} can be paid using one of the following methods:").replace('{totalAmount}', testData.totalAmount.toString()),
      paymentOptions: reminderEmail.payment_options || "Payment Options:",
      paypalOption: reminderEmail.paypal_option || "PayPal:",
      payOnline: reminderEmail.pay_online || "Pay Online", 
      bankTransfer: reminderEmail.bank_transfer || "Bank Transfer:",
      invoiceAttached: reminderEmail.invoice_attached || "Full payment details are included in the attached invoice",
      benefitsText: reminderEmail.benefits_text || "Once activated, your membership includes access to our logo for your marketing materials, the ability to showcase your company in our member directory (please send your logo and brief business summary to admin@fasemga.com), and access to our full range of networking and business development resources.",
      accessText: reminderEmail.access_text || "We're eager to provide you with access to the FASE member portal where you can explore all these benefits and begin connecting with fellow members across Europe.",
      contactText: reminderEmail.contact_text || "If you have any questions about your membership or need assistance, please don't hesitate to contact me.",
      regards: signature.regards,
      signature: signature.name,
      title: signature.title
    };

    // Apply customizations if provided
    if (requestData.customizedEmailContent) {
      const customContent = requestData.customizedEmailContent;
      const genderSuffix = testData.gender === 'f' ? '_f' : '_m';
      
      emailContent = {
        subject: customContent[`subject${genderSuffix}`] || customContent.subject || emailContent.subject,
        greeting: customContent[`greeting${genderSuffix}`] || customContent.greeting || emailContent.greeting,
        dear: customContent[`dear${genderSuffix}`] || customContent.dear || emailContent.dear,
        reminderText: (customContent[`reminder_text${genderSuffix}`] || customContent.reminder_text || reminderEmail.reminder_text || emailContent.reminderText).replace('{organizationName}', `<strong>${testData.organizationName}</strong>`),
        paymentText: (customContent.payment_text || reminderEmail.payment_text || emailContent.paymentText).replace('{totalAmount}', testData.totalAmount.toString()),
        paymentOptions: customContent.payment_options || emailContent.paymentOptions,
        paypalOption: customContent.paypal_option || emailContent.paypalOption,
        payOnline: customContent.pay_online || emailContent.payOnline,
        bankTransfer: customContent.bank_transfer || emailContent.bankTransfer,
        invoiceAttached: customContent.invoice_attached || emailContent.invoiceAttached,
        benefitsText: customContent.benefits_text || emailContent.benefitsText,
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
              ${emailContent.accessText}
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
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
      // Add PDF attachment if provided
      ...(pdfAttachment && {
        pdfAttachment: pdfAttachment,
        pdfFilename: requestData.pdfFilename || 'FASE-Payment-Reminder.pdf'
      })
    };

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      // Create a temporary PDF file URL for preview if attachment provided
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
        attachments: pdfAttachment ? ['Attached PDF'] : [],
        totalAmount: testData.totalAmount
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
          filename: requestData.pdfFilename || 'FASE-Payment-Reminder.pdf',
          content: Array.from(Buffer.from(pdfAttachment, 'base64'))
        });
      }

        // Map sender email to proper from address (defaults to Aline Sullivan for payment reminders)
      const senderEmail = requestData.freeformSender || 'aline.sullivan@fasemga.com';
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
      
      // Log payment reminder to database after successful sending
      try {
        // Generate a reminder number for tracking
        const reminderNumber = "REMINDER-" + Math.floor(10000 + Math.random() * 90000);
        await createInvoiceRecord({
          invoiceNumber: reminderNumber,
          recipientEmail: testData.email,
          recipientName: testData.fullName,
          organizationName: testData.organizationName,
          amount: testData.totalAmount,
          currency: 'EUR', // Payment reminders use EUR
          type: 'reminder',
          status: 'sent',
          sentAt: new Date(),
          emailId: result.id,
          pdfGenerated: !!pdfAttachment
        });
        console.log('✅ Payment reminder logged to database:', reminderNumber);
      } catch (dbError) {
        console.error('❌ Failed to log payment reminder to database:', dbError);
        // Don't fail the request if database logging fails
      }
      
      // Log email audit trail
      try {
        await AdminAuditLogger.logEmailSent({
          adminUserId: 'admin_portal', // TODO: Pass actual admin user ID from request
          action: 'email_sent_payment_reminder',
          success: true,
          emailData: {
            toEmail: emailData.email,
            toName: testData.greeting,
            ccEmails: emailData.cc ? [emailData.cc] : undefined,
            organizationName: testData.organizationName,
            subject: emailContent.subject,
            emailType: 'payment_reminder',
            htmlContent: emailData.invoiceHTML,
            emailLanguage: locale,
            templateUsed: 'payment_reminder',
            customizedContent: !!requestData.customizedEmailContent,
            attachments: pdfAttachment ? [{
              filename: requestData.pdfFilename || 'FASE-Payment-Reminder.pdf',
              type: 'pdf' as const,
              size: undefined
            }] : [],
            emailServiceId: result.id,
            invoiceAmount: testData.totalAmount,
            currency: 'EUR',
            paymentInstructions: 'Bank transfer and PayPal'
          }
        });
        console.log('✅ Email audit logged successfully');
      } catch (auditError) {
        console.error('❌ Failed to log email audit:', auditError);
        // Don't fail the request if audit logging fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'Payment reminder email sent successfully',
        emailId: result.id,
        totalAmount: testData.totalAmount
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