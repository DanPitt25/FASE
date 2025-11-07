// Removed fs and path imports - using embedded translations instead

// Simple email translation loader
export type Language = 'en' | 'fr' | 'de' | 'es' | 'it';

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
  
  if (locale && ['en', 'fr', 'de', 'es', 'it'].includes(locale)) {
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