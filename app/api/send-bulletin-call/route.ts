import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

// Salutations by language and gender
const salutations: Record<string, { m: (name: string) => string; f: (name: string) => string }> = {
  en: {
    m: (name) => `Dear Mr ${name}`,
    f: (name) => `Dear Ms ${name}`
  },
  fr: {
    m: (name) => `Cher Monsieur ${name}`,
    f: (name) => `Chère Madame ${name}`
  },
  de: {
    m: (name) => `Sehr geehrter Herr ${name}`,
    f: (name) => `Sehr geehrte Frau ${name}`
  },
  es: {
    m: (name) => `Estimado Sr. ${name}`,
    f: (name) => `Estimada Sra. ${name}`
  },
  it: {
    m: (name) => `Gentile Sig. ${name}`,
    f: (name) => `Gentile Sig.ra ${name}`
  },
  nl: {
    m: (name) => `Geachte heer ${name}`,
    f: (name) => `Geachte mevrouw ${name}`
  }
};

// Localized deadlines
const localizedDeadlines: Record<string, string> = {
  en: 'Friday, 31 January',
  fr: 'vendredi 31 janvier',
  de: 'Freitag, 31. Januar',
  es: 'viernes, 31 de enero',
  it: 'venerdì 31 gennaio',
  nl: 'vrijdag 31 januari'
};

// Bulletin templates in all supported languages
const bulletinTemplates: Record<string, { subject: string; body: (salutation: string, deadline: string) => string }> = {
  en: {
    subject: 'Invitation to Contribute to The Entrepreneurial Underwriter – January Edition',
    body: (salutation: string, deadline: string) => `${salutation},

We shall shortly be issuing the first edition of The Entrepreneurial Underwriter, FASE's monthly member bulletin, and we would be pleased to include any items that may be relevant to our members from your organization.

This bulletin will highlight news, achievements, and significant developments from our member community. Should you wish to share any of the following, we would be grateful to receive them:

• Company announcements or milestones
• New appointments or team changes
• Product launches or partnerships
• Industry insights or opinion pieces
• Upcoming events or webinars

We kindly request that you send details to admin@fasemga.com by ${deadline} for inclusion in next week's edition.

The Entrepreneurial Underwriter will be distributed to all FASE members and posted on our member portal.`
  },
  fr: {
    subject: 'Invitation à contribuer à The Entrepreneurial Underwriter – Édition de janvier',
    body: (salutation: string, deadline: string) => `${salutation},

Nous publierons prochainement la première édition de The Entrepreneurial Underwriter, le bulletin mensuel des membres de FASE, et nous souhaiterions y inclure toute information pertinente pour nos membres provenant de votre organisation.

Ce bulletin mettra en avant les actualités, les réalisations et les développements significatifs de notre communauté de membres. Si vous souhaitez partager l'un des éléments suivants, nous vous prions de bien vouloir nous les transmettre :

• Annonces ou étapes importantes de l'entreprise
• Nouvelles nominations ou évolutions d'équipe
• Lancements de produits ou partenariats
• Analyses sectorielles ou articles de réflexion
• Événements ou webinaires à venir

Nous vous prions de bien vouloir envoyer les détails à admin@fasemga.com avant le ${deadline} pour inclusion dans l'édition de la semaine prochaine.

The Entrepreneurial Underwriter sera distribué à tous les membres de FASE et publié sur notre portail membres.`
  },
  de: {
    subject: 'Einladung zur Mitwirkung an The Entrepreneurial Underwriter – Januar-Ausgabe',
    body: (salutation: string, deadline: string) => `${salutation},

wir werden in Kürze die erste Ausgabe von The Entrepreneurial Underwriter, dem monatlichen Mitglieder-Newsletter von FASE, veröffentlichen und würden uns freuen, relevante Beiträge Ihrer Organisation für unsere Mitglieder aufnehmen zu dürfen.

Dieser Newsletter wird Neuigkeiten, Erfolge und bedeutende Entwicklungen aus unserer Mitgliedergemeinschaft hervorheben. Sollten Sie eines der folgenden Themen teilen wollen, würden wir uns über Ihre Zusendung freuen:

• Unternehmensankündigungen oder Meilensteine
• Neue Ernennungen oder Personalveränderungen
• Produkteinführungen oder Partnerschaften
• Brancheneinblicke oder Fachbeiträge
• Kommende Veranstaltungen oder Webinare

Wir bitten Sie, die Details bis ${deadline} an admin@fasemga.com zu senden, damit sie in die Ausgabe der nächsten Woche aufgenommen werden können.

The Entrepreneurial Underwriter wird an alle FASE-Mitglieder verteilt und auf unserem Mitgliederportal veröffentlicht.`
  },
  es: {
    subject: 'Invitación a contribuir a The Entrepreneurial Underwriter – Edición de enero',
    body: (salutation: string, deadline: string) => `${salutation},

Próximamente publicaremos la primera edición de The Entrepreneurial Underwriter, el boletín mensual para miembros de FASE, y nos complacería incluir cualquier información relevante para nuestros miembros procedente de su organización.

Este boletín destacará noticias, logros y desarrollos significativos de nuestra comunidad de miembros. Si desea compartir alguno de los siguientes elementos, le agradeceríamos nos los hiciera llegar:

• Anuncios o hitos de la empresa
• Nuevos nombramientos o cambios en el equipo
• Lanzamientos de productos o alianzas
• Perspectivas del sector o artículos de opinión
• Próximos eventos o seminarios web

Le rogamos envíe los detalles a admin@fasemga.com antes del ${deadline} para su inclusión en la edición de la próxima semana.

The Entrepreneurial Underwriter se distribuirá a todos los miembros de FASE y se publicará en nuestro portal de miembros.`
  },
  it: {
    subject: 'Invito a contribuire a The Entrepreneurial Underwriter – Edizione di gennaio',
    body: (salutation: string, deadline: string) => `${salutation},

a breve pubblicheremo la prima edizione di The Entrepreneurial Underwriter, il bollettino mensile per i membri FASE, e saremmo lieti di includere eventuali contenuti rilevanti per i nostri membri provenienti dalla Sua organizzazione.

Questo bollettino metterà in evidenza notizie, traguardi e sviluppi significativi della nostra comunità di membri. Qualora desiderasse condividere uno dei seguenti elementi, La preghiamo di farceli pervenire:

• Annunci aziendali o traguardi raggiunti
• Nuove nomine o cambiamenti nel team
• Lanci di prodotti o partnership
• Approfondimenti di settore o articoli di riflessione
• Eventi o webinar in programma

La preghiamo di inviare i dettagli a admin@fasemga.com entro ${deadline} per l'inclusione nell'edizione della prossima settimana.

The Entrepreneurial Underwriter sarà distribuito a tutti i membri FASE e pubblicato sul nostro portale membri.`
  },
  nl: {
    subject: 'Uitnodiging om bij te dragen aan The Entrepreneurial Underwriter – Januari-editie',
    body: (salutation: string, deadline: string) => `${salutation},

Binnenkort brengen wij de eerste editie uit van The Entrepreneurial Underwriter, de maandelijkse nieuwsbrief voor FASE-leden, en wij zouden graag relevante items van uw organisatie opnemen ten behoeve van onze leden.

Deze nieuwsbrief zal nieuws, prestaties en belangrijke ontwikkelingen uit onze ledengemeenschap uitlichten. Indien u een van de volgende items wenst te delen, verzoeken wij u deze aan ons toe te zenden:

• Bedrijfsaankondigingen of mijlpalen
• Nieuwe benoemingen of wijzigingen in het team
• Productlanceringen of partnerschappen
• Branche-inzichten of vakartikelen
• Aankomende evenementen of webinars

Wij verzoeken u de details vóór ${deadline} te sturen naar admin@fasemga.com voor opname in de editie van volgende week.

The Entrepreneurial Underwriter wordt verspreid onder alle FASE-leden en gepubliceerd op ons ledenportaal.`
  }
};

