// Removed fs and path imports - using embedded translations instead

// Simple email translation loader
export type Language = 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl';

// Embedded translations to avoid file path issues in deployed Firebase Functions
const translations: Record<Language, any> = {
  en: {
    password_reset: {
      subject: "Reset your FASE password",
      title: "Reset your FASE password",
      intro: "You requested a password reset for your FASE account.",
      button_text: "Reset Password",
      button_instruction: "Click the button below to reset your password:",
      alt_text: "Or copy and paste this link in your browser:",
      expiry: "This link will expire in 1 hour.",
      ignore: "If you didn't request this password reset, please ignore this email.",
      help: "If you have any questions, please contact us at help@fasemga.com"
    },
    membership_acceptance_admin: {
      subject: "Welcome to FASE - Membership Approved",
      welcome: "Welcome to FASE",
      dear: "Dear",
      dear_m: "Dear",
      dear_f: "Dear",
      welcome_text: "Welcome to FASE. Your application for {organizationName} has been approved.",
      payment_text: "To complete your membership, please remit payment of €{totalAmount} using one of the following methods:",
      payment_options: "Payment Options:",
      paypal_option: "PayPal:",
      pay_online: "Pay Online",
      bank_transfer: "Bank Transfer:",
      invoice_attached: "Invoice attached with payment details",
      engagement: "We look forward to your engagement in FASE and we'll be in touch very shortly with a link to our member portal. In the interim, please contact admin@fasemga.com with any questions.",
      regards: "Best regards,",
      signature: "Aline Sullivan",
      title: "Chief Operating Officer, FASE"
    },
    pdf_invoice: {
      invoice: "INVOICE",
      bill_to: "Bill To:",
      invoice_number: "Invoice #:",
      date: "Date:",
      due_date: "Due Date:",
      terms: "Terms: Net 30",
      description: "Description",
      quantity: "Qty",
      unit_price: "Unit Price",
      total: "Total",
      total_amount_due: "Total Amount Due:",
      payment_instructions: "Payment Instructions:",
      payment_company: "Lexicon Associates, LLC is accepting payments on behalf of Fédération des Agences de Souscription (FASE B.V.)",
      account_number: "Account number: 1255828998",
      payment_reference: "Payment Reference: {invoiceNumber}"
    },
    invoice: {
      subject: "FASE Membership Invoice {invoiceNumber} - €{totalAmount}",
      title: "FASE Membership Invoice",
      intro: "Thank you for your FASE membership. Please find your invoice below.",
      invoice_number: "Invoice Number: {invoiceNumber}",
      organization: "Organization: {organizationName}",
      total_amount: "Total Amount: €{totalAmount}",
      payment_info: "Payment instructions have been included in the attached PDF.",
      help: "If you have any questions, please contact us at help@fasemga.com"
    }
  },
  it: {
    password_reset: {
      subject: "Reimposti la Sua password FASE",
      title: "Reimposti la Sua password FASE", 
      intro: "Ha richiesto la reimpostazione della password per il Suo account FASE.",
      button_text: "Reimposta password",
      button_instruction: "Clicchi il pulsante qui sotto per reimpostare la Sua password:",
      alt_text: "Oppure copi e incolli questo link nel Suo browser:",
      expiry: "Questo link scadrà tra 1 ora.",
      ignore: "Se non ha richiesto questa reimpostazione della password, ignori questa email.",
      help: "Se ha domande, La preghiamo di contattarci a help@fasemga.com"
    },
    membership_acceptance_admin: {
      subject: "Benvenuto in FASE - Iscrizione Approvata",
      subject_m: "Benvenuto in FASE - Iscrizione Approvata",
      subject_f: "Benvenuta in FASE - Iscrizione Approvata",
      welcome: "Benvenuto in FASE",
      welcome_m: "Benvenuto in FASE",
      welcome_f: "Benvenuta in FASE",
      dear: "Gentile",
      dear_m: "Gentile",
      dear_f: "Gentile",
      welcome_text: "Benvenuto in FASE. La Sua candidatura per {organizationName} è stata approvata.",
      welcome_text_m: "Benvenuto in FASE. La Sua candidatura per {organizationName} è stata approvata.",
      welcome_text_f: "Benvenuta in FASE. La Sua candidatura per {organizationName} è stata approvata.",
      payment_text: "Per completare la Sua iscrizione, effettui il pagamento di €{totalAmount} utilizzando uno dei seguenti metodi:",
      payment_options: "Opzioni di pagamento:",
      paypal_option: "PayPal:",
      pay_online: "Paga online",
      bank_transfer: "Bonifico bancario:",
      invoice_attached: "Fattura allegata con dettagli di pagamento",
      engagement: "Non vediamo l'ora del Suo coinvolgimento in FASE e ci metteremo in contatto molto presto con un link al nostro portale membri. Nel frattempo, contatti admin@fasemga.com per qualsiasi domanda.",
      regards: "Cordiali saluti,",
      signature: "Aline Sullivan",
      title: "Chief Operating Officer, FASE"
    },
    pdf_invoice: {
      invoice: "FATTURA",
      bill_to: "Fatturare a:",
      invoice_number: "Fattura #:",
      date: "Data:",
      due_date: "Data di scadenza:",
      terms: "Termini: Netto 30",
      description: "Descrizione",
      quantity: "Qtà",
      unit_price: "Prezzo unitario",
      total: "Totale",
      total_amount_due: "Importo totale dovuto:",
      payment_instructions: "Istruzioni per il pagamento:",
      payment_company: "Lexicon Associates, LLC sta accettando pagamenti per conto della Fédération des Agences de Souscription (FASE B.V.)",
      account_number: "Numero di conto: 1255828998",
      payment_reference: "Riferimento pagamento: {invoiceNumber}"
    },
    invoice: {
      subject: "Fattura iscrizione FASE {invoiceNumber} - €{totalAmount}",
      title: "Fattura iscrizione FASE",
      intro: "La ringraziamo per la Sua iscrizione a FASE. Trova la Sua fattura qui sotto.",
      invoice_number: "Numero fattura: {invoiceNumber}",
      organization: "Organizzazione: {organizationName}",
      total_amount: "Importo totale: €{totalAmount}",
      payment_info: "Le istruzioni per il pagamento sono incluse nel PDF allegato.",
      help: "Se ha domande, La preghiamo di contattarci a help@fasemga.com"
    }
  },
  fr: {
    password_reset: {
      subject: "Réinitialisez votre mot de passe FASE",
      title: "Réinitialisez votre mot de passe FASE",
      intro: "Vous avez demandé une réinitialisation de mot de passe pour votre compte FASE.",
      button_text: "Réinitialiser le mot de passe",
      button_instruction: "Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :",
      alt_text: "Ou copiez et collez ce lien dans votre navigateur :",
      expiry: "Ce lien expirera dans 1 heure.",
      ignore: "Si vous n'avez pas demandé cette réinitialisation de mot de passe, veuillez ignorer cet email.",
      help: "Si vous avez des questions, veuillez nous contacter à help@fasemga.com"
    },
    membership_acceptance_admin: {
      subject: "Bienvenue à FASE - Adhésion Approuvée",
      welcome: "Bienvenue à FASE",
      dear: "Cher/Chère",
      dear_m: "Cher",
      dear_f: "Chère",
      welcome_text: "Bienvenue à FASE. Votre candidature pour {organizationName} a été approuvée.",
      payment_text: "Pour compléter votre adhésion, veuillez effectuer le paiement de €{totalAmount} en utilisant l'une des méthodes suivantes :",
      payment_options: "Options de paiement :",
      paypal_option: "PayPal :",
      pay_online: "Payer en ligne",
      bank_transfer: "Virement bancaire :",
      invoice_attached: "Facture jointe avec les détails de paiement",
      engagement: "Nous nous réjouissons de votre engagement dans FASE et nous vous contacterons très prochainement avec un lien vers notre portail des membres. En attendant, veuillez contacter admin@fasemga.com pour toute question.",
      regards: "Meilleures salutations,",
      signature: "Aline Sullivan",
      title: "Directrice des Opérations, FASE"
    },
    pdf_invoice: {
      invoice: "FACTURE",
      bill_to: "Facturer à :",
      invoice_number: "Facture #:",
      date: "Date :",
      due_date: "Date d'échéance :",
      terms: "Conditions : Net 30",
      description: "Description",
      quantity: "Qté",
      unit_price: "Prix unitaire",
      total: "Total",
      total_amount_due: "Montant total dû :",
      payment_instructions: "Instructions de paiement :",
      payment_company: "Lexicon Associates, LLC accepte les paiements au nom de la Fédération des Agences de Souscription (FASE B.V.)",
      account_number: "Numéro de compte : 1255828998",
      payment_reference: "Référence de paiement : {invoiceNumber}"
    },
    invoice: {
      subject: "Facture d'adhésion FASE {invoiceNumber} - €{totalAmount}",
      title: "Facture d'adhésion FASE",
      intro: "Merci pour votre adhésion à FASE. Veuillez trouver votre facture ci-dessous.",
      invoice_number: "Numéro de facture : {invoiceNumber}",
      organization: "Organisation : {organizationName}",
      total_amount: "Montant total : €{totalAmount}",
      payment_info: "Les instructions de paiement ont été incluses dans le PDF joint.",
      help: "Si vous avez des questions, veuillez nous contacter à help@fasemga.com"
    }
  },
  de: {
    password_reset: {
      subject: "Setzen Sie Ihr FASE-Passwort zurück",
      title: "Setzen Sie Ihr FASE-Passwort zurück",
      intro: "Sie haben eine Passwort-Zurücksetzung für Ihr FASE-Konto angefordert.",
      button_text: "Passwort zurücksetzen",
      button_instruction: "Klicken Sie auf die Schaltfläche unten, um Ihr Passwort zurückzusetzen:",
      alt_text: "Oder kopieren Sie diesen Link und fügen ihn in Ihren Browser ein:",
      expiry: "Dieser Link läuft in 1 Stunde ab.",
      ignore: "Wenn Sie diese Passwort-Zurücksetzung nicht angefordert haben, ignorieren Sie diese E-Mail bitte.",
      help: "Bei Fragen kontaktieren Sie uns bitte unter help@fasemga.com"
    },
    membership_acceptance_admin: {
      subject: "Willkommen bei FASE - Mitgliedschaft genehmigt",
      subject_m: "Willkommen bei FASE - Mitgliedschaft genehmigt",
      subject_f: "Willkommen bei FASE - Mitgliedschaft genehmigt",
      welcome: "Willkommen bei FASE",
      welcome_m: "Willkommen bei FASE",
      welcome_f: "Willkommen bei FASE",
      dear: "Liebe/r",
      dear_m: "Lieber",
      dear_f: "Liebe",
      welcome_text: "Willkommen bei FASE. Ihr Antrag für {organizationName} wurde genehmigt.",
      welcome_text_m: "Willkommen bei FASE. Ihr Antrag für {organizationName} wurde genehmigt.",
      welcome_text_f: "Willkommen bei FASE. Ihr Antrag für {organizationName} wurde genehmigt.",
      payment_text: "Um Ihre Mitgliedschaft abzuschließen, leisten Sie bitte eine Zahlung von €{totalAmount} mit einer der folgenden Methoden:",
      payment_options: "Zahlungsoptionen:",
      paypal_option: "PayPal:",
      pay_online: "Online bezahlen",
      bank_transfer: "Banküberweisung:",
      invoice_attached: "Rechnung mit Zahlungsdetails beigefügt",
      engagement: "Wir freuen uns auf Ihr Engagement bei FASE und werden uns in Kürze mit einem Link zu unserem Mitgliederportal melden. In der Zwischenzeit kontaktieren Sie bitte admin@fasemga.com bei Fragen.",
      regards: "Mit freundlichen Grüßen,",
      signature: "Aline Sullivan",
      title: "Chief Operating Officer, FASE"
    },
    pdf_invoice: {
      invoice: "RECHNUNG",
      bill_to: "Rechnung an:",
      invoice_number: "Rechnungsnummer:",
      date: "Datum:",
      due_date: "Fälligkeitsdatum:",
      terms: "Bedingungen: Netto 30",
      description: "Beschreibung",
      quantity: "Menge",
      unit_price: "Einzelpreis",
      total: "Gesamt",
      total_amount_due: "Gesamtbetrag fällig:",
      payment_instructions: "Zahlungsanweisungen:",
      payment_company: "Lexicon Associates, LLC nimmt Zahlungen im Namen der Fédération des Agences de Souscription (FASE B.V.) entgegen",
      account_number: "Kontonummer: 1255828998",
      payment_reference: "Zahlungsreferenz: {invoiceNumber}"
    },
    invoice: {
      subject: "FASE-Mitgliedschaftsrechnung {invoiceNumber} - €{totalAmount}",
      title: "FASE-Mitgliedschaftsrechnung",
      intro: "Vielen Dank für Ihre FASE-Mitgliedschaft. Ihre Rechnung finden Sie unten.",
      invoice_number: "Rechnungsnummer: {invoiceNumber}",
      organization: "Organisation: {organizationName}",
      total_amount: "Gesamtbetrag: €{totalAmount}",
      payment_info: "Zahlungsanweisungen sind in der beigefügten PDF enthalten.",
      help: "Falls Sie Fragen haben, kontaktieren Sie uns unter help@fasemga.com"
    }
  },
  es: {
    password_reset: {
      subject: "Restablezca su contraseña de FASE",
      title: "Restablezca su contraseña de FASE",
      intro: "Ha solicitado restablecer la contraseña de su cuenta FASE.",
      button_text: "Restablecer contraseña",
      button_instruction: "Haga clic en el botón de abajo para restablecer su contraseña:",
      alt_text: "O copie y pegue este enlace en su navegador:",
      expiry: "Este enlace expirará en 1 hora.",
      ignore: "Si no solicitó este restablecimiento de contraseña, ignore este correo electrónico.",
      help: "Si tiene alguna pregunta, póngase en contacto con nosotros en help@fasemga.com"
    },
    membership_acceptance_admin: {
      subject: "Bienvenido a FASE - Membresía Aprobada",
      subject_m: "Bienvenido a FASE - Membresía Aprobada", 
      subject_f: "Bienvenida a FASE - Membresía Aprobada",
      welcome: "Bienvenido a FASE",
      welcome_m: "Bienvenido a FASE",
      welcome_f: "Bienvenida a FASE",
      dear: "Estimado/a",
      dear_m: "Estimado",
      dear_f: "Estimada",
      welcome_text: "Bienvenido a FASE. Su solicitud para {organizationName} ha sido aprobada.",
      welcome_text_m: "Bienvenido a FASE. Su solicitud para {organizationName} ha sido aprobada.",
      welcome_text_f: "Bienvenida a FASE. Su solicitud para {organizationName} ha sido aprobada.",
      payment_text: "Para completar su membresía, por favor efectúe el pago de €{totalAmount} utilizando uno de los siguientes métodos:",
      payment_options: "Opciones de pago:",
      paypal_option: "PayPal:",
      pay_online: "Pagar en línea",
      bank_transfer: "Transferencia bancaria:",
      invoice_attached: "Factura adjunta con detalles de pago",
      engagement: "Esperamos su participación en FASE y nos pondremos en contacto muy pronto con un enlace a nuestro portal de miembros. Mientras tanto, contacte admin@fasemga.com para cualquier pregunta.",
      regards: "Saludos cordiales,",
      signature: "Aline Sullivan",
      title: "Chief Operating Officer, FASE"
    },
    pdf_invoice: {
      invoice: "FACTURA",
      bill_to: "Facturar a:",
      invoice_number: "Factura #:",
      date: "Fecha:",
      due_date: "Fecha de vencimiento:",
      terms: "Términos: Neto 30",
      description: "Descripción",
      quantity: "Cant.",
      unit_price: "Precio unitario",
      total: "Total",
      total_amount_due: "Monto total adeudado:",
      payment_instructions: "Instrucciones de pago:",
      payment_company: "Lexicon Associates, LLC acepta pagos en nombre de Fédération des Agences de Souscription (FASE B.V.)",
      account_number: "Número de cuenta: 1255828998",
      payment_reference: "Referencia de pago: {invoiceNumber}"
    },
    invoice: {
      subject: "Factura de membresía FASE {invoiceNumber} - €{totalAmount}",
      title: "Factura de membresía FASE",
      intro: "Gracias por su membresía de FASE. Encuentre su factura a continuación.",
      invoice_number: "Número de factura: {invoiceNumber}",
      organization: "Organización: {organizationName}",
      total_amount: "Monto total: €{totalAmount}",
      payment_info: "Las instrucciones de pago se han incluido en el PDF adjunto.",
      help: "Si tiene preguntas, contáctenos en help@fasemga.com"
    }
  },
  nl: {
    password_reset: {
      subject: "Reset uw FASE wachtwoord",
      title: "Reset uw FASE wachtwoord",
      intro: "U heeft een wachtwoord reset aangevraagd voor uw FASE-account.",
      button_text: "Wachtwoord resetten",
      button_instruction: "Klik op de onderstaande knop om uw wachtwoord te resetten:",
      alt_text: "Of kopieer en plak deze link in uw browser:",
      expiry: "Deze link verloopt binnen 1 uur.",
      ignore: "Als u deze wachtwoord reset niet heeft aangevraagd, negeer dan deze e-mail.",
      help: "Als u vragen heeft, neem dan contact met ons op via help@fasemga.com"
    },
    membership_acceptance_admin: {
      subject: "Welkom bij FASE - Lidmaatschap goedgekeurd",
      welcome: "Welkom bij FASE",
      dear: "Geachte",
      dear_m: "Geachte",
      dear_f: "Geachte",
      welcome_text: "Welkom bij FASE. Uw aanvraag voor {organizationName} is goedgekeurd.",
      payment_text: "Om uw lidmaatschap te voltooien, betaal alstublieft €{totalAmount} met een van de volgende methoden:",
      payment_options: "Betalingsopties:",
      paypal_option: "PayPal:",
      pay_online: "Online betalen",
      bank_transfer: "Bankoverschrijving:",
      invoice_attached: "Factuur bijgevoegd met betalingsdetails",
      engagement: "We kijken uit naar uw betrokkenheid bij FASE en we nemen zeer binnenkort contact op met een link naar ons ledenportaal. In de tussentijd kunt u contact opnemen met admin@fasemga.com voor eventuele vragen.",
      regards: "Vriendelijke groeten,",
      signature: "Aline Sullivan",
      title: "Chief Operating Officer, FASE"
    },
    pdf_invoice: {
      invoice: "FACTUUR",
      bill_to: "Factureren aan:",
      invoice_number: "Factuur #:",
      date: "Datum:",
      due_date: "Vervaldatum:",
      terms: "Voorwaarden: Netto 30",
      description: "Beschrijving",
      quantity: "Aantal",
      unit_price: "Eenheidsprijs",
      total: "Totaal",
      total_amount_due: "Totaal verschuldigd bedrag:",
      payment_instructions: "Betaalinstructies:",
      payment_company: "Lexicon Associates, LLC accepteert betalingen namens Fédération des Agences de Souscription (FASE B.V.)",
      account_number: "Rekeningnummer: 1255828998",
      payment_reference: "Betalingsreferentie: {invoiceNumber}"
    },
    invoice: {
      subject: "FASE-lidmaatschapsfactuur {invoiceNumber} - €{totalAmount}",
      title: "FASE-lidmaatschapsfactuur",
      intro: "Dank u voor uw FASE-lidmaatschap. U vindt uw factuur hieronder.",
      invoice_number: "Factuurnummer: {invoiceNumber}",
      organization: "Organisatie: {organizationName}",
      total_amount: "Totaalbedrag: €{totalAmount}",
      payment_info: "Betaalinstructies zijn opgenomen in de bijgevoegde PDF.",
      help: "Als u vragen heeft, neem dan contact met ons op via help@fasemga.com"
    }
  }
};

