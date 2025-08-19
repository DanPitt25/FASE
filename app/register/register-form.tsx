'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '../../lib/auth';
import Button from '../../components/Button';

export default function RegisterForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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
          placeholder="Your full name"
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
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-fase-silver rounded-md shadow-sm focus:outline-none focus:ring-fase-navy focus:border-fase-navy"
        />
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