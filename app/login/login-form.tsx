'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '../../lib/auth';
import Button from '../../components/Button';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
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