// Load translations from embedded data
function loadEmailTranslations(language: Language): any {
  return translations[language] || translations.en;
}

// Language detection function  
export function detectUserLanguage(email?: string, userAgent?: string, acceptLanguage?: string, locale?: string): Language {
  // Priority order:
  // 1. Explicitly passed locale
  // 2. Accept-Language header
  // 3. Default to English
  
  if (locale && ['en', 'fr', 'de', 'es', 'it', 'nl'].includes(locale)) {
    return locale as Language;
  }
  
  if (acceptLanguage) {
    const languages = acceptLanguage.toLowerCase().split(',');
    for (const lang of languages) {
      const langCode = lang.split(';')[0].trim();
      if (langCode.startsWith('fr')) {
        return 'fr';
      }
      if (langCode.startsWith('de')) {
        return 'de';
      }
      if (langCode.startsWith('es')) {
        return 'es';
      }
      if (langCode.startsWith('it')) {
        return 'it';
      }
      if (langCode.startsWith('nl')) {
        return 'nl';
      }
    }
  }
  
  return 'en'; // Default to English
}

// Get email translations
export function getEmailTranslations(language: Language = 'en') {
  return loadEmailTranslations(language);
}

// Simple template replacement function
function replaceTemplateVars(template: string, vars: { [key: string]: string }): string {
  let result = template;
  Object.keys(vars).forEach(key => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, vars[key]);
  });
  return result;
}

