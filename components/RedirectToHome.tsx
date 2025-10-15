'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-noto-serif font-medium text-fase-navy mb-4">
          Redirecting...
        </h1>
        <p className="text-fase-black">
          Taking you back to the home page.
        </p>
      </div>
    </div>
  );
}