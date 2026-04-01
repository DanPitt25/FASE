'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import Button from '../../../components/Button';

export default function RequestCapacityMatchingLinkPage() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/capacity-matching/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactEmail: email.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl border-4 border-fase-gold overflow-hidden flex flex-col items-center justify-center py-16 px-8 text-center">
          <svg className="w-16 h-16 text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h2 className="text-xl font-semibold text-fase-navy mb-4">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            If your email is registered, you will receive a link to complete the Capacity Matching questionnaire shortly.
          </p>
          <p className="text-sm text-gray-500">
            The link will be valid for 48 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl border-4 border-fase-gold overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-6 py-8 text-center">
          <Link href="/">
            <Image
              src="/fase-logo-rgb.png"
              alt="FASE Logo"
              width={120}
              height={48}
              className="h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
          <h1 className="text-2xl font-noto-serif font-semibold text-fase-navy">Request Access</h1>
        </div>

        {/* Form */}
        <div className="bg-white px-6 py-8">
          <p className="text-gray-600 mb-6 text-center">
            Enter your details below to receive a link to the FASE Capacity Matching questionnaire.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                disabled={submitting}
                placeholder="Your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                disabled={submitting}
                placeholder="your.email@company.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Sending...' : 'Send Me a Link'}
            </Button>
          </form>

          <p className="mt-6 text-xs text-gray-500 text-center">
            Already a FASE member?{' '}
            <Link href="/member-portal" className="text-fase-navy hover:underline">
              Log in to the Member Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
