'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import Button from '../../components/Button';
import LanguageToggle from '../../components/LanguageToggle';

type Status = 'idle' | 'loading' | 'success' | 'error' | 'already_setup' | 'company_pending' | 'not_found';

export default function SetupAccountPage() {
  const t = useTranslations('setup_account');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/check-member-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sendInvite: true })
      });

      const data = await response.json();

      if (!data.found) {
        setStatus('not_found');
        setMessage(t('not_found_message'));
        return;
      }

      if (data.accountConfirmed) {
        setStatus('already_setup');
        setMessage(t('already_setup_message'));
        return;
      }

      if (data.companyPending) {
        setStatus('company_pending');
        setMessage(t('company_pending_message'));
        return;
      }

      if (data.inviteSent) {
        setStatus('success');
        setCompanyName(data.companyName || '');
        setMessage(t('invite_sent_message'));
      } else if (data.error) {
        setStatus('error');
        setMessage(data.error);
      }
    } catch (error) {
      setStatus('error');
      setMessage(t('error_message'));
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16"
      style={{ backgroundImage: 'url(/capacity.jpg)' }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border-4 border-fase-gold shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-4 py-6 pt-8 text-center sm:px-16 relative">
          <div className="absolute top-4 right-4">
            <LanguageToggle />
          </div>

          <Link href="/">
            <Image
              src="/fase-logo-rgb.png"
              alt="FASE Logo"
              width={120}
              height={48}
              className="h-12 w-auto object-contain mb-4 cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>

          <h1 className="text-xl font-noto-serif font-semibold text-fase-navy">
            {t('title')}
          </h1>
          <p className="text-sm text-fase-black">
            {t('description')}
          </p>
        </div>

        <div className="bg-white px-4 py-8 sm:px-16">
          {status === 'success' ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-800">{t('success_title')}</h3>
              <p className="text-sm text-gray-600">
                {t('success_message', { companyName })}
              </p>
              <p className="text-xs text-gray-500 mt-4">
                {t('check_spam')}
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="text-sm text-fase-navy hover:text-fase-gold transition-colors underline"
                >
                  {t('back_to_login')}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-fase-black mb-2">
                  {t('email_label')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status !== 'idle' && status !== 'loading') {
                      setStatus('idle');
                      setMessage('');
                    }
                  }}
                  required
                  placeholder={t('email_placeholder')}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
                />
              </div>

              {status === 'not_found' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">{message}</p>
                  <p className="text-xs text-amber-600 mt-2">
                    {t('not_found_help')}
                  </p>
                </div>
              )}

              {status === 'already_setup' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">{message}</p>
                  <Link
                    href="/login"
                    className="text-sm text-fase-navy hover:text-fase-gold transition-colors underline mt-2 inline-block"
                  >
                    {t('go_to_login')}
                  </Link>
                </div>
              )}

              {status === 'company_pending' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{message}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="large"
                className="w-full"
                disabled={status === 'loading' || !email}
              >
                {status === 'loading' ? t('checking') : t('submit_button')}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-sm text-fase-navy hover:text-fase-gold transition-colors underline"
                >
                  {t('back_to_login')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
