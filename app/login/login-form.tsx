'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, resendVerificationEmail } from '../../lib/auth';
import Button from '../../components/Button';
import { handleAuthError } from '../../lib/auth-errors';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setShowVerifiedMessage(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      router.push('/member-portal');
    } catch (error: any) {
      const errorMessage = handleAuthError(error);
      setError(errorMessage);
      
      // Show resend option if it's an email verification error
      if (errorMessage.includes('verify your email')) {
        setShowResendOption(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || !password) return;
    
    setResendLoading(true);
    setResendMessage('');
    
    try {
      await resendVerificationEmail(email, password);
      setResendMessage('Verification email sent! Please check your inbox.');
      setShowResendOption(false);
    } catch (error: any) {
      setResendMessage(handleAuthError(error));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showVerifiedMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Email Verified Successfully!
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Your email has been verified. You can now sign in to your account.
              </p>
            </div>
          </div>
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-fase-steel">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-fase-steel">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {showResendOption && (
        <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
          <div className="text-sm text-blue-800 mb-3">
            <strong>Need a new verification email?</strong>
            <br />
            We can resend the verification email to your inbox.
          </div>
          <Button 
            type="button"
            variant="secondary" 
            size="small"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="w-full"
          >
            {resendLoading ? 'Sending...' : 'Resend Verification Email'}
          </Button>
        </div>
      )}

      {resendMessage && (
        <div className={`text-sm ${resendMessage.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
          {resendMessage}
        </div>
      )}

      <Button 
        type="submit" 
        variant="primary" 
        size="large" 
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  );
}