'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from '../contexts/LocaleContext';
import { ReactNode, useEffect, useState } from 'react';

interface DynamicIntlProviderProps {
  children: ReactNode;
  allMessages: { en: any; fr: any };
}

export default function DynamicIntlProvider({ children, allMessages }: DynamicIntlProviderProps) {
  const { locale } = useLocale();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch by using en as default until mounted
  const currentLocale = isMounted ? locale : 'en';
  
  return (
    <NextIntlClientProvider locale={currentLocale} messages={allMessages[currentLocale]}>
      {children}
    </NextIntlClientProvider>
  );
}