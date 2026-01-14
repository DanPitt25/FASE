import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

// Load email translations from JSON files
function loadEmailTranslations(language: string): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'email.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    if (language !== 'en') {
      return loadEmailTranslations('en');
    }
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const { recipients, subject, body, sender } = await request.json();

    // Validate required fields
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 });
    }

    if (!subject || !body) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    // Load English signatures for mass emails
    const emailTranslations = loadEmailTranslations('en');
    const signatures = emailTranslations.signatures || {};

    // Get signature based on sender
    const senderSignatureMap: Record<string, string> = {
      'william.pitt@fasemga.com': 'william_pitt',
      'aline.sullivan@fasemga.com': 'aline_sullivan',
      'admin@fasemga.com': 'admin_team',
      'info@fasemga.com': 'info_team',
      'media@fasemga.com': 'media_team'
    };

    const signatureKey = senderSignatureMap[sender] || 'admin_team';
    const signature = signatures[signatureKey] || signatures['admin_team'] || {
      regards: 'Best regards,',
      name: 'The FASE Team',
      title: ''
    };

    // Map sender email to proper from address
    const senderMap: Record<string, string> = {
      'admin@fasemga.com': 'FASE Admin <admin@fasemga.com>',
      'aline.sullivan@fasemga.com': 'Aline Sullivan <aline.sullivan@fasemga.com>',
      'william.pitt@fasemga.com': 'William Pitt <william.pitt@fasemga.com>',
      'info@fasemga.com': 'FASE Info <info@fasemga.com>',
      'media@fasemga.com': 'FASE Media <media@fasemga.com>'
    };

    const fromAddress = senderMap[sender] || senderMap['admin@fasemga.com'];

    // Create email content with proper signature
    const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
    </div>

    <div style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 30px;">
      ${body.replace(/\n\n/g, '</p><p style="margin: 0 0 16px 0;">').replace(/\n/g, '<br>').replace(/^/, '<p style="margin: 0 0 16px 0;">').replace(/$/, '</p>')}
    </div>

    <div style="font-size: 16px; line-height: 1.5; color: #333;">
      <p style="margin: 0 0 5px 0;">${signature.regards}</p>
      <p style="margin: 0 0 3px 0;"><strong>${signature.name}</strong></p>
      ${signature.title ? `<p style="margin: 0; color: #666; font-style: italic;">${signature.title}</p>` : ''}
    </div>
  </div>
</div>`;

    console.log(`Sending mass email to ${recipients.length} recipients...`);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send emails to each recipient
    for (const recipient of recipients) {
      try {
        const emailPayload = {
          from: fromAddress,
          to: recipient.email,
          subject: subject,
          html: htmlContent,
          text: body
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
