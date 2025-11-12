'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import Button from '../../../components/Button';
import Link from 'next/link';
import Image from 'next/image';
import LanguageToggle from '../../../components/LanguageToggle';

interface InviteData {
  memberId: string;
  companyId: string;
  email: string;
  name: string;
  companyName: string;
  timestamp: number;
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'validate' | 'check-existing' | 'create-password' | 'sign-in' | 'complete'>('validate');

  const validateInviteToken = useCallback(async () => {
    try {
      // Decode the URL-safe base64 token
      const base64 = params.token.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const decodedData = JSON.parse(atob(padded));
      
      // Validate token structure
      if (!decodedData.memberId || !decodedData.companyId || !decodedData.email || !decodedData.name) {
        throw new Error('Invalid invitation link');
      }
      
      // Add fallback for company name if not present (for old tokens)
      if (!decodedData.companyName) {
        decodedData.companyName = 'the Team';
      }

      // Check if token is not too old (24 hours)
      const tokenAge = Date.now() - decodedData.timestamp;
      if (tokenAge > 24 * 60 * 60 * 1000) {
        throw new Error('Invitation link has expired. Please request a new invitation.');
      }

      setInviteData(decodedData);
      setStep('check-existing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid invitation link');
    } finally {
      setLoading(false);
    }
  }, [params.token]);

  useEffect(() => {
    validateInviteToken();
  }, [validateInviteToken]);

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      capital: /[A-Z]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const isValid = requirements.length && requirements.capital && requirements.special;
    return { requirements, isValid };
  };

  const handleCreateAccount = async () => {
    if (!inviteData) return;

    try {
      setProcessing(true);
      setError(null);

      // Validate passwords match
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate password strength
      const { isValid } = validatePassword(password);
      if (!isValid) {
        throw new Error('Password must be at least 8 characters with at least one capital letter and one special character');
      }

      // Call server-side API to create account and update member document
      const response = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteData.email,
          password: password,
          inviteData: inviteData
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create account');
      }

      const { customToken } = responseData;

      // Sign in with the custom token
      await signInWithCustomToken(auth, customToken);

      // Create welcome message for new user (async, don't wait for completion)
      try {
        const { createWelcomeMessage } = await import('../../../lib/unified-messaging');
        // Use the user data from the response since we have the user ID from the custom token
        const userFromCustomToken = auth.currentUser;
        if (userFromCustomToken) {
          createWelcomeMessage(userFromCustomToken.uid).catch(error => {
            console.error('Failed to create welcome message:', error);
          });
        }
      } catch (error) {
        console.error('Failed to import welcome message function:', error);
      }

      setStep('complete');
      
      // Redirect to member portal after a short delay
      setTimeout(() => {
        router.push('/member-portal');
      }, 3000);

    } catch (err) {
      console.error('Error creating account:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setProcessing(false);
    }
  };

  const handleSignInExisting = async () => {
    if (!inviteData) return;

    try {
      setProcessing(true);
      setError(null);

      // Sign in with existing account
      await signInWithEmailAndPassword(auth, inviteData.email, password);

      // Call API to link user to company
      const response = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteData.email,
          inviteData: inviteData,
          linkExistingUser: true
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to join team');
      }

      setStep('complete');
      
      // Redirect to member portal after a short delay
      setTimeout(() => {
        router.push('/member-portal');
      }, 3000);

    } catch (err) {
      console.error('Error signing in existing user:', err);
      if (err instanceof Error && err.message.includes('wrong-password')) {
        setError('Incorrect password. Please try again.');
      } else if (err instanceof Error && err.message.includes('user-not-found')) {
        setError('No account found with this email. Please create a new account instead.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to sign in');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border-4 border-fase-gold shadow-xl">
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-4 py-6 pt-8 text-center sm:px-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mb-4"></div>
            <p className="text-fase-black">Validating invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
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
            <svg className="w-12 h-12 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-noto-serif font-semibold text-red-900">Invalid Invitation</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <div className="bg-white px-4 py-8 sm:px-16 text-center">
            <Button href="/" variant="secondary" size="medium">
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border-4 border-fase-gold shadow-xl">
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-4 py-6 pt-8 text-center sm:px-16">
            <Link href="/">
              <Image 
                src="/fase-logo-rgb.png" 
                alt="FASE Logo" 
                width={120}
                height={48}
                className="h-12 w-auto object-contain mb-4 cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>
            <svg className="w-12 h-12 text-green-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-xl font-noto-serif font-semibold text-green-900">Account Created!</h3>
            <p className="text-sm text-green-700">Welcome to FASE! Redirecting to member portal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'check-existing') {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
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
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Welcome to {inviteData?.companyName || 'the Team'}!</h3>
            <p className="text-sm text-fase-black">
              Hi {inviteData?.name}! You've been invited to join as a team member.
            </p>
            <p className="text-sm text-gray-600">
              Email: {inviteData?.email}
            </p>
          </div>
          <div className="bg-white px-4 py-8 sm:px-16 space-y-4">
            <p className="text-sm text-fase-black text-center mb-6">
              Do you already have a FASE account with this email address?
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => setStep('sign-in')}
                variant="primary"
                size="large"
                className="w-full"
              >
                Yes, I have an account - Sign In
              </Button>
              
              <Button
                onClick={() => setStep('create-password')}
                variant="secondary"
                size="large"
                className="w-full"
              >
                No, I need to create an account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'sign-in') {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
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
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Sign In to Join Team</h3>
            <p className="text-sm text-fase-black">
              Enter your FASE account password to join {inviteData?.companyName || 'the team'}.
            </p>
          </div>
          <div className="bg-white px-4 py-8 sm:px-16">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteData?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="Enter your FASE password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleSignInExisting}
                  disabled={processing || !password}
                  variant="primary"
                  size="large"
                  className="w-full"
                >
                  {processing ? 'Signing In...' : 'Sign In & Join Team'}
                </Button>
                
                <Button
                  onClick={() => setStep('check-existing')}
                  variant="secondary"
                  size="large"
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const passwordValidation = validatePassword(password);

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-fase-navy bg-cover bg-center bg-no-repeat p-8 sm:p-12 lg:p-16" style={{backgroundImage: 'url(/capacity.jpg)'}}>
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
          <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Complete Your Account</h3>
          <p className="text-sm text-fase-black">
            Welcome {inviteData?.name}! Create a secure password to access your FASE account.
          </p>
        </div>
        <div className="bg-white px-4 py-8 sm:px-16">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={inviteData?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="Create a secure password"
              />
              {password && (
                <div className="mt-2 text-xs space-y-1">
                  <div className={passwordValidation.requirements.length ? 'text-green-600' : 'text-red-600'}>
                    ✓ At least 8 characters
                  </div>
                  <div className={passwordValidation.requirements.capital ? 'text-green-600' : 'text-red-600'}>
                    ✓ At least one capital letter
                  </div>
                  <div className={passwordValidation.requirements.special ? 'text-green-600' : 'text-red-600'}>
                    ✓ At least one special character
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="Confirm your password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              onClick={handleCreateAccount}
              disabled={processing || !passwordValidation.isValid || password !== confirmPassword}
              variant="primary"
              size="large"
              className="w-full"
            >
              {processing ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}