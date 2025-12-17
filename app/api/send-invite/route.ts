import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { AdminAuditLogger } from '../../../lib/admin-audit-logger';

// Load email translations from JSON files
function loadEmailTranslations(language: string): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'invite.json');
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
    const { email, name, companyName, inviteUrl, inviterName, locale = 'en' } = await request.json();

    // Validate required fields
    if (!email || !name || !companyName || !inviteUrl || !inviterName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load email translations
    const translations = await loadEmailTranslations(locale);

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
      console.log('Sending invitation email via Firebase Function...');
      
      const response = await fetch(`https://us-central1-fase-site.cloudfunctions.net/sendInviteEmail`, {
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

      const result = await response.json();
      console.log('Invitation email sent successfully:', result);

      // Log email audit trail
      try {
        await AdminAuditLogger.logEmailSent({
          adminUserId: 'admin_portal', // TODO: Pass actual admin user ID from request
          action: 'email_sent_invite',
          success: true,
          emailData: {
            toEmail: email,
            toName: name,
            organizationName: companyName,
            subject: (emailTexts.subject || 'You\'re invited to join {{companyName}} on FASE').replace('{{companyName}}', companyName),
            emailType: 'invite',
            htmlContent: emailHtml,
            emailLanguage: locale,
            templateUsed: 'invite',
            customizedContent: false,
            attachments: [],
            emailServiceId: result.id || 'firebase_function'
          }
        });
        console.log('✅ Email audit logged successfully');
      } catch (auditError) {
        console.error('❌ Failed to log email audit:', auditError);
        // Don't fail the request if audit logging fails
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Invitation email sent successfully' 
      });
    } catch (emailError) {
      console.error('Firebase Function email error:', emailError);
      
      // Fallback: Log to console for development/testing
      console.log('===========================================');
      console.log('INVITATION EMAIL (DEVELOPMENT MODE)');
      console.log('===========================================');
      console.log(`To: ${email}`);
      const subject = (emailTexts.subject || 'You\'re invited to join {{companyName}} on FASE').replace('{{companyName}}', companyName);
      console.log(`Subject: ${subject}`);
      console.log(`Inviter: ${inviterName}`);
      console.log(`Invite URL: ${inviteUrl}`);
      console.log('===========================================');

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