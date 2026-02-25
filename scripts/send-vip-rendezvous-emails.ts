/**
 * Send VIP complimentary registration emails for MGA Rendezvous
 * All emails sent to danielhpitt@gmail.com for review
 * From: William Pitt
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const HOTEL_LINK = 'https://www.marriott.com/en-gb/event-reservations/reservation-link.mi?id=1767784681245&key=GRP&app=resvlink';

interface VIPRegistration {
  name: string;
  role: string;
  organization: string;
  language: 'en' | 'it' | 'nl';
}

const vipRegistrations: VIPRegistration[] = [
  {
    name: 'Nicola [SURNAME]',
    role: 'Presidente',
    organization: 'AIMGA',
    language: 'it'
  },
  {
    name: 'Mike Keating',
    role: 'CEO',
    organization: 'MGAA',
    language: 'en'
  },
  {
    name: 'Valentina Visser',
    role: 'Voorzitter',
    organization: 'NVGA',
    language: 'nl'
  }
];

function generateEmailHtml(reg: VIPRegistration): { subject: string; html: string } {
  const hotelSection = {
    en: {
      title: 'Reserve Your Room',
      intro: 'We have secured rooms at our conference hotel, the Hotel Arts, at a significant discount to the standard room rate.',
      buttonText: 'Reserve my room now',
      alternative: 'If you would prefer to explore other local accommodation options within walking distance of the Hotel Arts, please contact Sandra Stojak at'
    },
    it: {
      title: 'Prenota la Tua Camera',
      intro: 'Abbiamo riservato camere presso il nostro hotel della conferenza, l\'Hotel Arts, a un prezzo significativamente scontato rispetto alla tariffa standard.',
      buttonText: 'Prenota ora la mia camera',
      alternative: 'Se preferisce esplorare altre opzioni di alloggio nelle vicinanze dell\'Hotel Arts, può contattare Sandra Stojak all\'indirizzo'
    },
    nl: {
      title: 'Reserveer Uw Kamer',
      intro: 'Wij hebben kamers gereserveerd in ons conferentiehotel, het Hotel Arts, tegen een aanzienlijke korting op het standaardtarief.',
      buttonText: 'Reserveer nu mijn kamer',
      alternative: 'Als u liever andere lokale accommodatiemogelijkheden op loopafstand van het Hotel Arts wilt verkennen, neem dan contact op met Sandra Stojak via'
    }
  };

  const signOff = {
    en: 'Best regards,',
    it: 'Cordiali saluti,',
    nl: 'Met vriendelijke groet,'
  };

  const t = hotelSection[reg.language];
  const sign = signOff[reg.language];

  const subject = `MGA Rendezvous Registration Confirmed - ${reg.organization}`;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
    </div>

    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 20px 0;">
      Dear ${reg.name}
    </p>

    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 20px 0;">
      We are pleased to confirm your registration for the MGA Rendezvous at the Hotel Arts in Barcelona on May 11 and 12.
    </p>

    <div style="background-color: #fefce8; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #fde047;">
      <h3 style="color: #2D5574; margin: 0 0 15px 0; font-size: 16px;">${t.title}</h3>
      <p style="margin: 0 0 15px 0; color: #333; font-size: 14px; line-height: 1.5;">
        ${t.intro}
      </p>
      <p style="margin: 0 0 15px 0;">
        <a href="${HOTEL_LINK}" style="display: inline-block; background-color: #2D5574; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-size: 14px;">${t.buttonText}</a>
      </p>
      <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.5;">
        ${t.alternative} <a href="mailto:sandra.stojak@fasemga.com" style="color: #2D5574;">sandra.stojak@fasemga.com</a>
      </p>
    </div>

    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 25px 0 0 0;">
      ${sign}<br><br>
      <strong>William Pitt</strong><br>
      Secretary General, FASE
    </p>
  </div>
</div>`;

  return { subject, html };
}

async function sendEmail(to: string, subject: string, html: string, label: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'William Pitt <william.pitt@fasemga.com>',
      to,
      subject: `[DRAFT - ${label}] ${subject}`,
      html
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send ${label}: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ Sent ${label}: ${result.id}`);
  return result;
}

async function main() {
  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not set');
    process.exit(1);
  }

  const testRecipient = 'danielhpitt@gmail.com';

  console.log('Sending VIP registration email drafts to:', testRecipient);
  console.log('---');

  for (const reg of vipRegistrations) {
    const { subject, html } = generateEmailHtml(reg);
    const label = `${reg.name} (${reg.role}, ${reg.organization}) - ${reg.language.toUpperCase()}`;

    try {
      await sendEmail(testRecipient, subject, html, label);
    } catch (error) {
      console.error(`❌ Failed: ${label}`, error);
    }
  }

  console.log('---');
  console.log('Done!');
}

main();
