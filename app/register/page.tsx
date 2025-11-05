'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import IntegratedRegisterForm from './integrated-register-form';
import LanguageToggle from '../../components/LanguageToggle';

export default function Register() {
  const tCommon = useTranslations('common');
  
  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="relative z-10 w-full max-w-md sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-8rem)] bg-white rounded-lg shadow-xl border-4 border-fase-gold overflow-hidden flex flex-col">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-6 py-8 text-center relative flex-shrink-0">
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
              className="h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
        <div className="bg-white px-6 py-8 flex-1 overflow-y-auto">
          <Suspense fallback={<div className="flex justify-center items-center py-8">{tCommon('loading')}</div>}>
            <IntegratedRegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
