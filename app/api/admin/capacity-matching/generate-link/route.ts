import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess, isAuthError } from '../../../../../lib/admin-auth';
import { createMagicLink } from '../../../../../lib/capacity-matching-tokens';
import {
  SupportedLanguage,
  SalutationType,
  magicLinkEmailTranslations,
  generateMagicLinkEmailHtml,
} from '../../../../../lib/capacity-matching-email-translations';

export const dynamic = 'force-dynamic';

const NOTIFICATION_FROM = 'FASE <notifications@fasemga.com>';

async function sendMagicLinkEmail(
  to: string,
  firstName: string,
  companyName: string,
  url: string,
  expiresAt: Date,
  language: SupportedLanguage = 'en',
  salutation: SalutationType = 'neutral'
) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY not configured - skipping email');
    return false;
  }

  const t = magicLinkEmailTranslations[language];
  const emailHtml = generateMagicLinkEmailHtml(companyName, firstName, url, expiresAt, language, salutation);

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
        subject: t.subject,
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
    const { companyName, firstName, fullName, contactEmail, sendEmail = true, language = 'en', salutation = 'neutral' } = body;

    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    if (!firstName?.trim()) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    }

    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    if (!contactEmail?.trim()) {
      return NextResponse.json({ error: 'Contact email is required' }, { status: 400 });
    }

    // Validate language
    const validLanguages: SupportedLanguage[] = ['en', 'de', 'fr', 'es', 'it', 'nl'];
    const selectedLanguage: SupportedLanguage = validLanguages.includes(language) ? language : 'en';

    // Validate salutation
    const validSalutations: SalutationType[] = ['male', 'female', 'neutral'];
    const selectedSalutation: SalutationType = validSalutations.includes(salutation) ? salutation : 'neutral';

    // Create the magic link (pass fullName as the contact name for form pre-fill)
    const { token, url, expiresAt } = await createMagicLink(
      companyName.trim(),
      contactEmail.trim(),
      fullName.trim(),
      'admin',
      authResult.userId
    );

    // Optionally send email (use firstName for the salutation)
    let emailSent = false;
    if (sendEmail) {
      emailSent = await sendMagicLinkEmail(
        contactEmail.trim(),
        firstName.trim(),
        companyName.trim(),
        url,
        expiresAt,
        selectedLanguage,
        selectedSalutation
      );
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
