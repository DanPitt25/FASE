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

const HOTEL_ARTS_URL = 'https://www.ritzcarlton.com/en/hotels/bcnrz-hotel-arts-barcelona/overview/';
const RENDEZVOUS_URL = 'https://mgarendezvous.com';
const RENDEZVOUS_IMAGE_URL = 'https://mgarendezvous.com/cathedral.jpg';

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      cc,
      fullName,
      variant, // 'paid' or 'unpaid'
      gender, // 'm', 'f', or undefined for neutral
      userLocale = 'en',
      preview = false
    } = await request.json();

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!variant || !['paid', 'unpaid'].includes(variant)) {
      return NextResponse.json({ error: 'Variant must be "paid" or "unpaid"' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey && !preview) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    // Load translations
    const emailTranslations = loadEmailTranslations(userLocale);
    const templateKey = variant === 'paid' ? 'rendezvous_2026_paid' : 'rendezvous_2026_unpaid';
    const template = emailTranslations[templateKey] || loadEmailTranslations('en')[templateKey];
    const signatures = emailTranslations.signatures || loadEmailTranslations('en').signatures;

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 500 });
    }

    // Process link placeholders
    const processLinks = (text: string) => {
      return text
        .replace(/\{hotelLink\}(.*?)\{\/hotelLink\}/g, `<a href="${HOTEL_ARTS_URL}" style="color: #1e3a5f; text-decoration: underline;">$1</a>`)
        .replace(/\{rendezvousLink\}(.*?)\{\/rendezvousLink\}/g, `<a href="${RENDEZVOUS_URL}" style="color: #1e3a5f; text-decoration: underline;">$1</a>`);
    };

    // Select salutation based on gender
    const salutation = gender === 'm' ? template.dear_m : gender === 'f' ? template.dear_f : template.dear;
    const greeting = fullName ? `${salutation} ${fullName},` : `${salutation},`;
    const signature = signatures?.william_pitt || {
      regards: 'Best regards,',
      name: 'William Pitt',
      title: 'Executive Director, FASE'
    };

    // Build HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header with Logo -->
    <div style="text-align: center; padding: 30px 20px 20px;">
      <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
    </div>

    <!-- Hero Image -->
    <div style="width: 100%;">
      <a href="${RENDEZVOUS_URL}" style="display: block;">
        <img src="${RENDEZVOUS_IMAGE_URL}" alt="MGA Rendezvous 2026 - Barcelona" style="width: 100%; height: auto; display: block;">
      </a>
    </div>

    <!-- Content -->
    <div style="padding: 30px; color: #333333;">
      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
        ${greeting}
      </p>

      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
        ${processLinks(template.intro)}
      </p>

      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
        ${template.description}
      </p>

      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
        ${template.member_benefit}
      </p>

      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
        ${processLinks(template.cta)}
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${RENDEZVOUS_URL}/register" style="display: inline-block; background-color: #1e3a5f; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 4px;">
          ${template.register_button || 'Register Now'}
        </a>
      </div>

      ${template.closing ? `<p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">${template.closing}</p>` : ''}

      <!-- Signature -->
      <div style="margin-top: 30px; font-size: 16px; line-height: 1.5;">
        <p style="margin: 0 0 5px 0;">${signature.regards}</p>
        <p style="margin: 0 0 3px 0;"><strong>${signature.name}</strong></p>
        <p style="margin: 0; color: #666; font-style: italic;">${signature.title}</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
      <p style="margin: 0; color: #ffffff; font-size: 14px;">
        FASE - Fédération des Agences de Souscription Européennes
      </p>
      <p style="margin: 10px 0 0 0; color: #cccccc; font-size: 12px;">
        <a href="https://fasemga.com" style="color: #cccccc;">fasemga.com</a> |
        <a href="${RENDEZVOUS_URL}" style="color: #cccccc;">mgarendezvous.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    // Plain text version
    const textContent = `${greeting}

${template.intro.replace(/\{hotelLink\}(.*?)\{\/hotelLink\}/g, `$1 (${HOTEL_ARTS_URL})`).replace(/\{rendezvousLink\}(.*?)\{\/rendezvousLink\}/g, `$1 (${RENDEZVOUS_URL})`)}

${template.description}

${template.member_benefit.replace(/<strong>/g, '').replace(/<\/strong>/g, '')}

${template.cta.replace(/\{hotelLink\}(.*?)\{\/hotelLink\}/g, '$1').replace(/\{rendezvousLink\}(.*?)\{\/rendezvousLink\}/g, '$1')}

Register: ${RENDEZVOUS_URL}/register

${template.closing || ''}

${signature.regards}
${signature.name}
${signature.title}`;

    if (preview) {
      return NextResponse.json({
        success: true,
        to: email,
        cc: cc || null,
        subject: template.subject,
        htmlContent,
        textContent
      });
    }

    // Send email via Resend
    const emailPayload: any = {
      from: 'William Pitt <william.pitt@fasemga.com>',
      to: email,
      subject: template.subject,
      html: htmlContent,
      text: textContent
    };

    if (cc) {
      emailPayload.cc = cc;
    }

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
    console.log(`✅ Rendezvous announcement sent to ${email}:`, result.id);

    return NextResponse.json({
      success: true,
      messageId: result.id,
      to: email,
      subject: template.subject
    });

  } catch (error: any) {
    console.error('Rendezvous announcement email failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
