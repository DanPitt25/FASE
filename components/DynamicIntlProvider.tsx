'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from '../contexts/LocaleContext';
import { ReactNode, useState, useEffect } from 'react';

interface DynamicIntlProviderProps {
  children: ReactNode;
  allMessages: { en: any; fr: any };
}

export default function DynamicIntlProvider({ children, allMessages }: DynamicIntlProviderProps) {
  const [mounted, setMounted] = useState(false);
  const { locale } = useLocale();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Return a simple div during server-side rendering
  if (!mounted) {
    return <div>{children}</div>;
  }
  
  return (
    <NextIntlClientProvider locale={locale} messages={allMessages[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}