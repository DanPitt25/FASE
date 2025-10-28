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

    // TODO: Replace with actual email service (SendGrid, AWS SES, etc.)
    // For now, we'll just log the email details
    console.log('Sending invitation email:', {
      to: email,
      subject: `Invitation to join ${companyName} on FASE`,
      body: `
        Hi ${name},
        
        ${inviterName} has invited you to join ${companyName} on the Federation of European MGAs (FASE) platform.
        
        To complete your account setup and gain access to your company's member portal, please click the link below:
        
        ${inviteUrl}
        
        This link will guide you through creating your secure account password and accessing all member benefits.
        
        Best regards,
        The FASE Team
      `
    });

    // In a production environment, you would integrate with an email service here
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: `Invitation to join ${companyName} on FASE`,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're invited to join ${companyName} on FASE</h2>
          <p>Hi ${name},</p>
          <p>${inviterName} has invited you to join ${companyName} on the Federation of European MGAs (FASE) platform.</p>
          <p>To complete your account setup and gain access to your company's member portal, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Account Setup</a>
          </div>
          <p>This link will guide you through creating your secure account password and accessing all member benefits.</p>
          <p>Best regards,<br>The FASE Team</p>
        </div>
      `
    };

    await sgMail.send(msg);
    */

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending invitation email:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation email' },
      { status: 500 }
    );
  }
}