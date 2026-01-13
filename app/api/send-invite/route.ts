import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { FIREBASE_FUNCTIONS_URL } from '../../../lib/email-utils';

// Force Node.js runtime to enable file system access
export const runtime = 'nodejs';

// Load invite translations from JSON files (uses invite.json, not email.json)
function loadInviteTranslations(language: string): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'invite.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    // Fallback to English if file not found
    if (language !== 'en') {
      return loadInviteTranslations('en');
    }
    // Return empty object if even English fails
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, name, companyName, inviteUrl, inviterName, locale = 'en' } = await request.json();

    // Validate required fields
    if (!email || !name || !companyName || !inviteUrl || !inviterName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load invite translations
    const translations = await loadInviteTranslations(locale);

    // Get email translations
    const emailTexts = translations.email || {};
    const title = (emailTexts.title || 'You\'re invited to join {{companyName}} on FASE').replace('{{companyName}}', companyName);
    const greeting = (emailTexts.greeting || 'Hi {{name}},').replace('{{name}}', name);
    const invitationText = (emailTexts.invitation_text || '{{inviterName}} has invited you to join <strong>{{companyName}}</strong> on the Federation of European MGAs (FASE) platform.')
      .replace('{{inviterName}}', inviterName)
      .replace('{{companyName}}', companyName);
    
    // Create invitation email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2D5574;">${title}</h2>
        <p>${greeting}</p>
        <p>${invitationText}</p>
        <p>${emailTexts.instruction || 'To complete your account setup and gain access to your company\'s member portal, please click the button below:'}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #2D5574; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">${emailTexts.button_text || 'Complete Account Setup'}</a>
        </div>
        <p>${emailTexts.guide_text || 'This link will guide you through creating your secure account password and accessing all member benefits.'}</p>
        <p>${emailTexts.regards || 'Best regards,'},<br>${emailTexts.team_signature || 'The FASE Team'}</p>
        <p style="color: #6b7280; font-size: 14px;">${emailTexts.help_text || 'If you have any questions, please contact us at'} <a href="mailto:${emailTexts.help_email || 'help@fasemga.com'}">${emailTexts.help_email || 'help@fasemga.com'}</a></p>
      </div>
    `;

    // Send invitation via dedicated Firebase Function
    try {
      const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/sendInviteEmail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            email: email,
            name: name,
            companyName: companyName,
            inviteUrl: inviteUrl,
            inviterName: inviterName
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Firebase Function error response:', errorText);
        throw new Error(`Firebase Function error: ${response.status} - ${errorText}`);
      }

      await response.json();

      return NextResponse.json({ 
        success: true, 
        message: 'Invitation email sent successfully' 
      });
    } catch (emailError) {
      console.error('Firebase Function email error:', emailError);

      return NextResponse.json({
        success: true,
        message: 'Invitation logged (email delivery failed - check Firebase Function configuration)'
      });
    }

  } catch (error) {
    console.error('Error sending invitation email:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation email' },
      { status: 500 }
    );
  }
}