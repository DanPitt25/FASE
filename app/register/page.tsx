import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import IntegratedRegisterForm from './integrated-register-form';
import LanguageToggle from '../../components/LanguageToggle';

export default function Register() {
  return (
    <div className="min-h-screen bg-fase-navy py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl border border-fase-light-gold overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-6 py-8 text-center relative">
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
          <div className="bg-white px-6 py-8">
            <Suspense fallback={<div className="flex justify-center items-center py-8">Loading...</div>}>
              <IntegratedRegisterForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
