import { NextRequest, NextResponse } from 'next/server';
import { createInvoiceRecord } from '../../../lib/firestore';

// Force Node.js runtime to enable file system access
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Read data from request body
    const requestData = await request.json();
    const emailData = {
      email: requestData.email || "danielhpitt@gmail.com",
      fullName: requestData.fullName || "Daniel Pitt", 
      organizationName: requestData.organizationName || "Test Organization Ltd",
      userId: requestData.userId || "test-user-123",
      greeting: requestData.greeting || requestData.fullName || "Daniel Pitt",
      address: requestData.address
    };

    // Validate required basic fields
    const requiredBasicFields = ['email', 'fullName', 'organizationName'];
    const missingBasicFields = [];
    
    for (const field of requiredBasicFields) {
      if (!emailData[field as keyof typeof emailData] || emailData[field as keyof typeof emailData].trim() === '') {
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
    if (!emailData.address || typeof emailData.address !== 'object') {
      return NextResponse.json(
        { error: 'Address object is required' },
        { status: 400 }
      );
    }

    const requiredAddressFields = ['line1', 'city', 'postcode', 'country'];
    const missingAddressFields = [];
    
    for (const field of requiredAddressFields) {
      if (!emailData.address[field] || emailData.address[field].trim() === '') {
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
      console.log(`Generating follow-up email preview for ${emailData.email}...`);
    } else {
      console.log(`Sending follow-up email to ${emailData.email}...`, emailData);
    }

    // Email content based on your specifications
    let emailContent = {
      subject: "Outstanding Invoice for FASE",
      intro: `I am writing to follow up on your membership dues for FASE (Federation of European MGAs), issued on 5 November 2025, which remains outstanding. Please let me know the status of this payment.`,
      portalAccess: "We look forward to activating your FASE membership, providing you with access to the member portal, and inviting you to our upcoming events. If you require any additional documentation or have questions that would assist in processing the payment, please feel free to reach out to me or simply contact admin@fasemga.com. We are now able to provide European banking details, so just let me know if you need those.",
      closing: "Thank you for your attention to this matter. We appreciate your prompt response.",
      signature: {
        name: "Aline",
        fullName: "Aline Sullivan",
        title: "Chief Operating Officer",
        company: "FASE B.V.",
        address: "Herengracht 124-128\n1015 BT Amsterdam",
        email: "aline.sullivan@fasemga.com"
      }
    };

    // Apply customizations if provided
    if (requestData.customizedEmailContent) {
      const customContent = requestData.customizedEmailContent;
      
      emailContent = {
        subject: customContent.subject || emailContent.subject,
        intro: customContent.intro_text || emailContent.intro,
        portalAccess: customContent.follow_up_text || emailContent.portalAccess,
        closing: customContent.closing_text || emailContent.closing,
        signature: {
          name: customContent.signature || emailContent.signature.name,
          fullName: customContent.signature || emailContent.signature.fullName,
          title: customContent.title || emailContent.signature.title,
          company: emailContent.signature.company,
          address: emailContent.signature.address,
          email: customContent.email || emailContent.signature.email
        }
      };
    }

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
            Dear ${emailData.greeting},
          </p>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
            ${emailContent.intro}
          </p>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
            ${emailContent.portalAccess}
          </p>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 25px 0;">
            ${emailContent.closing}
          </p>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 0 0;">
            Best regards,<br><br>
            <strong>${emailContent.signature.name}</strong><br><br>
            ${emailContent.signature.fullName}<br>
            ${emailContent.signature.title}<br>
            ${emailContent.signature.company}<br>
            ${emailContent.signature.address.replace('\n', '<br>')}<br>
            <a href="mailto:${emailContent.signature.email}" style="color: #2D5574;">${emailContent.signature.email}</a>
          </p>
        </div>
      </div>
    `;

    const finalEmailData = {
      email: emailData.email,
      cc: requestData.cc,
      subject: emailContent.subject,
      html: emailHTML,
      organizationName: emailData.organizationName
    };

    // For preview mode, return preview data instead of sending email
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        to: emailData.email,
        cc: requestData.cc || null,
        subject: emailContent.subject,
        htmlContent: emailHTML,
        textContent: null,
        attachments: [],
        organizationName: emailData.organizationName
      });
    }

    // Send email using Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    try {
      console.log('Sending follow-up email via Resend...');

      const emailPayload: any = {
        from: 'Aline Sullivan <aline.sullivan@fasemga.com>',
        to: finalEmailData.email,
        subject: finalEmailData.subject,
        html: finalEmailData.html
      };

      if (finalEmailData.cc) {
        emailPayload.cc = finalEmailData.cc;
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
      console.log(`✅ Follow-up email sent to ${finalEmailData.email} via Resend:`, result.id);
      
      
      return NextResponse.json({
        success: true,
        message: 'Follow-up email sent successfully',
        emailId: result.id,
        organizationName: emailData.organizationName
      });
    } catch (emailError: any) {
      console.error('Failed to send follow-up email via Resend:', emailError);
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

  } catch (error: any) {
    console.error('Follow-up email function call failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}