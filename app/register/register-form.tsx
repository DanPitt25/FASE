'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '../../lib/auth';
import Button from '../../components/Button';

// Password validation function
const validatePassword = (password: string) => {
  const requirements = {
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const isValid = requirements.length && requirements.capital && requirements.special;
  return { requirements, isValid };
};

export default function RegisterForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const { isValid, requirements } = validatePassword(password);
    if (!isValid) {
      let errorMsg = 'Password must include: ';
      const missing = [];
      if (!requirements.length) missing.push('at least 8 characters');
      if (!requirements.capital) missing.push('one capital letter');
      if (!requirements.special) missing.push('one special character');
      setError(errorMsg + missing.join(', '));
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      await signUp(email, password, displayName.trim());
      router.push('/member-portal');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-fase-steel">
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          placeholder="Personal or Business Name"
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
      </div>
      
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
          onChange={(e) => {
            setPassword(e.target.value);
            setShowPasswordReqs(e.target.value.length > 0);
          }}
          onFocus={() => setShowPasswordReqs(true)}
          onBlur={() => setShowPasswordReqs(password.length > 0)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
        
        {/* Password Requirements */}
        {showPasswordReqs && (
          <div className="mt-2 p-3 bg-fase-paper rounded-md border border-fase-silver">
            <p className="text-xs font-medium text-fase-steel mb-2">Password must include:</p>
            {(() => {
              const { requirements } = validatePassword(password);
              return (
                <div className="space-y-1">
                  <div className={`text-xs flex items-center ${requirements.length ? 'text-green-600' : 'text-fase-steel'}`}>
                    <span className="mr-2">{requirements.length ? '✓' : '○'}</span>
                    At least 8 characters
                  </div>
                  <div className={`text-xs flex items-center ${requirements.capital ? 'text-green-600' : 'text-fase-steel'}`}>
                    <span className="mr-2">{requirements.capital ? '✓' : '○'}</span>
                    One capital letter (A-Z)
                  </div>
                  <div className={`text-xs flex items-center ${requirements.special ? 'text-green-600' : 'text-fase-steel'}`}>
                    <span className="mr-2">{requirements.special ? '✓' : '○'}</span>
                    One special character (!@#$%^&*...)
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-fase-steel">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
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
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}