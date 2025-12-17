import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
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
    // Check if request has multipart form data (for files) or JSON
    const contentType = request.headers.get('content-type');
    let requestData: any;
    let attachments: File[] = [];

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      requestData = {};
      
      // Extract form fields
      const entries = Array.from(formData.entries());
      for (const [key, value] of entries) {
        if (key === 'attachments') {
          attachments.push(value as File);
        } else {
          requestData[key] = value;
        }
      }
    } else {
      requestData = await request.json();
    }

    // Validate required fields
    const requiredFields = ['email', 'freeformSubject', 'freeformBody'];
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!requestData[field] || requestData[field].toString().trim() === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if this is a preview request
    const isPreview = requestData.preview === 'true' || requestData.preview === true;
    
    // Detect language (default to English for freeform emails)
    const userLocale = requestData.userLocale || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';

    // Load email content translations
    const emailTranslations = loadEmailTranslations(locale);
    const signatures = emailTranslations.signatures || {};

    const emailData = {
      email: requestData.email,
      cc: requestData.cc,
      subject: requestData.freeformSubject,
      body: requestData.freeformBody,
      sender: requestData.freeformSender || 'admin@fasemga.com',
      attachments: attachments,
      locale: locale,
      signatures: signatures
    };

    if (isPreview) {
      console.log(`Generating freeform email preview for ${emailData.email}...`);
    } else {
      console.log(`Sending freeform email to ${emailData.email}...`);
    }

    // Get signature based on sender
    const senderSignatureMap: Record<string, string> = {
      'william.pitt@fasemga.com': 'william_pitt',
      'aline.sullivan@fasemga.com': 'aline_sullivan',
      'admin@fasemga.com': 'admin_team',
      'info@fasemga.com': 'info_team',
      'media@fasemga.com': 'media_team'
    };

    const signatureKey = senderSignatureMap[emailData.sender] || 'admin_team';
    const signature = emailData.signatures[signatureKey] || emailData.signatures['admin_team'] || {
      regards: 'Best regards,',
      name: 'The FASE Team',
      title: ''
    };

    // Create email content with proper signature
    const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
    </div>
    
    <div style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 30px;">
      ${emailData.body.replace(/\n\n/g, '</p><p style="margin: 0 0 16px 0;">').replace(/\n/g, '<br>').replace(/^/, '<p style="margin: 0 0 16px 0;">').replace(/$/, '</p>')}
    </div>

    <div style="font-size: 16px; line-height: 1.5; color: #333;">
      <p style="margin: 0 0 5px 0;">${signature.regards}</p>
      <p style="margin: 0 0 3px 0;"><strong>${signature.name}</strong></p>
      ${signature.title ? `<p style="margin: 0; color: #666;">${signature.title}</p>` : ''}
    </div>
  </div>
</div>`;

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        to: emailData.email,
        cc: emailData.cc || null,
        subject: emailData.subject,
        htmlContent: htmlContent,
        textContent: emailData.body,
        pdfUrl: null,
        attachments: attachments.map(file => ({
          filename: file.name,
          size: file.size,
          type: file.type
        }))
      });
    }

    // Send email using Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    try {
      console.log('Sending freeform email via Resend...');
      
      // Prepare attachments for Resend
      const resendAttachments = [];
      for (const file of attachments) {
        const buffer = await file.arrayBuffer();
        resendAttachments.push({
          filename: file.name,
          content: Array.from(new Uint8Array(buffer))
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
        from: senderMap[emailData.sender] || senderMap['admin@fasemga.com'],
        to: emailData.email,
        subject: emailData.subject,
        html: htmlContent,
        text: emailData.body
      };

      if (emailData.cc) {
        emailPayload.cc = emailData.cc;
      }

      if (resendAttachments.length > 0) {
        emailPayload.attachments = resendAttachments;
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
      console.log(`✅ Freeform email sent to ${emailData.email} via Resend:`, result.id);
      
      // Log email audit trail
      try {
        await AdminAuditLogger.logEmailSent({
          adminUserId: 'admin_portal', // TODO: Pass actual admin user ID from request
          action: 'email_sent_freeform',
          success: true,
          emailData: {
            toEmail: emailData.email,
            toName: undefined,
            ccEmails: emailData.cc ? [emailData.cc] : undefined,
            organizationName: requestData.organizationName || undefined,
            subject: emailData.subject,
            emailType: 'freeform',
            htmlContent: htmlContent, // The complete HTML email
            textContent: requestData.freeformBody, // Original plain text
            emailLanguage: 'en', // Freeform emails don't have language detection
            templateUsed: 'freeform',
            customizedContent: true, // Freeform is always custom
            attachments: attachments.map(file => ({
              filename: file.name,
              type: 'document' as const, // Generic type for user uploads
              size: file.size
            })),
            emailServiceId: result.id
          }
        });
        console.log('✅ Email audit logged successfully');
      } catch (auditError) {
        console.error('❌ Failed to log email audit:', auditError);
        // Don't fail the request if audit logging fails
      }
      
      return NextResponse.json({
        success: true,
        message: 'Freeform email sent successfully',
        emailId: result.id,
        to: emailData.email,
        subject: emailData.subject,
        attachmentCount: attachments.length
      });
    } catch (emailError: any) {
      console.error('Failed to send freeform email via Resend:', emailError);
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

  } catch (error: any) {
    console.error('Function call failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}