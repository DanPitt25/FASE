import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import UnsubscribeContent from './UnsubscribeContent';

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <Link href="https://fasemga.com">
            <Image
              src="/FASE-Logo-Lockup-RGB.png"
              alt="FASE Logo"
              width={200}
              height={60}
              className="mx-auto"
            />
          </Link>
        </div>

        <Suspense fallback={
          <div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        }>
          <UnsubscribeContent />
        </Suspense>
      </div>
    </div>
  );
}
