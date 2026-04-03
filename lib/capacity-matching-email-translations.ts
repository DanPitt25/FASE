export type SupportedLanguage = 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl';
export type SalutationType = 'male' | 'female' | 'neutral';

export const SALUTATION_LABELS: Record<SalutationType, string> = {
  male: 'Mr.',
  female: 'Ms.',
  neutral: 'Neutral',
};

// Gender-specific greetings for each language
export const greetingsByGender: Record<SupportedLanguage, Record<SalutationType, string>> = {
  en: { male: 'Dear Mr.', female: 'Dear Ms.', neutral: 'Dear' },
  de: { male: 'Sehr geehrter Herr', female: 'Sehr geehrte Frau', neutral: 'Sehr geehrte/r' },
  fr: { male: 'Cher Monsieur', female: 'Chère Madame', neutral: 'Cher/Chère' },
  es: { male: 'Estimado Sr.', female: 'Estimada Sra.', neutral: 'Estimado/a' },
  it: { male: 'Gentile Sig.', female: 'Gentile Sig.ra', neutral: 'Gentile' },
  nl: { male: 'Geachte heer', female: 'Geachte mevrouw', neutral: 'Geachte' },
};

export interface MagicLinkEmailTranslations {
  subject: string;
  greeting: string; // Kept for backwards compatibility, but greetingsByGender is preferred
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

// Page translations for the capacity matching form page
export interface CapacityMatchingPageTranslations {
  // Loading states
  loading: string;
  validatingLink: string;
  // Error states
  linkInvalidTitle: string;
  linkAlreadyUsed: string;
  linkInvalid: string;
  requestNewLink: string;
  // Page header
  capacityMatching: string;
  questionnaireFor: string;
  // Form labels
  intro: string;
  contactInfo: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  growthTargets: string;
  addRow: string;
  entry: string;
  remove: string;
  lineOfBusiness: string;
  country: string;
  select: string;
  gwp2025: string;
  gwpPlaceholder: string;
  targetYear1: string;
  targetYear2: string;
  targetYear3: string;
  notes: string;
  notesPlaceholder: string;
  submit: string;
  submitting: string;
  // Success state
  successTitle: string;
  successMessage: string;
  submitAnother: string;
  // Validation errors
  contactNameRequired: string;
  contactEmailRequired: string;
  lineOfBusinessRequired: string;
  countryRequired: string;
}

export const capacityMatchingPageTranslations: Record<SupportedLanguage, CapacityMatchingPageTranslations> = {
  en: {
    loading: 'Loading...',
    validatingLink: 'Validating link...',
    linkInvalidTitle: 'Link Invalid',
    linkAlreadyUsed: 'This link has already been used or is invalid.',
    linkInvalid: 'This link is no longer valid.',
    requestNewLink: 'Request a New Link',
    capacityMatching: 'Capacity Matching',
    questionnaireFor: 'Questionnaire for',
    intro: 'Help us connect you with the right capacity providers. Share your growth ambitions below and we will work to match you with carriers whose risk appetite aligns with your business.',
    contactInfo: 'Contact Information',
    companyName: 'Company Name',
    contactName: 'Contact Name',
    contactEmail: 'Contact Email',
    growthTargets: 'Growth Targets',
    addRow: '+ Add Row',
    entry: 'Entry',
    remove: 'Remove',
    lineOfBusiness: 'Line of Business',
    country: 'Country',
    select: 'Select...',
    gwp2025: 'GWP 2025 (€)',
    gwpPlaceholder: '0 if new',
    targetYear1: 'Target Year 1 (€)',
    targetYear2: 'Target Year 2 (€)',
    targetYear3: 'Target Year 3 (€)',
    notes: 'Notes',
    notesPlaceholder: 'Optional',
    submit: 'Submit',
    submitting: 'Submitting...',
    successTitle: 'Submission Received',
    successMessage: 'Thank you for submitting your growth ambitions. Our team will review your submission and work to connect you with suitable capacity providers.',
    submitAnother: 'Submit Another',
    contactNameRequired: 'Contact name is required',
    contactEmailRequired: 'Contact email is required',
    lineOfBusinessRequired: 'Row {{row}}: Line of Business is required',
    countryRequired: 'Row {{row}}: Country is required',
  },
  de: {
    loading: 'Laden...',
    validatingLink: 'Link wird überprüft...',
    linkInvalidTitle: 'Link ungültig',
    linkAlreadyUsed: 'Dieser Link wurde bereits verwendet oder ist ungültig.',
    linkInvalid: 'Dieser Link ist nicht mehr gültig.',
    requestNewLink: 'Neuen Link anfordern',
    capacityMatching: 'Kapazitäts-Matching',
    questionnaireFor: 'Fragebogen für',
    intro: 'Helfen Sie uns, Sie mit den richtigen Kapazitätsanbietern zu verbinden. Teilen Sie unten Ihre Wachstumsambitionen mit, und wir werden Sie mit Versicherern zusammenbringen, deren Risikoappetit zu Ihrem Geschäft passt.',
    contactInfo: 'Kontaktinformationen',
    companyName: 'Firmenname',
    contactName: 'Kontaktperson',
    contactEmail: 'E-Mail-Adresse',
    growthTargets: 'Wachstumsziele',
    addRow: '+ Zeile hinzufügen',
    entry: 'Eintrag',
    remove: 'Entfernen',
    lineOfBusiness: 'Geschäftsbereich',
    country: 'Land',
    select: 'Auswählen...',
    gwp2025: 'GWP 2025 (€)',
    gwpPlaceholder: '0 wenn neu',
    targetYear1: 'Ziel Jahr 1 (€)',
    targetYear2: 'Ziel Jahr 2 (€)',
    targetYear3: 'Ziel Jahr 3 (€)',
    notes: 'Anmerkungen',
    notesPlaceholder: 'Optional',
    submit: 'Absenden',
    submitting: 'Wird gesendet...',
    successTitle: 'Eingabe erhalten',
    successMessage: 'Vielen Dank für die Übermittlung Ihrer Wachstumsambitionen. Unser Team wird Ihre Eingabe prüfen und daran arbeiten, Sie mit geeigneten Kapazitätsanbietern zu verbinden.',
    submitAnother: 'Weitere Eingabe',
    contactNameRequired: 'Kontaktname ist erforderlich',
    contactEmailRequired: 'E-Mail-Adresse ist erforderlich',
    lineOfBusinessRequired: 'Zeile {{row}}: Geschäftsbereich ist erforderlich',
    countryRequired: 'Zeile {{row}}: Land ist erforderlich',
  },
  fr: {
    loading: 'Chargement...',
    validatingLink: 'Validation du lien...',
    linkInvalidTitle: 'Lien invalide',
    linkAlreadyUsed: 'Ce lien a déjà été utilisé ou est invalide.',
    linkInvalid: 'Ce lien n\'est plus valide.',
    requestNewLink: 'Demander un nouveau lien',
    capacityMatching: 'Mise en relation capacité',
    questionnaireFor: 'Questionnaire pour',
    intro: 'Aidez-nous à vous mettre en relation avec les bons fournisseurs de capacité. Partagez vos ambitions de croissance ci-dessous et nous travaillerons à vous mettre en relation avec des assureurs dont l\'appétit pour le risque correspond à votre activité.',
    contactInfo: 'Informations de contact',
    companyName: 'Nom de l\'entreprise',
    contactName: 'Nom du contact',
    contactEmail: 'Email de contact',
    growthTargets: 'Objectifs de croissance',
    addRow: '+ Ajouter une ligne',
    entry: 'Entrée',
    remove: 'Supprimer',
    lineOfBusiness: 'Branche d\'activité',
    country: 'Pays',
    select: 'Sélectionner...',
    gwp2025: 'GWP 2025 (€)',
    gwpPlaceholder: '0 si nouveau',
    targetYear1: 'Objectif Année 1 (€)',
    targetYear2: 'Objectif Année 2 (€)',
    targetYear3: 'Objectif Année 3 (€)',
    notes: 'Notes',
    notesPlaceholder: 'Optionnel',
    submit: 'Envoyer',
    submitting: 'Envoi en cours...',
    successTitle: 'Soumission reçue',
    successMessage: 'Merci d\'avoir soumis vos ambitions de croissance. Notre équipe examinera votre soumission et travaillera à vous mettre en relation avec des fournisseurs de capacité appropriés.',
    submitAnother: 'Soumettre une autre',
    contactNameRequired: 'Le nom du contact est requis',
    contactEmailRequired: 'L\'email de contact est requis',
    lineOfBusinessRequired: 'Ligne {{row}}: La branche d\'activité est requise',
    countryRequired: 'Ligne {{row}}: Le pays est requis',
  },
  es: {
    loading: 'Cargando...',
    validatingLink: 'Validando enlace...',
    linkInvalidTitle: 'Enlace inválido',
    linkAlreadyUsed: 'Este enlace ya ha sido utilizado o es inválido.',
    linkInvalid: 'Este enlace ya no es válido.',
    requestNewLink: 'Solicitar un nuevo enlace',
    capacityMatching: 'Coincidencia de capacidad',
    questionnaireFor: 'Cuestionario para',
    intro: 'Ayúdenos a conectarle con los proveedores de capacidad adecuados. Comparta sus ambiciones de crecimiento a continuación y trabajaremos para emparejarlo con aseguradoras cuyo apetito de riesgo se alinee con su negocio.',
    contactInfo: 'Información de contacto',
    companyName: 'Nombre de la empresa',
    contactName: 'Nombre de contacto',
    contactEmail: 'Email de contacto',
    growthTargets: 'Objetivos de crecimiento',
    addRow: '+ Añadir fila',
    entry: 'Entrada',
    remove: 'Eliminar',
    lineOfBusiness: 'Línea de negocio',
    country: 'País',
    select: 'Seleccionar...',
    gwp2025: 'GWP 2025 (€)',
    gwpPlaceholder: '0 si nuevo',
    targetYear1: 'Objetivo Año 1 (€)',
    targetYear2: 'Objetivo Año 2 (€)',
    targetYear3: 'Objetivo Año 3 (€)',
    notes: 'Notas',
    notesPlaceholder: 'Opcional',
    submit: 'Enviar',
    submitting: 'Enviando...',
    successTitle: 'Envío recibido',
    successMessage: 'Gracias por enviar sus ambiciones de crecimiento. Nuestro equipo revisará su envío y trabajará para conectarlo con proveedores de capacidad adecuados.',
    submitAnother: 'Enviar otro',
    contactNameRequired: 'El nombre de contacto es requerido',
    contactEmailRequired: 'El email de contacto es requerido',
    lineOfBusinessRequired: 'Fila {{row}}: La línea de negocio es requerida',
    countryRequired: 'Fila {{row}}: El país es requerido',
  },
  it: {
    loading: 'Caricamento...',
    validatingLink: 'Verifica del link...',
    linkInvalidTitle: 'Link non valido',
    linkAlreadyUsed: 'Questo link è già stato utilizzato o non è valido.',
    linkInvalid: 'Questo link non è più valido.',
    requestNewLink: 'Richiedi un nuovo link',
    capacityMatching: 'Matching della capacità',
    questionnaireFor: 'Questionario per',
    intro: 'Aiutaci a metterti in contatto con i giusti fornitori di capacità. Condividi le tue ambizioni di crescita qui sotto e lavoreremo per abbinarti a compagnie assicurative il cui appetito per il rischio sia in linea con la tua attività.',
    contactInfo: 'Informazioni di contatto',
    companyName: 'Nome azienda',
    contactName: 'Nome del contatto',
    contactEmail: 'Email di contatto',
    growthTargets: 'Obiettivi di crescita',
    addRow: '+ Aggiungi riga',
    entry: 'Voce',
    remove: 'Rimuovi',
    lineOfBusiness: 'Linea di business',
    country: 'Paese',
    select: 'Seleziona...',
    gwp2025: 'GWP 2025 (€)',
    gwpPlaceholder: '0 se nuovo',
    targetYear1: 'Obiettivo Anno 1 (€)',
    targetYear2: 'Obiettivo Anno 2 (€)',
    targetYear3: 'Obiettivo Anno 3 (€)',
    notes: 'Note',
    notesPlaceholder: 'Opzionale',
    submit: 'Invia',
    submitting: 'Invio in corso...',
    successTitle: 'Invio ricevuto',
    successMessage: 'Grazie per aver inviato le tue ambizioni di crescita. Il nostro team esaminerà il tuo invio e lavorerà per metterti in contatto con fornitori di capacità adeguati.',
    submitAnother: 'Invia un altro',
    contactNameRequired: 'Il nome del contatto è obbligatorio',
    contactEmailRequired: 'L\'email di contatto è obbligatoria',
    lineOfBusinessRequired: 'Riga {{row}}: La linea di business è obbligatoria',
    countryRequired: 'Riga {{row}}: Il paese è obbligatorio',
  },
  nl: {
    loading: 'Laden...',
    validatingLink: 'Link verifiëren...',
    linkInvalidTitle: 'Link ongeldig',
    linkAlreadyUsed: 'Deze link is al gebruikt of is ongeldig.',
    linkInvalid: 'Deze link is niet meer geldig.',
    requestNewLink: 'Nieuwe link aanvragen',
    capacityMatching: 'Capaciteit Matching',
    questionnaireFor: 'Vragenlijst voor',
    intro: 'Help ons u in contact te brengen met de juiste capaciteitsverstrekkers. Deel hieronder uw groeiambities en we zullen werken om u te matchen met verzekeraars wiens risicobereidheid aansluit bij uw bedrijf.',
    contactInfo: 'Contactgegevens',
    companyName: 'Bedrijfsnaam',
    contactName: 'Contactpersoon',
    contactEmail: 'E-mailadres',
    growthTargets: 'Groeidoelen',
    addRow: '+ Rij toevoegen',
    entry: 'Invoer',
    remove: 'Verwijderen',
    lineOfBusiness: 'Branche',
    country: 'Land',
    select: 'Selecteer...',
    gwp2025: 'GWP 2025 (€)',
    gwpPlaceholder: '0 indien nieuw',
    targetYear1: 'Doel Jaar 1 (€)',
    targetYear2: 'Doel Jaar 2 (€)',
    targetYear3: 'Doel Jaar 3 (€)',
    notes: 'Opmerkingen',
    notesPlaceholder: 'Optioneel',
    submit: 'Verzenden',
    submitting: 'Verzenden...',
    successTitle: 'Inzending ontvangen',
    successMessage: 'Bedankt voor het indienen van uw groeiambities. Ons team zal uw inzending beoordelen en werken om u in contact te brengen met geschikte capaciteitsverstrekkers.',
    submitAnother: 'Nog een indienen',
    contactNameRequired: 'Contactnaam is verplicht',
    contactEmailRequired: 'E-mailadres is verplicht',
    lineOfBusinessRequired: 'Rij {{row}}: Branche is verplicht',
    countryRequired: 'Rij {{row}}: Land is verplicht',
  },
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

export function generateMagicLinkEmailHtml(
  companyName: string,
  contactName: string,
  url: string,
  language: SupportedLanguage = 'en',
  salutation: SalutationType = 'neutral'
): string {
  const t = magicLinkEmailTranslations[language];
  const greeting = greetingsByGender[language][salutation];

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="https://fasemga.com/fase-logo-rgb.png" alt="FASE" style="height: 48px; margin-bottom: 24px;" />

      <p style="color: #374151; line-height: 1.6;">
        ${greeting} ${contactName},
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
