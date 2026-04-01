export type SupportedLanguage = 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl';

export interface MagicLinkEmailTranslations {
  subject: string;
  greeting: string;
  intro: string;
  description: string;
  buttonText: string;
  expiryNotice: string;
  ignoreNotice: string;
  footer: string;
}

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands',
};

export const magicLinkEmailTranslations: Record<SupportedLanguage, MagicLinkEmailTranslations> = {
  en: {
    subject: 'Complete your FASE Capacity Matching questionnaire',
    greeting: 'Capacity Matching Questionnaire',
    intro: 'You have been invited to complete the FASE Capacity Matching questionnaire for',
    description: 'This questionnaire helps us understand your growth ambitions and connect you with suitable capacity providers.',
    buttonText: 'Complete Questionnaire',
    expiryNotice: 'This link will expire on',
    ignoreNotice: 'If you did not expect this email, you can safely ignore it.',
    footer: 'FASE - Fédération des Agences de Souscription Européennes',
  },
  de: {
    subject: 'Füllen Sie Ihren FASE Capacity Matching Fragebogen aus',
    greeting: 'Capacity Matching Fragebogen',
    intro: 'Sie wurden eingeladen, den FASE Capacity Matching Fragebogen auszufüllen für',
    description: 'Dieser Fragebogen hilft uns, Ihre Wachstumsambitionen zu verstehen und Sie mit geeigneten Kapazitätsanbietern zu verbinden.',
    buttonText: 'Fragebogen ausfüllen',
    expiryNotice: 'Dieser Link läuft ab am',
    ignoreNotice: 'Wenn Sie diese E-Mail nicht erwartet haben, können Sie sie ignorieren.',
    footer: 'FASE - Fédération des Agences de Souscription Européennes',
  },
  fr: {
    subject: 'Complétez votre questionnaire FASE Capacity Matching',
    greeting: 'Questionnaire Capacity Matching',
    intro: 'Vous avez été invité(e) à compléter le questionnaire FASE Capacity Matching pour',
    description: 'Ce questionnaire nous aide à comprendre vos ambitions de croissance et à vous mettre en relation avec des fournisseurs de capacité adaptés.',
    buttonText: 'Compléter le questionnaire',
    expiryNotice: 'Ce lien expirera le',
    ignoreNotice: 'Si vous n\'attendiez pas cet e-mail, vous pouvez l\'ignorer.',
    footer: 'FASE - Fédération des Agences de Souscription Européennes',
  },
  es: {
    subject: 'Complete su cuestionario FASE Capacity Matching',
    greeting: 'Cuestionario Capacity Matching',
    intro: 'Ha sido invitado/a a completar el cuestionario FASE Capacity Matching para',
    description: 'Este cuestionario nos ayuda a comprender sus ambiciones de crecimiento y conectarle con proveedores de capacidad adecuados.',
    buttonText: 'Completar cuestionario',
    expiryNotice: 'Este enlace caducará el',
    ignoreNotice: 'Si no esperaba este correo electrónico, puede ignorarlo.',
    footer: 'FASE - Fédération des Agences de Souscription Européennes',
  },
  it: {
    subject: 'Completa il tuo questionario FASE Capacity Matching',
    greeting: 'Questionario Capacity Matching',
    intro: 'Sei stato/a invitato/a a completare il questionario FASE Capacity Matching per',
    description: 'Questo questionario ci aiuta a comprendere le tue ambizioni di crescita e a metterti in contatto con fornitori di capacità adeguati.',
    buttonText: 'Completa il questionario',
    expiryNotice: 'Questo link scadrà il',
    ignoreNotice: 'Se non ti aspettavi questa email, puoi ignorarla.',
    footer: 'FASE - Fédération des Agences de Souscription Européennes',
  },
  nl: {
    subject: 'Vul uw FASE Capacity Matching vragenlijst in',
    greeting: 'Capacity Matching Vragenlijst',
    intro: 'U bent uitgenodigd om de FASE Capacity Matching vragenlijst in te vullen voor',
    description: 'Deze vragenlijst helpt ons uw groeiambities te begrijpen en u te verbinden met geschikte capaciteitsaanbieders.',
    buttonText: 'Vragenlijst invullen',
    expiryNotice: 'Deze link verloopt op',
    ignoreNotice: 'Als u deze e-mail niet verwachtte, kunt u deze negeren.',
    footer: 'FASE - Fédération des Agences de Souscription Européennes',
  },
};

export function formatExpiryDate(date: Date, language: SupportedLanguage): string {
  const localeMap: Record<SupportedLanguage, string> = {
    en: 'en-GB',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    it: 'it-IT',
    nl: 'nl-NL',
  };

  return date.toLocaleDateString(localeMap[language], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateMagicLinkEmailHtml(
  companyName: string,
  url: string,
  expiresAt: Date,
  language: SupportedLanguage = 'en'
): string {
  const t = magicLinkEmailTranslations[language];
  const expiresFormatted = formatExpiryDate(expiresAt, language);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://fasemga.com/fase-logo-rgb.png" alt="FASE" style="height: 48px; margin-bottom: 24px;" />

      <h1 style="color: #2D5574; margin-bottom: 16px;">
        ${t.greeting}
      </h1>

      <p style="color: #374151; line-height: 1.6;">
        ${t.intro} <strong>${companyName}</strong>.
      </p>

      <p style="color: #374151; line-height: 1.6;">
        ${t.description}
      </p>

      <div style="margin: 32px 0;">
        <a href="${url}" style="display: inline-block; background-color: #2D5574; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          ${t.buttonText}
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        ${t.expiryNotice} <strong>${expiresFormatted}</strong>.
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        ${t.ignoreNotice}
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

      <p style="color: #9ca3af; font-size: 12px;">
        ${t.footer}<br />
        <a href="https://fasemga.com" style="color: #2D5574;">fasemga.com</a>
      </p>
    </div>
  `;
}
