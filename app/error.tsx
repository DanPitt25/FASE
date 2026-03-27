'use client';

import { useEffect } from 'react';
import { reportError } from '../lib/error-reporter';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to admin
    reportError(error, { digest: error.digest }, 'high').catch(() => {
      // Silently fail - don't break the error page
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-noto-serif font-medium text-fase-navy mb-4">
          Something went wrong
        </h1>

        <p className="text-gray-600 mb-6">
          We apologize for the inconvenience. Our team has been notified and is looking into it.
        </p>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-fase-navy text-white py-3 px-6 rounded-lg font-medium hover:bg-fase-orange transition-colors"
          >
            Try again
          </button>

          <a
            href="/"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Return to home
          </a>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          If this problem persists, please contact{' '}
          <a href="mailto:admin@fasemga.com" className="text-fase-navy hover:underline">
            admin@fasemga.com
          </a>
        </p>
      </div>
    </div>
  );
}
