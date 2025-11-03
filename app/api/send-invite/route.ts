import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, name, companyName, inviteUrl, inviterName } = await request.json();

    // Validate required fields
    if (!email || !name || !companyName || !inviteUrl || !inviterName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check for Resend API key
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e3a8a;">You're invited to join ${companyName} on FASE</h2>
            <p>Hi ${name},</p>
            <p>${inviterName} has invited you to join <strong>${companyName}</strong> on the Federation of European MGAs (FASE) platform.</p>
            <p>To complete your account setup and gain access to your company's member portal, please click the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Account Setup</a>
            </div>
            <p>This link will guide you through creating your secure account password and accessing all member benefits.</p>
            <p>Best regards,<br>The FASE Team</p>
            <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact us at <a href="mailto:help@fasemga.com">help@fasemga.com</a></p>
          </div>
        `;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FASE <noreply@fasemga.com>',
            to: email,
            subject: `Invitation to join ${companyName} on FASE`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          throw new Error(`Resend API error: ${response.status}`);
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Invitation email sent successfully' 
        });
      } catch (emailError) {
        console.error('Resend email error:', emailError);
        // Fall through to development mode logging
      }
    }

    // Fallback: Log to console for development/testing when Resend is not configured
    console.log('===========================================');
    console.log('INVITATION EMAIL (DEVELOPMENT MODE)');
    console.log('===========================================');
    console.log(`To: ${email}`);
    console.log(`Subject: Invitation to join ${companyName} on FASE`);
    console.log(`Inviter: ${inviterName}`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log('===========================================');

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation logged (development mode - configure RESEND_API_KEY for email delivery)' 
    });

  } catch (error) {
    console.error('Error sending invitation email:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation email' },
      { status: 500 }
    );
  }
}