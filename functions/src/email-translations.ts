import * as fs from 'fs';
import * as path from 'path';

// Simple email translation loader
export type Language = 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl';

// Load translations from JSON files
function loadEmailTranslations(language: Language): any {
  try {
    const filePath = path.join(__dirname, 'messages', language, 'email.json');
    const translationFile = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(translationFile);
  } catch (error) {
    console.error(`Failed to load ${language} email translations:`, error);
    // Fallback to English if language file not found
    if (language !== 'en') {
      return loadEmailTranslations('en');
    }
    throw error;
  }
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

// Generate membership acceptance admin email HTML (with personalized signature)
export function generateMembershipAcceptanceAdminEmail(fullName: string, organizationName: string, paypalUrl: string, totalAmount: string, userGender?: string, language: Language = 'en'): { subject: string; html: string } {
  const t = getEmailTranslations(language).membership_acceptance_admin;
  
  // Handle gendered greetings for languages that support it
  let welcomeText = t.welcome_text;
  let dear = t.dear;
  
  if (userGender && language !== 'en') {
    if (userGender === 'male' && t.welcome_text_m) {
      welcomeText = t.welcome_text_m;
      dear = t.dear_m;
    } else if (userGender === 'female' && t.welcome_text_f) {
      welcomeText = t.welcome_text_f;
      dear = t.dear_f;
    }
  }
  
  const subject = t.subject;
  const welcomeTextFormatted = replaceTemplateVars(welcomeText, { organizationName });
  const paymentText = replaceTemplateVars(t.payment_text, { totalAmount });
  const invoiceTextLine = t.invoice_attached;
  const signatureBlock = `
        <p>Aline Sullivan</p>
        <p>Chief Operating Officer, FASE</p>
        <p><a href="mailto:aline.sullivan@fasemga.com" style="color: #2D5574;">aline.sullivan@fasemga.com</a></p>`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2D5574;">${t.welcome}</h2>
      
      <p>${dear} ${fullName},</p>
      <p>${welcomeTextFormatted}</p>
      
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>${paymentText}</p>
        
        <h4>${t.payment_options}</h4>
        <p><strong>${t.paypal_option}</strong></p>
        <div style="margin: 15px 0;">
          <a href="${paypalUrl}" style="background-color: #2D5574; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">${t.pay_online}</a>
        </div>
        
        <p><strong>${t.bank_transfer}</strong></p>
        <p>${invoiceTextLine}</p>
      </div>
      
      <p>${t.engagement}</p>
      
      <div style="margin-top: 30px;">
        <p>${t.regards}</p>
        <p><strong>${t.signature}</strong></p>
        <br>${signatureBlock}
      </div>
    </div>
  `;

  return {
    subject,
    html
  };
}