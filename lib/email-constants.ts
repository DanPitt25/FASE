/**
 * Shared email configuration constants for admin portal
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
] as const;

export const EMAIL_SENDERS = [
  { id: 'admin@fasemga.com', label: 'FASE Admin <admin@fasemga.com>' },
  { id: 'william.pitt@fasemga.com', label: 'William Pitt <william.pitt@fasemga.com>' },
  { id: 'info@fasemga.com', label: 'FASE Info <info@fasemga.com>' },
  { id: 'media@fasemga.com', label: 'FASE Media <media@fasemga.com>' },
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];
export type EmailSenderId = typeof EMAIL_SENDERS[number]['id'];
