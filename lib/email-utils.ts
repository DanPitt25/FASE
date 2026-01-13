import * as fs from 'fs';
import * as path from 'path';

// Supported locales
export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'it', 'nl'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

/**
 * Load email translations from JSON files
 * Falls back to English if the requested language is not found
 */
export function loadEmailTranslations(language: string): Record<string, any> {
  try {
    const filePath = path.join(process.cwd(), 'messages', language, 'email.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    // Fallback to English if file not found
    if (language !== 'en') {
      return loadEmailTranslations('en');
    }
    return {};
  }
}

/**
 * Validate and normalize locale to a supported locale
 */
export function normalizeLocale(userLocale?: string): SupportedLocale {
  if (!userLocale) return 'en';
  const locale = userLocale.toLowerCase().slice(0, 2);
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : 'en';
}

/**
 * Get gender-aware text from translations
 */
export function getGenderAwareText(
  translations: Record<string, any>,
  key: string,
  gender: 'm' | 'f' = 'm',
  fallback?: string
): string {
  const genderSuffix = gender === 'f' ? '_f' : '_m';
  return translations[`${key}${genderSuffix}`] || translations[key] || fallback || '';
}

/**
 * Replace template variables in a string
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

/**
 * Firebase Cloud Functions URL - centralized to avoid hardcoding
 */
export const FIREBASE_FUNCTIONS_URL = 'https://us-central1-fase-site.cloudfunctions.net';

/**
 * Send email via Firebase Cloud Function
 */
export async function sendEmailViaFirebase(emailData: {
  email: string;
  cc?: string;
  subject: string;
  invoiceHTML: string;
  invoiceNumber: string;
  organizationName: string;
  totalAmount: string;
  pdfAttachment?: string;
  pdfFilename?: string;
}): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/sendInvoiceEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: emailData }),
    });

    if (!response.ok) {
      throw new Error(`Firebase Function error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate email signature HTML
 */
export function generateEmailSignature(options: {
  name?: string;
  title?: string;
  email?: string;
} = {}): string {
  const {
    name = 'Aline Sullivan',
    title = 'Chief Operating Officer, FASE',
    email = 'aline.sullivan@fasemga.com'
  } = options;

  return `
    <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 15px 0 0 0;">
      Best regards,<br><br>
      <strong>Aline</strong><br><br>
      ${name}<br>
      ${title}<br>
      <a href="mailto:${email}" style="color: #2D5574;">${email}</a>
    </p>
  `;
}

/**
 * Generate email wrapper HTML with FASE branding
 */
export function wrapEmailContent(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 280px; height: auto;">
        </div>
        ${content}
      </div>
    </div>
  `;
}
