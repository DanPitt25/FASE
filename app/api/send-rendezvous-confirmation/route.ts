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
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Georgia, 'Times New Roman', serif; margin: 0; padding: 20px; color: #333; line-height: 1.7; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; }
        .header { text-align: center; padding: 30px 20px; border-bottom: 2px solid #C9A227; background-color: #2D5574; }
        .logo { font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: 1px; margin-bottom: 5px; }
        .logo-french { font-size: 12px; color: #C9A227; font-style: italic; }
        .confirmation-banner { background-color: #2D5574; color: #ffffff; text-align: center; padding: 20px; }
        .confirmation-banner h2 { margin: 0 0 10px 0; font-size: 20px; font-weight: normal; }
        .confirmation-number { font-size: 14px; color: #C9A227; }
        .content { padding: 30px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 14px; font-weight: bold; color: #2D5574; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; border-bottom: 1px solid #C9A227; padding-bottom: 8px; }
        .detail-row { margin-bottom: 8px; }
        .detail-label { color: #6b7280; font-size: 13px; }
        .detail-value { color: #333; font-size: 14px; }
        .attendee-list { margin: 0; padding: 0; list-style: none; }
        .attendee-list li { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
        .attendee-list li:last-child { border-bottom: none; }
        .next-steps { background-color: #f8f9fa; padding: 20px; border-radius: 4px; }
        .next-steps ul { margin: 0; padding-left: 20px; }
        .next-steps li { margin-bottom: 8px; font-size: 14px; }
        .footer { text-align: center; padding: 25px; background-color: #f8f9fa; border-top: 1px solid #e5e7eb; }
        .footer-text { font-size: 12px; color: #6b7280; margin-bottom: 10px; }
        .footer-contact { font-size: 12px; color: #2D5574; }
        a { color: #2D5574; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${t.header_title}</div>
            <div class="logo-french">${t.header_french}</div>
        </div>

        <div class="confirmation-banner">
            <h2>${t.banner_title}</h2>
            <div class="confirmation-number">${t.confirmation_label} ${details.registrationId}</div>
        </div>

        <div class="content">
            <div class="section">
                <div class="section-title">${t.section_payment}</div>
                <div class="detail-row">
                    <span class="detail-label">${t.date_label}</span>
                    <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t.tickets_label}</span>
                    <span class="detail-value">${details.numberOfAttendees}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t.total_paid_label}</span>
                    <span class="detail-value">${formattedAmount}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">${t.section_event}</div>
                <div class="detail-row">
                    <span class="detail-label">${t.event_label}</span>
                    <span class="detail-value">${t.event_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t.event_date_label}</span>
                    <span class="detail-value">${t.event_date_value}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t.location_label}</span>
                    <span class="detail-value">${t.location_value}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">${t.section_billing}</div>
                <div class="detail-row">
                    <span class="detail-label">${t.company_label}</span>
                    <span class="detail-value">${details.companyName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t.type_label}</span>
                    <span class="detail-value">${orgTypeDisplay}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t.fase_member_label}</span>
                    <span class="detail-value">${details.isFaseMember ? t.fase_member_yes : t.fase_member_no}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t.email_label}</span>
                    <span class="detail-value">${details.billingEmail}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">${t.section_attendees}</div>
                <ul class="attendee-list">
                    ${attendeesList}
                </ul>
            </div>

            ${details.specialRequests ? `
            <div class="section">
                <div class="section-title">${t.section_requests}</div>
                <p style="font-size: 14px; margin: 0;">${details.specialRequests}</p>
            </div>
            ` : ''}

            <div class="section">
                <div style="background-color: #fefce8; padding: 20px; border-radius: 4px; border: 1px solid #fde047;">
                    <div class="section-title" style="border-bottom: none; margin-bottom: 10px;">${t.section_hotel}</div>
                    <p style="font-size: 14px; margin: 0 0 15px 0; line-height: 1.5;">
                        ${t.hotel_intro}
                    </p>
                    <p style="margin: 0 0 15px 0;">
                        <a href="https://www.marriott.com/en-gb/event-reservations/reservation-link.mi?id=1767784681245&key=GRP&app=resvlink" style="display: inline-block; background-color: #2D5574; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">${t.hotel_link_text}</a>
                    </p>
                    <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.5;">
                        ${t.hotel_alternative} <a href="mailto:sandra.stojak@fasemga.com">sandra.stojak@fasemga.com</a>
                    </p>
                </div>
            </div>

            <div class="section">
                <div class="next-steps">
                    <div class="section-title" style="border-bottom: none; margin-bottom: 10px;">${t.section_next_steps}</div>
                    <ul>
                        <li>${t.next_step_1}</li>
                        <li>${t.next_step_2}</li>
                        <li>${t.next_step_3} <a href="mailto:admin@fasemga.com">admin@fasemga.com</a></li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="footer-text">${t.footer_text}</div>
            <div class="footer-contact">
                ${t.footer_company}<br>
                <a href="https://fasemga.com">www.fasemga.com</a>
            </div>
        </div>
    </div>
</body>
</html>`;

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
