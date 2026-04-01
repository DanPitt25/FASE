import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, isAuthError } from '../../../../../lib/admin-auth';
import { createMagicLink } from '../../../../../lib/capacity-matching-tokens';

export const dynamic = 'force-dynamic';

const NOTIFICATION_FROM = 'FASE <notifications@fasemga.com>';

async function sendMagicLinkEmail(
  to: string,
  companyName: string,
  url: string,
  expiresAt: Date
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY not configured - skipping email');
    return false;
  }

  const expiresFormatted = expiresAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://fasemga.com/fase-logo-rgb.png" alt="FASE" style="height: 48px; margin-bottom: 24px;" />

      <h1 style="color: #2D5574; margin-bottom: 16px;">
        Capacity Matching Questionnaire
      </h1>

      <p style="color: #374151; line-height: 1.6;">
        You have been invited to complete the FASE Capacity Matching questionnaire for <strong>${companyName}</strong>.
      </p>

      <p style="color: #374151; line-height: 1.6;">
        This questionnaire helps us understand your growth ambitions and connect you with suitable capacity providers.
      </p>

      <div style="margin: 32px 0;">
        <a href="${url}" style="display: inline-block; background-color: #2D5574; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          Complete Questionnaire
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        This link will expire on <strong>${expiresFormatted}</strong>.
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        If you did not expect this email, you can safely ignore it.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

      <p style="color: #9ca3af; font-size: 12px;">
        FASE - Fédération des Agences de Souscription Européennes<br />
        <a href="https://fasemga.com" style="color: #2D5574;">fasemga.com</a>
      </p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: NOTIFICATION_FROM,
        to,
        subject: `Complete your FASE Capacity Matching questionnaire - ${companyName}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send magic link email:', await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAccess(request);
  if (isAuthError(authResult)) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { companyName, contactEmail, sendEmail = true } = body;

    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    if (!contactEmail?.trim()) {
      return NextResponse.json({ error: 'Contact email is required' }, { status: 400 });
    }

    // Create the magic link
    const { token, url, expiresAt } = await createMagicLink(
      companyName.trim(),
      contactEmail.trim(),
      'admin',
      authResult.userId
    );

    // Optionally send email
    let emailSent = false;
    if (sendEmail) {
      emailSent = await sendMagicLinkEmail(contactEmail.trim(), companyName.trim(), url, expiresAt);
    }

    return NextResponse.json({
      success: true,
      url,
      token,
      expiresAt: expiresAt.toISOString(),
      emailSent,
    });
  } catch (error: any) {
    console.error('Error generating magic link:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
