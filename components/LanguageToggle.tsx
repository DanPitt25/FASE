'use client';

import { useLocale, type Locale } from '../contexts/LocaleContext';
import { useTranslations } from 'next-intl';

export default function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  const tCommon = useTranslations('common');

  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-fase-black">{tCommon('language_label')}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="text-xs border border-fase-light-gold rounded px-2 py-1 text-fase-black focus:outline-none focus:ring-1 focus:ring-fase-navy"
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
      </select>
    </div>
  );
}