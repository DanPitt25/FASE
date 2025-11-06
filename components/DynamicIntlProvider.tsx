'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from '../contexts/LocaleContext';
import { ReactNode, useState, useEffect } from 'react';

interface DynamicIntlProviderProps {
  children: ReactNode;
  allMessages: { en: any; fr: any; de: any; es: any; it: any; };
}

export default function DynamicIntlProvider({ children, allMessages }: DynamicIntlProviderProps) {
  const { locale } = useLocale();
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Small delay to ensure localStorage has been read
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Use the actual locale as early as possible to minimize flash
  // During SSR, we'll use 'en' but switch immediately on hydration
  // Fallback to 'en' if locale is not supported in allMessages
  const currentLocale = (locale && allMessages[locale as keyof typeof allMessages]) ? locale : 'en';
  
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