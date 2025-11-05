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

    // Create invitation email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2D5574;">You're invited to join ${companyName} on FASE</h2>
        <p>Hi ${name},</p>
        <p>${inviterName} has invited you to join <strong>${companyName}</strong> on the Federation of European MGAs (FASE) platform.</p>
        <p>To complete your account setup and gain access to your company's member portal, please click the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #2D5574; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Account Setup</a>
        </div>
        <p>This link will guide you through creating your secure account password and accessing all member benefits.</p>
        <p>Best regards,<br>The FASE Team</p>
        <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact us at <a href="mailto:help@fasemga.com">help@fasemga.com</a></p>
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
      console.log(`Subject: Invitation to join ${companyName} on FASE`);
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