'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      setStatus('error');
      setErrorMessage('Invalid unsubscribe link');
      return;
    }

    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success');
        } else {
          const data = await res.json();
          setStatus('error');
          setErrorMessage(data.error || 'Failed to unsubscribe');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage('An error occurred. Please try again.');
      });
  }, [searchParams]);

  return (
    <>
      {status === 'loading' && (
        <div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your request...</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unsubscribed</h1>
          <p className="text-gray-600">
            You have been successfully unsubscribed from FASE marketing emails.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            You will continue to receive transactional emails related to your membership or event registrations.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600">{errorMessage}</p>
          <p className="text-sm text-gray-500 mt-4">
            If you continue to have issues, please contact{' '}
            <a href="mailto:admin@fasemga.com" className="text-blue-600 hover:underline">
              admin@fasemga.com
            </a>
          </p>
        </div>
      )}
    </>
  );
}
