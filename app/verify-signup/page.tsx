'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifySignup() {
  const router = useRouter();

  useEffect(() => {
    // This page is no longer needed with the new verification flow
    // Redirect to login page
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-fase-pearl flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Email Verified!</h2>
        <p className="text-sm text-gray-600 mb-4">
          Your email has been verified. You can now sign in to your account.
        </p>
        <a
          href="/login"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-fase-navy hover:bg-fase-graphite focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fase-navy"
        >
          Go to Sign In
        </a>
      </div>
    </div>
  );
}