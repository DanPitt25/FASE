import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

type Language = 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl';

// Load email translations from MGA Rendezvous messages folder
function loadEmailTranslations(language: Language): any {
  try {
    const filePath = path.join(process.cwd(), 'mga-rendezvous', 'messages', language, 'email.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    if (language !== 'en') {
      return loadEmailTranslations('en');
    }
    return {};
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

// Get organization type label
function getOrgTypeLabel(orgType: string, t: any): string {
  const labels: Record<string, string> = {
    mga: t.org_type_mga,
    carrier_broker: t.org_type_carrier_broker,
    service_provider: t.org_type_service_provider,
    MGA: t.org_type_mga,
    carrier: t.org_type_carrier_broker,
    provider: t.org_type_service_provider
  };
  return labels[orgType] || orgType;
}

// Format date for locale
function formatDateForLocale(date: Date, language: Language): string {
  const localeMap: Record<Language, string> = {
    en: 'en-GB',
    fr: 'fr-FR',
    de: 'de-DE',
    es: 'es-ES',
    it: 'it-IT',
    nl: 'nl-NL'
  };

  return date.toLocaleDateString(localeMap[language], {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
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

// Generate ticket confirmation email HTML (same as MGA Rendezvous site)
function generateTicketConfirmationEmail(
  details: {
    registrationId: string;
    companyName: string;
    billingEmail: string;
    organizationType: string;
    numberOfAttendees: number;
    isFaseMember: boolean;
    totalAmount: number;
    attendeeNames: string;
    specialRequests?: string;
    isComplimentary?: boolean;
  },
  language: Language = 'en'
): { subject: string; html: string } {
  const translations = loadEmailTranslations(language);
  const t = translations.ticket_confirmation;

  const subject = replaceTemplateVars(t.subject, { companyName: details.companyName });
  const orgTypeDisplay = getOrgTypeLabel(details.organizationType, t);
  const formattedDate = formatDateForLocale(new Date(), language);
  const formattedAmount = details.isComplimentary ? 'Complimentary (ASASE Member)' : formatCurrencyForLocale(details.totalAmount, language);

  const attendeesList = details.attendeeNames
    .split(', ')
    .map((name: string) => `<li>${name}</li>`)
    .join('');

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
    </div>

    <h2 style="color: #2D5574; margin-bottom: 20px;">${t.banner_title}</h2>

    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 6px; margin: 0 0 25px 0;">
      <p style="margin: 0 0 10px 0; color: #2D5574;"><strong>${t.date_label}</strong> ${formattedDate}</p>
      <p style="margin: 0 0 10px 0; color: #2D5574;"><strong>${t.tickets_label}</strong> ${details.numberOfAttendees}</p>
      <p style="margin: 0; color: #2D5574;"><strong>${t.total_paid_label}</strong> ${formattedAmount}</p>
    </div>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 0 0 25px 0;">
      <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${t.section_event}</h3>
      <p style="margin: 0 0 8px 0; color: #333;"><strong>${t.event_name}</strong></p>
      <p style="margin: 0 0 8px 0; color: #333;">${t.event_date_value}</p>
      <p style="margin: 0; color: #333;">${t.location_value}</p>
    </div>

    <div style="margin: 0 0 25px 0;">
      <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${t.section_billing}</h3>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #333;"><strong>${t.company_label}</strong> ${details.companyName}</p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #333;"><strong>${t.type_label}</strong> ${orgTypeDisplay}</p>
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #333;"><strong>${t.fase_member_label}</strong> ${details.isFaseMember ? t.fase_member_yes : t.fase_member_no}</p>
      <p style="margin: 0; font-size: 14px; color: #333;"><strong>${t.email_label}</strong> ${details.billingEmail}</p>
    </div>

    <div style="margin: 0 0 25px 0;">
      <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${t.section_attendees}</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${attendeesList}
      </ul>
    </div>

    ${details.specialRequests ? `
    <div style="margin: 0 0 25px 0;">
      <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${t.section_requests}</h3>
      <p style="font-size: 14px; margin: 0; color: #333;">${details.specialRequests}</p>
    </div>
    ` : ''}

    <div style="background-color: #fefce8; padding: 20px; border-radius: 6px; margin: 0 0 25px 0; border: 1px solid #fde047;">
      <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${t.section_hotel}</h3>
      <p style="font-size: 14px; margin: 0 0 15px 0; line-height: 1.5; color: #333;">
        ${t.hotel_intro}
      </p>
      <p style="margin: 0 0 15px 0;">
        <a href="https://www.marriott.com/en-gb/event-reservations/reservation-link.mi?id=1767784681245&key=GRP&app=resvlink" style="display: inline-block; background-color: #2D5574; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">${t.hotel_link_text}</a>
      </p>
      <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.5;">
        ${t.hotel_alternative} <a href="mailto:sandra.stojak@fasemga.com" style="color: #2D5574;">sandra.stojak@fasemga.com</a>
      </p>
    </div>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 0 0 25px 0;">
      <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${t.section_next_steps}</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px; font-size: 14px; color: #333;">${t.next_step_1}</li>
        <li style="margin-bottom: 8px; font-size: 14px; color: #333;">${t.next_step_2}</li>
        <li style="margin-bottom: 0; font-size: 14px; color: #333;">${t.next_step_3} <a href="mailto:admin@fasemga.com" style="color: #2D5574;">admin@fasemga.com</a></li>
      </ul>
    </div>

    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 15px 0;">
      ${t.footer_text}
    </p>

    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0;">
      ${t.footer_company}<br>
      <a href="https://fasemga.com" style="color: #2D5574;">www.fasemga.com</a>
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
      organizationType,
      numberOfAttendees,
      totalAmount,
      attendeeNames,
      isFaseMember,
      isComplimentary,
      specialRequests,
      userLocale,
      preview
    } = data;

    // Validate required fields
    if (!email || !registrationId || !companyName || !attendeeNames) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const language = (userLocale || 'en') as Language;

    // Generate the confirmation email
    const { subject, html } = generateTicketConfirmationEmail(
      {
        registrationId,
        companyName,
        billingEmail: email,
        organizationType: organizationType || 'MGA',
        numberOfAttendees: numberOfAttendees || 1,
        isFaseMember: isFaseMember ?? true,
        totalAmount: totalAmount || 0,
        attendeeNames,
        specialRequests,
        isComplimentary
      },
      language
    );

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
