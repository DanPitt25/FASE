'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../../lib/firebase';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (mode === 'verifyEmail' && oobCode) {
      // Apply the email verification code (this updates Firebase Auth automatically)
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatus('success');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login?verified=true');
          }, 3000);
        })
        .catch((error) => {
          setStatus('error');
          setError(error.message);
        });
    } else {
      setStatus('error');
      setError('Invalid verification link');
    }
  }, [searchParams, router]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-fase-pearl flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Verifying Email...</h2>
          <p className="text-sm text-gray-600">
            Please wait while we verify your email address.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-fase-pearl flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Email Verified Successfully!</h2>
          <p className="text-sm text-gray-600 mb-6">
            Your email has been verified. You will be redirected to the sign in page shortly.
          </p>
          <a
            href="/login?verified=true"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-fase-navy hover:bg-fase-graphite focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fase-navy"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fase-pearl flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Verification Failed</h2>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <div className="space-y-3">
          <a
            href="/register"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-fase-navy hover:bg-fase-graphite focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fase-navy"
          >
            Register Again
          </a>
          <br />
          <a
            href="/login"
            className="inline-flex items-center px-4 py-2 border border-fase-silver text-sm font-medium rounded-md shadow-sm text-fase-steel hover:text-fase-navy focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fase-navy"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}

export default function VerifySignup() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-fase-pearl flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}