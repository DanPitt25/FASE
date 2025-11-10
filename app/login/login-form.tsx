'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from '../../contexts/LocaleContext';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';
import { signIn, sendPasswordReset } from '../../lib/auth';
import Button from '../../components/Button';
import { handleAuthError } from '../../lib/auth-errors';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(false);
  const [showPasswordResetMessage, setShowPasswordResetMessage] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('login_form');
  const { locale } = useLocale();
  const { user, authError, hasMemberAccess } = useUnifiedAuth();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setShowVerifiedMessage(true);
    }
    if (searchParams.get('reset') === 'success') {
      setShowPasswordResetMessage(true);
    }
  }, [searchParams]);

  // Handle successful authentication and redirect
  useEffect(() => {
    if (user && hasMemberAccess && !authError) {
      router.push('/member-portal');
    }
  }, [user, hasMemberAccess, authError, router]);

  // Display auth errors from context with proper translations
  useEffect(() => {
    if (authError) {
      // Handle custom account status errors with translations
      if (authError.name === 'AccountPendingError') {
        setError(t('account_pending'));
      } else if (authError.name === 'AccountInvoicePendingError') {
        setError(t('account_invoice_pending'));
      } else if (authError.name === 'AccountNotApprovedError') {
        setError(t('account_rejected'));
      } else if (authError.name === 'AccountNotFoundError') {
        setError(t('account_not_found'));
      } else {
        // For other errors, use the existing error handler
        const errorMessage = handleAuthError(authError);
        setError(errorMessage);
      }
    }
  }, [authError, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      // Redirect is now handled by useEffect watching user/hasMemberAccess/authError
    } catch (error: any) {
      const errorMessage = handleAuthError(error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError(t('enter_email_first'));
      return;
    }

    console.log('🔍 Password reset - Current locale:', locale);
    console.log('🔍 Password reset - Email:', email);

    setResetLoading(true);
    setError('');

    try {
      await sendPasswordReset(email, locale);
      setResetSent(true);
    } catch (error: any) {
      const errorMessage = handleAuthError(error);
      setError(errorMessage);
    } finally {
      setResetLoading(false);
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
                {t('email_verified_title')}
              </h3>
              <p className="mt-1 text-sm text-green-700">
                {t('email_verified_message')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {showPasswordResetMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                {t('password_reset_complete_title')}
              </h3>
              <p className="mt-1 text-sm text-green-700">
                {t('password_reset_complete_message')}
              </p>
            </div>
          </div>
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-fase-black">
          {t('email_label')}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-light-gold rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-fase-black">
          {t('password_label')}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-light-gold rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {resetSent && (
        <div className="text-green-600 text-sm">
          {t('password_reset_sent')}
        </div>
      )}

      <Button 
        type="submit" 
        variant="primary" 
        size="large" 
        className="w-full"
        disabled={loading}
      >
        {loading ? t('signing_in') : t('sign_in_button')}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={resetLoading}
          className="text-sm text-fase-navy hover:text-fase-gold transition-colors underline"
        >
          {resetLoading ? t('sending') : t('forgot_password')}
        </button>
      </div>
    </form>
  );
}