// Generate password reset email HTML
export function generatePasswordResetEmail(resetUrl: string, language: Language = 'en'): { subject: string; html: string } {
  const t = getEmailTranslations(language).password_reset;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1e3a8a;">${t.title}</h2>
      <p>${t.intro}</p>
      
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>${t.button_instruction}</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">${t.button_text}</a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">${t.alt_text}<br>
        <a href="${resetUrl}" style="color: #1e3a8a; word-break: break-all;">${resetUrl}</a></p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">${t.expiry}</p>
      <p style="color: #6b7280; font-size: 14px;">${t.ignore}</p>
      <p style="color: #6b7280; font-size: 14px;">${t.help}</p>
    </div>
  `;

  return {
    subject: t.subject,
    html
  };
}

// Generate verification code email HTML
export function generateVerificationCodeEmail(code: string, language: Language = 'en'): { subject: string; html: string } {
  const t = getEmailTranslations(language).verification_code;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2D5574;">${t.title}</h2>
      <p>${t.intro}</p>
      
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p>${t.code_instruction}</p>
        <div style="font-size: 24px; font-weight: bold; color: #2D5574; margin: 20px 0; padding: 15px; background: white; border-radius: 5px; letter-spacing: 2px;">
          ${code}
        </div>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">${t.expiry}</p>
      <p style="color: #6b7280; font-size: 14px;">${t.ignore}</p>
      <p style="color: #6b7280; font-size: 14px;">${t.help}</p>
    </div>
  `;

  return {
    subject: t.subject,
    html
  };
}

