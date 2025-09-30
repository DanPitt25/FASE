'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendVerificationEmail, checkEmailVerification } from '../lib/auth';
import Button from './Button';
import { handleAuthError } from '../lib/auth-errors';

interface EmailVerificationProps {
  onVerified: () => void;
}

export default function EmailVerification({ onVerified }: EmailVerificationProps) {
  const { user } = useAuth();
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSendVerification = async () => {
    setSending(true);
    setError('');
    
    try {
      await sendVerificationEmail();
      setEmailSent(true);
      setCountdown(60); // 60 second cooldown
    } catch (error: any) {
      setError(handleAuthError(error));
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    setError('');
    
    try {
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        onVerified();
      } else {
        setError('Email not yet verified. Please check your email and click the verification link.');
      }
    } catch (error: any) {
      setError(handleAuthError(error));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg border border-fase-light-gold">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-2">Verify Your Email</h2>
        <p className="text-fase-black">
          We need to verify your email address to secure your account.
        </p>
      </div>

      <div className="mb-6">
        <p className="text-sm text-fase-black text-center mb-4">
          Email: <strong>{user?.email}</strong>
        </p>
        
        {!emailSent ? (
          <div className="text-center">
            <p className="text-fase-black mb-4">
              Click below to send a verification email to your inbox.
            </p>
            <Button 
              onClick={handleSendVerification}
              variant="primary" 
              size="large" 
              className="w-full"
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send Verification Email'}
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <p className="text-green-800 text-sm">
                ✓ Verification email sent! Check your inbox and spam folder.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleCheckVerification}
                variant="primary" 
                size="large" 
                className="w-full"
                disabled={checking}
              >
                {checking ? 'Checking...' : 'I\'ve Verified My Email'}
              </Button>
              
              <Button 
                onClick={handleSendVerification}
                variant="secondary" 
                size="medium" 
                className="w-full"
                disabled={sending || countdown > 0}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

    </div>
  );
}