'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import LoginForm from './login-form';
import LanguageToggle from '../../components/LanguageToggle';

export default function Login() {
  const t = useTranslations('login_form');

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border-4 border-fase-gold shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-4 py-6 pt-8 text-center sm:px-16 relative">
          {/* Language Toggle */}
          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>
          
          <Link href="/">
            <Image 
              src="/fase-logo-rgb.png" 
              alt="FASE Logo" 
              width={120}
              height={48}
              className="h-12 w-auto object-contain mb-4 cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
          <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('title')}</h3>
          <p className="text-sm text-fase-black">
            {t('subtitle')}
          </p>
        </div>
        <div className="bg-white px-4 py-8 sm:px-16">
          <Suspense fallback={<div className="animate-pulse h-64 bg-fase-cream rounded"></div>}>
            <LoginForm />
          </Suspense>
          <div className="text-center text-sm text-fase-black mt-6 space-y-2">
            <p>
              {t('new_member')}{" "}
              <Link href="/register" className="font-semibold text-fase-navy hover:underline">
                {t('sign_up_link')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