// Load email translations for signatures
function loadEmailTranslations(language: string): any {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'email.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch {
    if (language !== 'en') {
      return loadEmailTranslations('en');
    }
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();

    // Validate required fields
    const requiredFields = ['email', 'fullName'];
    const missingFields = requiredFields.filter(field => !requestData[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const isPreview = requestData.preview === true;

    // Get locale
    const userLocale = requestData.userLocale || 'en';
    const supportedLocales = ['en', 'fr', 'de', 'es', 'it', 'nl'];
    const locale = supportedLocales.includes(userLocale) ? userLocale : 'en';

    // Get template for locale
    const template = bulletinTemplates[locale] || bulletinTemplates['en'];
    const deadline = localizedDeadlines[locale] || localizedDeadlines['en'];

    // Build salutation based on gender
    const gender = requestData.gender || 'm';
    const recipientName = requestData.fullName;
    const localeSalutations = salutations[locale] || salutations['en'];
    const salutation = gender === 'f' ? localeSalutations.f(recipientName) : localeSalutations.m(recipientName);

    // Load signatures
    const emailTranslations = loadEmailTranslations(locale);
    const signatures = emailTranslations.signatures || {};
    const signature = signatures['admin_team'] || {
      regards: 'Best regards,',
      name: 'The FASE Team',
      title: ''
    };

    // Generate email body
    const bodyText = template.body(salutation, deadline);

    // Create HTML content
    const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
    </div>

    <div style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 30px;">
      ${bodyText.split('\n\n').map(para => {
        if (para.startsWith('•')) {
          const items = para.split('\n').map(item => `<li style="margin-bottom: 8px;">${item.replace('• ', '')}</li>`).join('');
          return `<ul style="margin: 16px 0; padding-left: 20px;">${items}</ul>`;
        }
        return `<p style="margin: 0 0 16px 0;">${para.replace(/\n/g, '<br>')}</p>`;
      }).join('')}
    </div>

    <div style="font-size: 16px; line-height: 1.5; color: #333;">
      <p style="margin: 0 0 5px 0;">${signature.regards}</p>
      <p style="margin: 0 0 3px 0;"><strong>${signature.name}</strong></p>
      ${signature.title ? `<p style="margin: 0; color: #666; font-style: italic;">${signature.title}</p>` : ''}
    </div>
  </div>
</div>`;

    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        to: requestData.email,
        cc: requestData.cc || null,
        subject: template.subject,
        htmlContent: htmlContent,
        textContent: bodyText + `\n\n${signature.regards}\n${signature.name}${signature.title ? '\n' + signature.title : ''}`
      });
    }

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    const emailPayload: any = {
      from: 'FASE Admin <admin@fasemga.com>',
      to: requestData.email,
      subject: template.subject,
      html: htmlContent,
      text: bodyText + `\n\n${signature.regards}\n${signature.name}${signature.title ? '\n' + signature.title : ''}`
    };

    if (requestData.cc) {
      emailPayload.cc = requestData.cc;
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
    console.log(`✅ Bulletin call email sent to ${requestData.email}:`, result.id);

    return NextResponse.json({
      success: true,
      message: `Email sent successfully (ID: ${result.id})`,
      emailId: result.id,
      to: requestData.email,
      subject: template.subject
    });

  } catch (error: any) {
    console.error('Failed to send bulletin call email:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
