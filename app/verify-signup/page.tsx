'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleSignupVerificationLink, completeSignupAfterVerification } from '../../lib/auth';

export default function VerifySignup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationChecked, setVerificationChecked] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkVerificationLink = async () => {
      try {
        const emailFromLink = await handleSignupVerificationLink();
        if (emailFromLink) {
          setEmail(emailFromLink);
          setIsValidLink(true);
        } else {
          setError('Invalid or expired verification link');
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setVerificationChecked(true);
      }
    };

    checkVerificationLink();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the stored password from registration
    const storedPassword = localStorage.getItem('pendingPassword');
    if (!storedPassword) {
      setError('No password found. Please register again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await completeSignupAfterVerification(email, storedPassword);
      // Clean up stored password after successful verification
      localStorage.removeItem('pendingPassword');
      router.push('/member-portal');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!verificationChecked) {
    return (
      <div className="min-h-screen bg-fase-pearl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-fase-navy mx-auto"></div>
          <p className="mt-4 text-fase-steel">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (!isValidLink) {
    return (
      <div className="min-h-screen bg-fase-pearl flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">Verification Failed</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-6">
              <a
                href="/register"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-fase-navy hover:bg-fase-graphite focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fase-navy"
              >
                Try Again
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fase-pearl flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verified!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Complete your registration for <span className="font-medium">{email}</span>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-blue-800 text-sm">
              <strong>Ready to complete your registration!</strong><br />
              Your account will be created with the password you provided during registration.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-fase-navy hover:bg-fase-graphite focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fase-navy disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                'Complete Registration'
              )}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/login"
              className="font-medium text-fase-navy hover:text-fase-graphite"
            >
              Already have an account? Sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}