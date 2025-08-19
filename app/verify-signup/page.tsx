'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleSignupVerificationLink, completeSignupAfterVerification } from '../../lib/auth';
import { handleAuthError } from '../../lib/auth-errors';
import Button from '../../components/Button';

export default function VerifySignupPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleVerification = async () => {
      try {
        const verifiedEmail = await handleSignupVerificationLink();
        if (verifiedEmail) {
          setEmail(verifiedEmail);
        } else {
          setError('Invalid verification link. Please try registering again.');
        }
      } catch (error: any) {
        setError(handleAuthError(error));
      } finally {
        setLoading(false);
      }
    };

    handleVerification();
  }, []);

  const completeRegistration = async () => {
    setCompleting(true);
    setError('');

    try {
      const storedPassword = localStorage.getItem('pendingPassword');
      if (!storedPassword) {
        throw new Error('Registration session expired. Please start over.');
      }

      await completeSignupAfterVerification(email, storedPassword);
      
      // Clear stored password
      localStorage.removeItem('pendingPassword');
      
      // Redirect to member portal
      router.push('/member-portal');
    } catch (error: any) {
      setError(handleAuthError(error));
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fase-paper flex items-center justify-center px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg border border-fase-silver">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-fase-pearl rounded-full mx-auto mb-4"></div>
              <div className="h-6 bg-fase-pearl rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-fase-pearl rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-fase-paper flex items-center justify-center px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg border border-fase-silver">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-futura font-bold text-red-600 mb-2">Verification Failed</h2>
            <p className="text-fase-steel mb-4">{error}</p>
            <Button href="/register" variant="primary" size="medium">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fase-paper flex items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg border border-fase-silver">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-futura font-bold text-fase-navy mb-2">Email Verified!</h2>
          <p className="text-fase-steel mb-4">
            Your email address <strong>{email}</strong> has been verified successfully.
          </p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <p className="text-green-800 text-sm">
            ✓ Click below to complete your FASE membership registration.
          </p>
        </div>
        
        <Button 
          onClick={completeRegistration}
          variant="primary" 
          size="large" 
          className="w-full"
          disabled={completing}
        >
          {completing ? 'Creating Account...' : 'Complete Registration'}
        </Button>
      </div>
    </div>
  );
}