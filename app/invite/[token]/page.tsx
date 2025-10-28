'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, deleteDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import Button from '../../../components/Button';
import PageLayout from '../../../components/PageLayout';

interface InviteData {
  memberId: string;
  companyId: string;
  email: string;
  name: string;
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
  const [step, setStep] = useState<'validate' | 'create-password' | 'complete'>('validate');

  useEffect(() => {
    validateInviteToken();
  }, []);

  const validateInviteToken = async () => {
    try {
      // Decode the token
      const decodedData = JSON.parse(atob(params.token));
      
      // Validate token structure
      if (!decodedData.memberId || !decodedData.companyId || !decodedData.email || !decodedData.name) {
        throw new Error('Invalid invitation link');
      }

      // Check if token is not too old (24 hours)
      const tokenAge = Date.now() - decodedData.timestamp;
      if (tokenAge > 24 * 60 * 60 * 1000) {
        throw new Error('Invitation link has expired. Please request a new invitation.');
      }

      setInviteData(decodedData);
      setStep('create-password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid invitation link');
    } finally {
      setLoading(false);
    }
  };

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

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, inviteData.email, password);
      const user = userCredential.user;

      // Update the member document: move from generated ID to Firebase Auth UID
      const oldMemberRef = doc(db, 'accounts', inviteData.companyId, 'members', inviteData.memberId);
      const newMemberRef = doc(db, 'accounts', inviteData.companyId, 'members', user.uid);

      // Fetch the existing member data
      const oldMemberDoc = await getDoc(oldMemberRef);
      if (!oldMemberDoc.exists()) {
        throw new Error('Member invitation not found or has already been used');
      }

      const existingMemberData = oldMemberDoc.data();

      // Create new member document with Firebase Auth UID, preserving existing data
      const memberData = {
        ...existingMemberData,
        id: user.uid,
        accountConfirmed: true,
        inviteAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Create new member document with Firebase Auth UID
      await setDoc(newMemberRef, memberData);

      // Delete the old member document with generated ID
      await deleteDoc(oldMemberRef);

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

  if (loading) {
    return (
      <PageLayout currentPage="">
        <div className="max-w-md mx-auto text-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Validating invitation...</p>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout currentPage="">
        <div className="max-w-md mx-auto py-20">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-red-900 mb-2">Invalid Invitation</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Button href="/" variant="secondary" size="medium">
              Return to Home
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (step === 'complete') {
    return (
      <PageLayout currentPage="">
        <div className="max-w-md mx-auto py-20">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="text-lg font-semibold text-green-900 mb-2">Account Created Successfully!</h2>
            <p className="text-green-700 mb-4">
              Welcome to FASE! Your account has been created and you now have access to your company&apos;s member portal.
            </p>
            <p className="text-sm text-green-600">
              Redirecting to member portal in a few seconds...
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const passwordValidation = validatePassword(password);

  return (
    <PageLayout currentPage="">
      <div className="max-w-md mx-auto py-20">
        <div className="bg-white border border-fase-light-gold rounded-lg p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-noto-serif font-bold text-fase-navy mb-2">
              Complete Your Account
            </h1>
            <p className="text-fase-black">
              Welcome {inviteData?.name}! Please create a secure password to access your FASE account.
            </p>
          </div>

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
    </PageLayout>
  );
}