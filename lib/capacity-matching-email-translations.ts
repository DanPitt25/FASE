export type SupportedLanguage = 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl';

export interface MagicLinkEmailTranslations {
  subject: string;
  greeting: string;
  intro: string;
  networkingExplanation: string;
  requestInfo: string;
  linkNote: string;
  sharingExplanation: string;
  privacyNote: string;
  questionsNote: string;
  closing: string;
  signature: string;
  signatureTitle: string;
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
    subject: 'The 2026 MGA Rendezvous - maximizing the value of your experience',
    greeting: 'Dear',
    intro: 'We are looking forward to seeing you at the MGA Rendezvous in Barcelona in six weeks\' time.',
    networkingExplanation: 'We have set aside the Monday afternoon and part of the Tuesday morning at the conference for networking and relationship-building. To maximize the value of this time for you, we would like to connect you with carriers at the event who would be interested in supporting the growth of',
    requestInfo: 'To do this, we would appreciate it if you can share a little information on your growth ambitions over the next three years. You can access our very brief question set here - it should not take more than five minutes to complete. (This link only works for you – if you would like a colleague to answer these questions, please let us know whom, and we will contact them directly.)',
    linkNote: 'Complete Questionnaire',
    sharingExplanation: 'The information you supply will be shared anonymously with the insurance companies attending the Rendezvous. We will then send you the contact details of those companies that have an appetite for supporting your growth lines of business in the countries you are targeting. Once you receive this information, you will be free - at your discretion - to reach out to the insurance companies in question and schedule a time to meet with them in Barcelona.',
    privacyNote: 'The privacy of your proprietary data is of paramount importance. The information you share will be used exclusively for the purpose of identifying potential matches with capacity providers attending the MGA Rendezvous. You will have full control over which organisations you wish to share your data with, while retaining the full Digital Chain of Custody.',
    questionsNote: 'Please let us know if you have any questions about this process. We hope it will make your experience in Barcelona all the more valuable.',
    closing: 'Best regards,',
    signature: 'William',
    signatureTitle: 'William Pitt, Executive Director, FASE\nHerengracht 282\n1016 BX Amsterdam\nThe Netherlands',
  },
  de: {
    subject: 'Das MGA Rendezvous 2026 - Maximieren Sie den Wert Ihrer Erfahrung',
    greeting: 'Sehr geehrte/r',
    intro: 'Wir freuen uns darauf, Sie in sechs Wochen beim MGA Rendezvous in Barcelona zu sehen.',
    networkingExplanation: 'Wir haben den Montagnachmittag und einen Teil des Dienstagvormittags der Konferenz für Networking und Beziehungsaufbau reserviert. Um den Wert dieser Zeit für Sie zu maximieren, möchten wir Sie mit Versicherern vor Ort verbinden, die daran interessiert wären, das Wachstum von',
    requestInfo: 'Dazu würden wir es begrüßen, wenn Sie uns einige Informationen über Ihre Wachstumsambitionen für die nächsten drei Jahre mitteilen könnten. Sie können hier auf unseren kurzen Fragebogen zugreifen - das Ausfüllen sollte nicht mehr als fünf Minuten dauern. (Dieser Link funktioniert nur für Sie – wenn Sie möchten, dass ein Kollege diese Fragen beantwortet, teilen Sie uns bitte mit, wer, und wir werden ihn direkt kontaktieren.)',
    linkNote: 'Fragebogen ausfüllen',
    sharingExplanation: 'Die von Ihnen bereitgestellten Informationen werden anonym mit den am Rendezvous teilnehmenden Versicherungsunternehmen geteilt. Wir senden Ihnen dann die Kontaktdaten der Unternehmen, die bereit sind, Ihre Wachstumsgeschäftsbereiche in den von Ihnen anvisierten Ländern zu unterstützen. Sobald Sie diese Informationen erhalten haben, steht es Ihnen frei, nach eigenem Ermessen die betreffenden Versicherungsunternehmen zu kontaktieren und ein Treffen in Barcelona zu vereinbaren.',
    privacyNote: 'Der Schutz Ihrer geschützten Daten ist von höchster Bedeutung. Die von Ihnen geteilten Informationen werden ausschließlich zur Identifizierung potenzieller Übereinstimmungen mit Kapazitätsanbietern verwendet, die am MGA Rendezvous teilnehmen. Sie behalten die volle Kontrolle darüber, mit welchen Organisationen Sie Ihre Daten teilen möchten, und bewahren gleichzeitig die vollständige digitale Kontrollkette.',
    questionsNote: 'Bitte lassen Sie uns wissen, wenn Sie Fragen zu diesem Prozess haben. Wir hoffen, dass dies Ihre Erfahrung in Barcelona noch wertvoller machen wird.',
    closing: 'Mit freundlichen Grüßen,',
    signature: 'William',
    signatureTitle: 'William Pitt, Executive Director, FASE\nHerengracht 282\n1016 BX Amsterdam\nNiederlande',
  },
  fr: {
    subject: 'Le MGA Rendezvous 2026 - maximiser la valeur de votre expérience',
    greeting: 'Cher/Chère',
    intro: 'Nous avons hâte de vous voir au MGA Rendezvous à Barcelone dans six semaines.',
    networkingExplanation: 'Nous avons réservé le lundi après-midi et une partie du mardi matin de la conférence pour le réseautage et la construction de relations. Pour maximiser la valeur de ce temps pour vous, nous aimerions vous mettre en contact avec des assureurs présents à l\'événement qui seraient intéressés à soutenir la croissance de',
    requestInfo: 'Pour ce faire, nous vous serions reconnaissants de bien vouloir partager quelques informations sur vos ambitions de croissance pour les trois prochaines années. Vous pouvez accéder à notre très bref questionnaire ici - cela ne devrait pas prendre plus de cinq minutes à compléter. (Ce lien ne fonctionne que pour vous – si vous souhaitez qu\'un collègue réponde à ces questions, veuillez nous indiquer qui, et nous le contacterons directement.)',
    linkNote: 'Compléter le questionnaire',
    sharingExplanation: 'Les informations que vous fournirez seront partagées de manière anonyme avec les compagnies d\'assurance participant au Rendezvous. Nous vous enverrons ensuite les coordonnées des entreprises qui ont l\'appétit pour soutenir vos lignes de croissance dans les pays que vous ciblez. Une fois ces informations reçues, vous serez libre - à votre discrétion - de contacter les compagnies d\'assurance concernées et de planifier un rendez-vous avec elles à Barcelone.',
    privacyNote: 'La confidentialité de vos données propriétaires est d\'une importance capitale. Les informations que vous partagez seront utilisées exclusivement dans le but d\'identifier des correspondances potentielles avec des fournisseurs de capacité participant au MGA Rendezvous. Vous garderez le contrôle total sur les organisations avec lesquelles vous souhaitez partager vos données, tout en conservant la chaîne de custody numérique complète.',
    questionsNote: 'N\'hésitez pas à nous contacter si vous avez des questions sur ce processus. Nous espérons que cela rendra votre expérience à Barcelone encore plus précieuse.',
    closing: 'Cordialement,',
    signature: 'William',
    signatureTitle: 'William Pitt, Executive Director, FASE\nHerengracht 282\n1016 BX Amsterdam\nPays-Bas',
  },
  es: {
    subject: 'El MGA Rendezvous 2026 - maximizando el valor de su experiencia',
    greeting: 'Estimado/a',
    intro: 'Estamos deseando verle en el MGA Rendezvous en Barcelona dentro de seis semanas.',
    networkingExplanation: 'Hemos reservado la tarde del lunes y parte de la mañana del martes de la conferencia para networking y construcción de relaciones. Para maximizar el valor de este tiempo para usted, nos gustaría conectarle con aseguradoras en el evento que estarían interesadas en apoyar el crecimiento de',
    requestInfo: 'Para ello, le agradeceríamos que pudiera compartir un poco de información sobre sus ambiciones de crecimiento para los próximos tres años. Puede acceder a nuestro breve cuestionario aquí - no debería tomar más de cinco minutos completarlo. (Este enlace solo funciona para usted – si desea que un colega responda estas preguntas, por favor indíquenos quién y nos pondremos en contacto con él directamente.)',
    linkNote: 'Completar cuestionario',
    sharingExplanation: 'La información que proporcione se compartirá de forma anónima con las compañías de seguros que asistan al Rendezvous. Luego le enviaremos los datos de contacto de las empresas que tienen apetito por apoyar sus líneas de negocio de crecimiento en los países que está apuntando. Una vez que reciba esta información, será libre - a su discreción - de contactar con las compañías de seguros en cuestión y programar una reunión con ellas en Barcelona.',
    privacyNote: 'La privacidad de sus datos propietarios es de suma importancia. La información que comparta se utilizará exclusivamente con el propósito de identificar posibles coincidencias con proveedores de capacidad que asistan al MGA Rendezvous. Usted tendrá control total sobre con qué organizaciones desea compartir sus datos, mientras mantiene la cadena de custodia digital completa.',
    questionsNote: 'Por favor, háganos saber si tiene alguna pregunta sobre este proceso. Esperamos que haga su experiencia en Barcelona aún más valiosa.',
    closing: 'Saludos cordiales,',
    signature: 'William',
    signatureTitle: 'William Pitt, Executive Director, FASE\nHerengracht 282\n1016 BX Amsterdam\nPaíses Bajos',
  },
  it: {
    subject: 'Il MGA Rendezvous 2026 - massimizzare il valore della vostra esperienza',
    greeting: 'Gentile',
    intro: 'Non vediamo l\'ora di vedervi al MGA Rendezvous a Barcellona tra sei settimane.',
    networkingExplanation: 'Abbiamo riservato il lunedì pomeriggio e parte del martedì mattina della conferenza per il networking e la costruzione di relazioni. Per massimizzare il valore di questo tempo per voi, vorremmo mettervi in contatto con gli assicuratori presenti all\'evento che sarebbero interessati a supportare la crescita di',
    requestInfo: 'Per fare ciò, vi saremmo grati se poteste condividere alcune informazioni sulle vostre ambizioni di crescita per i prossimi tre anni. Potete accedere al nostro breve questionario qui - non dovrebbe richiedere più di cinque minuti per completarlo. (Questo link funziona solo per voi – se desiderate che un collega risponda a queste domande, fateci sapere chi e lo contatteremo direttamente.)',
    linkNote: 'Completa il questionario',
    sharingExplanation: 'Le informazioni che fornirete saranno condivise in forma anonima con le compagnie assicurative che partecipano al Rendezvous. Vi invieremo quindi i dettagli di contatto delle aziende che hanno interesse a supportare le vostre linee di business in crescita nei paesi che state puntando. Una volta ricevute queste informazioni, sarete liberi - a vostra discrezione - di contattare le compagnie assicurative in questione e fissare un incontro con loro a Barcellona.',
    privacyNote: 'La privacy dei vostri dati proprietari è di fondamentale importanza. Le informazioni che condividete saranno utilizzate esclusivamente allo scopo di identificare potenziali corrispondenze con fornitori di capacità che partecipano al MGA Rendezvous. Avrete il pieno controllo su quali organizzazioni desiderate condividere i vostri dati, mantenendo la completa catena di custodia digitale.',
    questionsNote: 'Fateci sapere se avete domande su questo processo. Speriamo che renderà la vostra esperienza a Barcellona ancora più preziosa.',
    closing: 'Cordiali saluti,',
    signature: 'William',
    signatureTitle: 'William Pitt, Executive Director, FASE\nHerengracht 282\n1016 BX Amsterdam\nPaesi Bassi',
  },
  nl: {
    subject: 'Het MGA Rendezvous 2026 - maximaliseer de waarde van uw ervaring',
    greeting: 'Beste',
    intro: 'We kijken ernaar uit u over zes weken te zien op het MGA Rendezvous in Barcelona.',
    networkingExplanation: 'We hebben de maandagmiddag en een deel van de dinsdagochtend van de conferentie gereserveerd voor netwerken en relatieopbouw. Om de waarde van deze tijd voor u te maximaliseren, willen we u in contact brengen met verzekeraars op het evenement die geïnteresseerd zouden zijn in het ondersteunen van de groei van',
    requestInfo: 'Hiervoor zouden we het op prijs stellen als u wat informatie kunt delen over uw groeiambities voor de komende drie jaar. U kunt hier toegang krijgen tot onze zeer korte vragenlijst - het invullen zou niet meer dan vijf minuten moeten duren. (Deze link werkt alleen voor u – als u wilt dat een collega deze vragen beantwoordt, laat ons dan weten wie, en we nemen rechtstreeks contact met hen op.)',
    linkNote: 'Vragenlijst invullen',
    sharingExplanation: 'De informatie die u verstrekt wordt anoniem gedeeld met de verzekeringsmaatschappijen die het Rendezvous bijwonen. We sturen u vervolgens de contactgegevens van de bedrijven die bereid zijn uw groeilijnen van business te ondersteunen in de landen waarop u zich richt. Zodra u deze informatie ontvangt, bent u vrij - naar eigen goeddunken - om contact op te nemen met de betreffende verzekeringsmaatschappijen en een afspraak met hen in Barcelona te plannen.',
    privacyNote: 'De privacy van uw bedrijfseigen gegevens is van het grootste belang. De informatie die u deelt wordt uitsluitend gebruikt om potentiële matches te identificeren met capaciteitsverstrekkers die het MGA Rendezvous bijwonen. U behoudt volledige controle over met welke organisaties u uw gegevens wilt delen, met behoud van de volledige digitale chain of custody.',
    questionsNote: 'Laat het ons weten als u vragen heeft over dit proces. We hopen dat het uw ervaring in Barcelona nog waardevoller zal maken.',
    closing: 'Met vriendelijke groet,',
    signature: 'William',
    signatureTitle: 'William Pitt, Executive Director, FASE\nHerengracht 282\n1016 BX Amsterdam\nNederland',
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
  contactName: string,
  url: string,
  expiresAt: Date,
  language: SupportedLanguage = 'en'
): string {
  const t = magicLinkEmailTranslations[language];

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://fasemga.com/fase-logo-rgb.png" alt="FASE" style="height: 48px; margin-bottom: 24px;" />

      <p style="color: #374151; line-height: 1.6;">
        ${t.greeting} ${contactName},
      </p>

      <p style="color: #374151; line-height: 1.6;">
        ${t.intro}
      </p>

      <p style="color: #374151; line-height: 1.6;">
        ${t.networkingExplanation} <strong>${companyName}</strong>'s business.
      </p>

      <p style="color: #374151; line-height: 1.6;">
        ${t.requestInfo}
      </p>

      <div style="margin: 32px 0;">
        <a href="${url}" style="display: inline-block; background-color: #2D5574; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500;">
          ${t.linkNote}
        </a>
      </div>

      <p style="color: #374151; line-height: 1.6;">
        ${t.sharingExplanation}
      </p>

      <p style="color: #374151; line-height: 1.6;">
        ${t.privacyNote}
      </p>

      <p style="color: #374151; line-height: 1.6;">
        ${t.questionsNote}
      </p>

      <p style="color: #374151; line-height: 1.6; margin-top: 32px;">
        ${t.closing}
      </p>

      <p style="color: #374151; line-height: 1.6; margin-top: 8px;">
        <strong>${t.signature}</strong>
      </p>

      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; white-space: pre-line;">
        ${t.signatureTitle}
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

      <p style="color: #9ca3af; font-size: 12px;">
        FASE - Fédération des Agences de Souscription Européennes<br />
        <a href="https://fasemga.com" style="color: #2D5574;">fasemga.com</a>
      </p>
    </div>
  `;
}
