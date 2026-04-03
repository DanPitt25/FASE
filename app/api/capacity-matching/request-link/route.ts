import { NextRequest, NextResponse } from 'next/server';
import { createMagicLink, checkRateLimit } from '../../../../lib/capacity-matching-tokens';

export const dynamic = 'force-dynamic';

const NOTIFICATION_FROM = 'FASE <notifications@fasemga.com>';

async function sendMagicLinkEmail(
  to: string,
  companyName: string,
  url: string
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY not configured - skipping email');
    return false;
  }

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://fasemga.com/fase-logo-rgb.png" alt="FASE" style="height: 48px; margin-bottom: 24px;" />

      <h1 style="color: #2D5574; margin-bottom: 16px;">
        Capacity Matching Questionnaire
      </h1>

      <p style="color: #374151; line-height: 1.6;">
        You requested access to the FASE Capacity Matching questionnaire for <strong>${companyName}</strong>.
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
        If you did not request this link, you can safely ignore this email.
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
        subject: `Your FASE Capacity Matching link - ${companyName}`,
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
  try {
    const body = await request.json();
    const { companyName, contactEmail } = body;

    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    if (!contactEmail?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check rate limiting (max 3 requests per email per 24 hours)
    const allowed = await checkRateLimit(contactEmail.trim());
    if (!allowed) {
      // Don't reveal rate limiting to prevent enumeration
      // Just return success as if we sent the email
      return NextResponse.json({
        success: true,
        message: 'If this email is valid, you will receive a link shortly.',
      });
    }

    // Create the magic link (no contact name for self-request, user fills it in form)
    // Language defaults to 'en' for self-service requests
    const { url } = await createMagicLink(
      companyName.trim(),
      contactEmail.trim(),
      '',
      'self-request',
      undefined,
      'en'
    );

    // Send email
    await sendMagicLinkEmail(contactEmail.trim(), companyName.trim(), url);

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If this email is valid, you will receive a link shortly.',
    });
  } catch (error: any) {
    console.error('Error processing link request:', error);
    // Don't reveal internal errors
    return NextResponse.json({
      success: true,
      message: 'If this email is valid, you will receive a link shortly.',
    });
  }
}
