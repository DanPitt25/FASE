import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Force Node.js runtime to enable file system access
export const runtime = 'nodejs';

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
    const requestData = await request.json();

    // Validate required fields
    const requiredFields = ['emails', 'alertTitle', 'alertMessage', 'alertType'];
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!requestData[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Detect language (default to English)
    const userLocale = requestData.userLocale || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';

    // Load email content translations
    const emailTranslations = loadEmailTranslations(locale);
    const signatures = emailTranslations.signatures || {};

    const { emails, alertTitle, alertMessage, alertType, actionUrl, actionText } = requestData;

    // Get alert type styling
    const alertTypeStyles = {
      info: { bg: '#EBF8FF', border: '#2B6CB0', color: '#2C5282' },
      success: { bg: '#F0FDF4', border: '#16A34A', color: '#15803D' },
      warning: { bg: '#FFFBEB', border: '#F59E0B', color: '#B45309' },
      error: { bg: '#FEF2F2', border: '#DC2626', color: '#B91C1C' }
    };

    const style = alertTypeStyles[alertType as keyof typeof alertTypeStyles] || alertTypeStyles.info;

    // Create email content with alert styling
    const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
    </div>
    
    <div style="background-color: ${style.bg}; border: 1px solid ${style.border}; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <h2 style="color: ${style.color}; margin: 0 0 10px 0; font-size: 18px;">${alertTitle}</h2>
      <div style="color: ${style.color}; font-size: 16px; line-height: 1.6;">
        ${alertMessage.replace(/\n\n/g, '</p><p style="margin: 0 0 16px 0;">').replace(/\n/g, '<br>').replace(/^/, '<p style="margin: 0 0 16px 0;">').replace(/$/, '</p>')}
      </div>
      ${actionUrl ? `
      <div style="margin-top: 20px;">
        <a href="${actionUrl}" style="display: inline-block; background-color: #1E3A8A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          ${actionText || 'Learn More'}
        </a>
      </div>
      ` : ''}
    </div>

    <div style="font-size: 14px; line-height: 1.5; color: #666;">
      <p style="margin: 0 0 5px 0;">This is an automated alert from FASE.</p>
      <p style="margin: 0;">If you have questions, please contact us at admin@fasemga.com</p>
    </div>
  </div>
</div>`;

    // Send email using Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    console.log(`Sending alert email to ${emails.length} recipients...`);

    // Send email in batches to avoid rate limits
    const batchSize = 50;
    const results = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      try {
        const response = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            batch.map((email: string) => ({
              from: 'FASE Alerts <admin@fasemga.com>',
              to: email,
              subject: `[FASE Alert] ${alertTitle}`,
              html: htmlContent,
              text: `${alertTitle}\n\n${alertMessage}${actionUrl ? `\n\nView more: ${actionUrl}` : ''}`
            }))
          ),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Resend API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        results.push(result);
        console.log(`✅ Alert emails sent to batch ${i / batchSize + 1}:`, result);
      } catch (emailError: any) {
        console.error(`Failed to send alert emails to batch ${i / batchSize + 1}:`, emailError);
        results.push({ error: emailError.message, batch: batch });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Alert emails sent successfully',
      totalRecipients: emails.length,
      results: results
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