// Generate invoice email HTML
export function generateInvoiceEmail(invoiceNumber: string, organizationName: string, totalAmount: string, language: Language = 'en'): { subject: string; html: string } {
  const t = getEmailTranslations(language).invoice;
  
  const subject = replaceTemplateVars(t.subject, { invoiceNumber, totalAmount });
  const invoiceNumberText = replaceTemplateVars(t.invoice_number, { invoiceNumber });
  const organizationText = replaceTemplateVars(t.organization, { organizationName });
  const totalAmountText = replaceTemplateVars(t.total_amount, { totalAmount });
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2D5574;">${t.title}</h2>
      <p>${t.intro}</p>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>${invoiceNumberText}</strong></p>
        <p><strong>${organizationText}</strong></p>
        <p><strong>${totalAmountText}</strong></p>
        <p>${t.payment_info}</p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">${t.help}</p>
    </div>
  `;

  return {
    subject,
    html
  };
}

// Generate join request approved email HTML
export function generateJoinRequestApprovedEmail(fullName: string, email: string, companyName: string, adminNotes: string = '', language: Language = 'en'): { subject: string; html: string } {
  const t = getEmailTranslations(language).join_request_approved;
  
  const subject = replaceTemplateVars(t.subject, { companyName });
  const intro = replaceTemplateVars(t.intro, { companyName });
  
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2D5574;">${t.title}</h2>
      <p>${intro}</p>
      
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>${t.next_steps}</strong></p>
        <ul>
          <li>${t.step_1}</li>
          <li>${t.step_2}</li>
          <li>${t.step_3}</li>
        </ul>
      </div>
  `;
  
  if (adminNotes) {
    html += `
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>${t.admin_notes_label}</strong></p>
        <p>${adminNotes}</p>
      </div>
    `;
  }
  
  html += `
      <p style="color: #6b7280; font-size: 14px;">${t.help}</p>
    </div>
  `;

  return {
    subject,
    html
  };
}

