'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { validatePasswordResetToken, resetPassword } from '../../lib/auth';
import { validatePassword } from '../register/form-components';
import Button from '../../components/Button';
import { handleAuthError } from '../../lib/auth-errors';

export default function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValidating, setTokenValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const hasValidatedToken = useRef(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('reset_password');

  useEffect(() => {
    // Get email and token from URL parameters
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');
    
    if (!emailParam || !tokenParam) {
      setError(t('invalid_reset_link'));
      setTokenValidating(false);
      return;
    }

    setEmail(emailParam);
    setToken(tokenParam);

    // Only validate the token once to prevent it from being invalidated on language change
    if (!hasValidatedToken.current) {
      hasValidatedToken.current = true;
      validateToken(emailParam, tokenParam);
    }
  }, [searchParams]);

  const validateToken = async (email: string, token: string) => {
    try {
      setTokenValidating(true);
      const isValid = await validatePasswordResetToken(email, token);
      
      if (isValid) {
        setTokenValid(true);
      } else {
        setError(t('invalid_or_expired_token'));
      }
    } catch (error: any) {
      setError(t('invalid_or_expired_token'));
    } finally {
      setTokenValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError(t('passwords_dont_match'));
      return;
    }

    const { isValid, requirements } = validatePassword(newPassword);
    if (!isValid) {
      let errorMsg = t('password_requirements_prefix');
      const missing = [];
      if (!requirements.length) missing.push(t('eight_characters'));
      if (!requirements.capital) missing.push(t('capital_letter'));
      if (!requirements.special) missing.push(t('special_character'));
      setError(errorMsg + missing.join(", "));
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await resetPassword(email, token, newPassword);
      setPasswordReset(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 3000);
    } catch (error: any) {
      const errorMessage = handleAuthError(error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (tokenValidating) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
        <p className="mt-4 text-sm text-fase-black">{t('validating_token')}</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-2">{t('invalid_link_title')}</h3>
        <p className="text-sm text-red-700 mb-4">{error || t('invalid_link_message')}</p>
        <Button 
          variant="primary" 
          onClick={() => router.push('/login')}
        >
          {t('back_to_login')}
        </Button>
      </div>
    );
  }

  if (passwordReset) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-green-800 mb-2">{t('password_reset_success_title')}</h3>
        <p className="text-sm text-green-700 mb-4">{t('password_reset_success_message')}</p>
        <p className="text-xs text-fase-black">{t('redirecting_to_login')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-fase-light-blue rounded-lg p-4">
        <p className="text-sm text-fase-navy">
          {t('reset_instructions', { email })}
        </p>
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-fase-black">
          {t('new_password_label')} *
        </label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onFocus={() => setShowPasswordReqs(true)}
          onBlur={() => setShowPasswordReqs(false)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-light-gold rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
        
        {showPasswordReqs && (
          <div className="mt-2 p-3 bg-fase-cream rounded-md">
            <p className="text-xs font-medium text-fase-navy mb-2">{t('password_requirements')}</p>
            <ul className="text-xs text-fase-black space-y-1">
              <li className={`flex items-center ${newPassword.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-2">{newPassword.length >= 8 ? '✓' : '✗'}</span>
                {t('eight_characters')}
              </li>
              <li className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-2">{/[A-Z]/.test(newPassword) ? '✓' : '✗'}</span>
                {t('capital_letter')}
              </li>
              <li className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-2">{/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '✓' : '✗'}</span>
                {t('special_character')}
              </li>
            </ul>
          </div>
        )}
      </div>
      
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-fase-black">
          {t('confirm_password_label')} *
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-light-gold rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <Button 
        type="submit" 
        variant="primary" 
        size="large" 
        className="w-full"
        disabled={loading}
      >
        {loading ? t('resetting_password') : t('reset_password_button')}
      </Button>
    </form>
  );
}