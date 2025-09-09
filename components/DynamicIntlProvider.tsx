'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from '../contexts/LocaleContext';
import { ReactNode } from 'react';

interface DynamicIntlProviderProps {
  children: ReactNode;
  allMessages: { en: any; fr: any };
}

export default function DynamicIntlProvider({ children, allMessages }: DynamicIntlProviderProps) {
  const { locale } = useLocale();
  
  return (
    <NextIntlClientProvider locale={locale} messages={allMessages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}