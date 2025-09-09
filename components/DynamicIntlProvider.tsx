'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';

interface DynamicIntlProviderProps {
  children: ReactNode;
  allMessages: { en: any; fr: any };
}

export default function DynamicIntlProvider({ children, allMessages }: DynamicIntlProviderProps) {
  // Just use English by default for now to fix the SSR issue
  // TODO: Re-implement dynamic locale switching after fixing SSR
  const locale = 'en';
  
  return (
    <NextIntlClientProvider locale={locale} messages={allMessages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}