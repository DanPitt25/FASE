import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, isAuthError } from '../../../../lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { recipients, subject, body, htmlBody, sender } = await request.json();

    // Validate required fields
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    if (!subject || (!body && !htmlBody)) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    // Map sender email to proper from address
    const senderMap: Record<string, string> = {
      'admin@fasemga.com': 'FASE Admin <admin@fasemga.com>',
      'william.pitt@fasemga.com': 'William Pitt <william.pitt@fasemga.com>',
      'info@fasemga.com': 'FASE Info <info@fasemga.com>',
      'media@fasemga.com': 'FASE Media <media@fasemga.com>'
    };

    const fromAddress = senderMap[sender] || senderMap['admin@fasemga.com'];

    // Determine body content - use rich HTML if provided, otherwise convert plain text
    const bodyHtml = htmlBody
      ? htmlBody
      : (body || '').replace(/\n\n/g, '</p><p style="margin: 0 0 16px 0;">').replace(/\n/g, '<br>').replace(/^/, '<p style="margin: 0 0 16px 0;">').replace(/$/, '</p>');

    // Create email content - no automatic signature, user includes sign-off in body
    const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
    </div>

    <div style="font-size: 16px; line-height: 1.6; color: #333;">
      ${bodyHtml}
    </div>
  </div>
</div>`;

    console.log(`Sending mass email to ${recipients.length} recipients...`);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Plain text fallback
    const plainTextBody = body || '';

    // Send emails to each recipient
    for (const recipient of recipients) {
      try {
        // Personalize content with recipient name if available
        const recipientName = recipient.contactName || recipient.fullName || '';
        let personalizedBody = plainTextBody;
        let personalizedHtml = htmlContent;

        if (recipientName) {
          // Replace {{name}} with actual name
          personalizedBody = plainTextBody.replace(/\{\{name\}\}/g, recipientName);
          personalizedHtml = htmlContent.replace(/\{\{name\}\}/g, recipientName);
        } else {
          // Remove {{name}} placeholder and clean up "Dear ," if no name
          personalizedBody = plainTextBody.replace(/\{\{name\}\}/g, '').replace(/Dear\s*,/g, 'Dear Member,');
          personalizedHtml = htmlContent.replace(/\{\{name\}\}/g, '').replace(/Dear\s*,/g, 'Dear Member,');
        }

        const emailPayload = {
          from: fromAddress,
          to: recipient.email,
          subject: subject,
          html: personalizedHtml,
          text: personalizedBody
        };

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
        console.log(`✅ Email sent to ${recipient.email} (${recipient.organizationName}):`, result.id);
        sent++;

        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (emailError: any) {
        console.error(`❌ Failed to send to ${recipient.email}:`, emailError.message);
        failed++;
        errors.push(`${recipient.email}: ${emailError.message}`);
      }
    }

    console.log(`Mass email complete: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: recipients.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Mass email function failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