// Generate join request update email HTML
export function generateJoinRequestUpdateEmail(fullName: string, companyName: string, status: string, adminNotes: string = '', language: Language = 'en'): { subject: string; html: string } {
  const t = getEmailTranslations(language).join_request_update;
  
  const subject = replaceTemplateVars(t.subject, { companyName });
  const intro = replaceTemplateVars(t.intro, { companyName });
  const statusLabel = replaceTemplateVars(t.status_label, { status });
  
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2D5574;">${t.title}</h2>
      <p>${intro}</p>
      
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>${statusLabel}</strong></p>
      </div>
  `;
  
  if (adminNotes) {
    html += `
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>${t.admin_notes_label}</strong></p>
        <p>${adminNotes}</p>
      </div>
    `;
  }
  
  html += `
      <p style="color: #6b7280; font-size: 14px;">${t.help}</p>
    </div>
  `;

  return {
    subject,
    html
  };
}

// Generate membership acceptance email HTML
export function generateMembershipAcceptanceEmail(fullName: string, organizationName: string, paypalUrl: string, invoiceText: string, totalAmount: string, language: Language = 'en'): { subject: string; html: string } {
  const t = getEmailTranslations(language).membership_acceptance;
  
  const subject = replaceTemplateVars(t.subject, { organizationName });
  const intro = replaceTemplateVars(t.intro, { fullName, organizationName });
  const invoiceTextLine = replaceTemplateVars(t.invoice_text, { invoiceText });
  const amountDue = replaceTemplateVars(t.amount_due, { totalAmount });
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2D5574;">${t.title}</h2>
      <p>${intro}</p>
      
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>${t.payment_instruction}</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${paypalUrl}" style="background-color: #2D5574; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">${t.paypal_button}</a>
        </div>
        <p><strong>${amountDue}</strong></p>
        <p>${invoiceTextLine}</p>
      </div>
      
      <p>${t.next_steps}</p>
      <p style="color: #6b7280; font-size: 14px;">${t.help}</p>
    </div>
  `;

  return {
    subject,
    html
  };
}