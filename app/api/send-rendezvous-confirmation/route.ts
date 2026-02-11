import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

type Language = 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl';

// Load email translations from messages folder
function loadEmailTranslations(language: Language): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'email.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    console.error(`Failed to load email translations for ${language}:`, error.message);
    if (language !== 'en') {
      return loadEmailTranslations('en');
    }
    throw new Error(`Could not load email translations: ${error.message}`);
  }
}

// Simple template replacement function
function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  let result = template;
  Object.keys(vars).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, vars[key]);
  });
  return result;
}

// Format currency for locale
function formatCurrencyForLocale(amount: number, language: Language): string {
  const localeMap: Record<Language, string> = {
    en: 'en-GB',
    fr: 'fr-FR',
    de: 'de-DE',
    es: 'es-ES',
    it: 'it-IT',
    nl: 'nl-NL'
  };

  return amount.toLocaleString(localeMap[language], {
    style: 'currency',
    currency: 'EUR'
  });
}

// Generate confirmation email HTML (simple version from MGA Rendezvous site)
function generateConfirmationEmail(
  details: {
    registrationId: string;
    companyName: string;
    numberOfAttendees: number;
    totalAmount: number;
    attendeeNames?: string;
    isComplimentary?: boolean;
  },
  language: Language = 'en'
): { subject: string; html: string } {
  const translations = loadEmailTranslations(language);
  const t = translations.rendezvous_confirmation;

  // Ensure translations loaded correctly
  if (!t || !t.subject) {
    throw new Error(`Missing email translations for language: ${language}`);
  }

  const subject = replaceTemplateVars(t.subject, { companyName: details.companyName });
  const formattedAmount = details.isComplimentary
    ? 'Complimentary (ASASE Member)'
    : formatCurrencyForLocale(details.totalAmount, language);

  // Format attendee list if provided
  const attendeesList = details.attendeeNames
    ? details.attendeeNames.split(', ').map((name: string) => `<li style="margin-bottom: 4px;">${name}</li>`).join('')
    : '';

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
    </div>

    <h2 style="color: #2D5574; margin-bottom: 20px;">${t.registration_details}</h2>

    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 15px 0;">
      ${t.thank_you}
    </p>

    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 20px 0;">
      ${t.payment_confirmed}
    </p>

    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; color: #2D5574;"><strong>${t.tickets}</strong> ${details.numberOfAttendees}</p>
      <p style="margin: 0; color: #2D5574;"><strong>${t.total_paid}</strong> ${formattedAmount}</p>
    </div>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${t.event_info}</h3>
      <p style="margin: 0 0 8px 0; color: #333;"><strong>${t.event_name}</strong></p>
      <p style="margin: 0 0 8px 0; color: #333;">${t.event_date}</p>
      <p style="margin: 0; color: #333;">${t.event_location}</p>
    </div>

    ${attendeesList ? `
    <div style="margin: 20px 0;">
      <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">Registered Attendees</h3>
      <ul style="margin: 0; padding-left: 20px; color: #333;">
        ${attendeesList}
      </ul>
    </div>
    ` : ''}

    <div style="background-color: #fefce8; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #fde047;">
      <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${t.hotel_title}</h3>
      <p style="margin: 0 0 15px 0; color: #333; font-size: 14px; line-height: 1.5;">
        ${t.hotel_intro}
      </p>
      <p style="margin: 0 0 15px 0;">
        <a href="https://www.marriott.com/en-gb/event-reservations/reservation-link.mi?id=1767784681245&key=GRP&app=resvlink" style="display: inline-block; background-color: #2D5574; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">${t.hotel_link_text}</a>
      </p>
      <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.5;">
        ${t.hotel_alternative} <a href="mailto:sandra.stojak@fasemga.com" style="color: #2D5574;">sandra.stojak@fasemga.com</a>
      </p>
    </div>

    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 20px 0 15px 0;">
      ${t.next_steps}
    </p>

    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0;">
      ${t.contact} <a href="mailto:admin@fasemga.com" style="color: #2D5574;">admin@fasemga.com</a>
    </p>

    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 0 0;">
      ${t.sign_off}<br><br>
      <strong>${t.team_name}</strong>
    </p>
  </div>
</div>`;

  return { subject, html };
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      email,
      cc,
      freeformSender,
      registrationId,
      companyName,
      numberOfAttendees,
      totalAmount,
      attendeeNames,
      isComplimentary,
      userLocale,
      preview
    } = data;

    // Validate required fields
    if (!email || !registrationId || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const language = (userLocale || 'en') as Language;

    // Generate the confirmation email
    const { subject, html } = generateConfirmationEmail(
      {
        registrationId,
        companyName,
        numberOfAttendees: numberOfAttendees || 1,
        totalAmount: totalAmount || 0,
        attendeeNames,
        isComplimentary
      },
      language
    );

    // Validate that subject and html were generated
    if (!subject || !html) {
      return NextResponse.json(
        { error: 'Failed to generate email content - missing subject or body' },
        { status: 500 }
      );
    }

    // If preview mode, return the HTML without sending
    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        to: email,
        cc: cc || null,
        subject,
        htmlContent: html
      });
    }

    // Send the email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    const senderMap: Record<string, string> = {
      'admin@fasemga.com': 'FASE Admin <admin@fasemga.com>',
      'aline.sullivan@fasemga.com': 'Aline Sullivan <aline.sullivan@fasemga.com>',
      'william.pitt@fasemga.com': 'William Pitt <william.pitt@fasemga.com>',
      'info@fasemga.com': 'FASE Info <info@fasemga.com>',
      'media@fasemga.com': 'FASE Media <media@fasemga.com>'
    };

    const emailPayload: any = {
      from: senderMap[freeformSender] || senderMap['admin@fasemga.com'],
      to: email,
      subject,
      html
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
    console.log('✅ Rendezvous confirmation email sent:', result.id);

    return NextResponse.json({
      success: true,
      to: email,
      subject,
      messageId: result.id
    });
  } catch (error: any) {
    console.error('Rendezvous confirmation email error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
