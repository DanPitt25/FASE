import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

// Bulletin templates in all supported languages
const bulletinTemplates: Record<string, { subject: string; body: (name: string, deadline: string) => string }> = {
  en: {
    subject: 'Call for Content: The Entrepreneurial Underwriter',
    body: (name: string, deadline: string) => `Dear ${name},

We'll shortly be issuing the first edition of The Entrepreneurial Underwriter, FASE's monthly member bulletin, and we'd like to include any items that may be relevant to our members from your organization.

This bulletin will highlight news, achievements, and significant developments from our member community. If you have any of the following you'd like to share, please send them our way:

• Company announcements or milestones
• New appointments or team updates
• Product launches or partnerships
• Industry insights or thought leadership
• Upcoming events or webinars

Please send details to admin@fasemga.com by ${deadline} for inclusion in next week's edition.

The Entrepreneurial Underwriter will be distributed to all FASE members and posted on our member portal.`
  },
  fr: {
    subject: 'Appel à contributions : The Entrepreneurial Underwriter',
    body: (name: string, deadline: string) => `Cher/Chère ${name},

Nous publierons prochainement la première édition de The Entrepreneurial Underwriter, le bulletin mensuel des membres de FASE, et nous aimerions y inclure toute information pertinente pour nos membres provenant de votre organisation.

Ce bulletin mettra en avant les actualités, les réalisations et les développements significatifs de notre communauté de membres. Si vous avez l'un des éléments suivants à partager, n'hésitez pas à nous les envoyer :

• Annonces ou étapes importantes de l'entreprise
• Nouvelles nominations ou évolutions d'équipe
• Lancements de produits ou partenariats
• Analyses sectorielles ou leadership éclairé
• Événements ou webinaires à venir

Veuillez envoyer les détails à admin@fasemga.com avant le ${deadline} pour inclusion dans l'édition de la semaine prochaine.

The Entrepreneurial Underwriter sera distribué à tous les membres de FASE et publié sur notre portail membres.`
  },
  de: {
    subject: 'Aufruf zur Einreichung: The Entrepreneurial Underwriter',
    body: (name: string, deadline: string) => `Sehr geehrte/r ${name},

Wir werden in Kürze die erste Ausgabe von The Entrepreneurial Underwriter, dem monatlichen Mitglieder-Newsletter von FASE, veröffentlichen und möchten gerne relevante Beiträge Ihrer Organisation für unsere Mitglieder aufnehmen.

Dieser Newsletter wird Neuigkeiten, Erfolge und bedeutende Entwicklungen aus unserer Mitgliedergemeinschaft hervorheben. Wenn Sie eines der folgenden Themen teilen möchten, senden Sie uns diese bitte zu:

• Unternehmensankündigungen oder Meilensteine
• Neue Ernennungen oder Team-Updates
• Produkteinführungen oder Partnerschaften
• Brancheneinblicke oder Thought Leadership
• Kommende Veranstaltungen oder Webinare

Bitte senden Sie die Details bis ${deadline} an admin@fasemga.com, damit sie in die Ausgabe der nächsten Woche aufgenommen werden können.

The Entrepreneurial Underwriter wird an alle FASE-Mitglieder verteilt und auf unserem Mitgliederportal veröffentlicht.`
  },
  es: {
    subject: 'Convocatoria de contenidos: The Entrepreneurial Underwriter',
    body: (name: string, deadline: string) => `Estimado/a ${name},

Próximamente publicaremos la primera edición de The Entrepreneurial Underwriter, el boletín mensual para miembros de FASE, y nos gustaría incluir cualquier información relevante para nuestros miembros procedente de su organización.

Este boletín destacará noticias, logros y desarrollos significativos de nuestra comunidad de miembros. Si tiene alguno de los siguientes elementos que le gustaría compartir, por favor envíenoslos:

• Anuncios o hitos de la empresa
• Nuevos nombramientos o actualizaciones del equipo
• Lanzamientos de productos o asociaciones
• Perspectivas del sector o liderazgo de opinión
• Próximos eventos o seminarios web

Por favor, envíe los detalles a admin@fasemga.com antes del ${deadline} para su inclusión en la edición de la próxima semana.

The Entrepreneurial Underwriter se distribuirá a todos los miembros de FASE y se publicará en nuestro portal de miembros.`
  },
  it: {
    subject: 'Invito a contribuire: The Entrepreneurial Underwriter',
    body: (name: string, deadline: string) => `Gentile ${name},

A breve pubblicheremo la prima edizione di The Entrepreneurial Underwriter, il bollettino mensile per i membri FASE, e vorremmo includere eventuali contenuti rilevanti per i nostri membri provenienti dalla vostra organizzazione.

Questo bollettino metterà in evidenza notizie, traguardi e sviluppi significativi della nostra comunità di membri. Se avete uno dei seguenti elementi da condividere, vi preghiamo di inviarceli:

• Annunci aziendali o traguardi raggiunti
• Nuove nomine o aggiornamenti del team
• Lanci di prodotti o partnership
• Approfondimenti di settore o thought leadership
• Eventi o webinar in programma

Vi preghiamo di inviare i dettagli a admin@fasemga.com entro ${deadline} per l'inclusione nell'edizione della prossima settimana.

The Entrepreneurial Underwriter sarà distribuito a tutti i membri FASE e pubblicato sul nostro portale membri.`
  },
  nl: {
    subject: 'Oproep voor bijdragen: The Entrepreneurial Underwriter',
    body: (name: string, deadline: string) => `Beste ${name},

Binnenkort brengen we de eerste editie uit van The Entrepreneurial Underwriter, de maandelijkse nieuwsbrief voor FASE-leden, en we willen graag relevante items van uw organisatie opnemen voor onze leden.

Deze nieuwsbrief zal nieuws, prestaties en belangrijke ontwikkelingen uit onze ledengemeenschap uitlichten. Als u een van de volgende items wilt delen, stuur ze dan naar ons:

• Bedrijfsaankondigingen of mijlpalen
• Nieuwe benoemingen of teamupdates
• Productlanceringen of partnerschappen
• Branche-inzichten of thought leadership
• Aankomende evenementen of webinars

Stuur de details naar admin@fasemga.com vóór ${deadline} voor opname in de editie van volgende week.

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
    const deadline = requestData.bulletinDeadline || 'Tuesday, 28 January';
    const recipientName = requestData.greeting || requestData.fullName;

    // Load signatures
    const emailTranslations = loadEmailTranslations(locale);
    const signatures = emailTranslations.signatures || {};
    const signature = signatures['admin_team'] || {
      regards: 'Best regards,',
      name: 'The FASE Team',
      title: ''
    };

    // Generate email body
    const bodyText = template.body(recipientName, deadline);

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
      message: 'Bulletin call email sent successfully',
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
