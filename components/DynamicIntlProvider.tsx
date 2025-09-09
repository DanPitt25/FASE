'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from '../contexts/LocaleContext';
import { ReactNode, useState, useEffect } from 'react';

interface DynamicIntlProviderProps {
  children: ReactNode;
  allMessages: { en: any; fr: any };
}

export default function DynamicIntlProvider({ children, allMessages }: DynamicIntlProviderProps) {
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use default locale during SSR to prevent hydration mismatch
  const currentLocale = mounted ? locale : 'en';
  
  return (
    <NextIntlClientProvider 
      locale={currentLocale} 
      messages={allMessages[currentLocale]}
      // Force re-render when locale changes
      key={currentLocale}
    >
      {children}
    </NextIntlClientProvider>
  );
}