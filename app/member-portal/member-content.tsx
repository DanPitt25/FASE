'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Button from '../../components/Button';

export default function MemberContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
        <div className="animate-pulse">
          <div className="h-8 bg-fase-pearl rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-fase-pearl rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl font-futura font-bold text-fase-navy mb-6">
        Welcome{user.displayName ? `, ${user.displayName}` : ''} to Your Member Portal
      </h2>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h3 className="text-xl font-futura font-semibold text-fase-navy mb-4">Your Account</h3>
          <div className="space-y-2 text-left">
            <p className="text-fase-steel">
              <strong>Display Name:</strong> {user.displayName || 'Not set'}
            </p>
            <p className="text-fase-steel">
              <strong>Email:</strong> {user.email}
            </p>
            <p className="text-fase-steel">
              <strong>Member ID:</strong> {user.uid.substring(0, 8)}...
            </p>
          </div>
        </div>

        <div className="border-t border-fase-silver pt-6">
          <h4 className="text-lg font-futura font-semibold text-fase-navy mb-4">Member Resources</h4>
          <p className="text-fase-steel mb-6">
            More member resources and features will be available as FASE continues to grow and develop.
          </p>
          
          <div className="space-y-4">
            <Button href="/about" variant="secondary" size="medium" className="w-full">
              Learn More About FASE
            </Button>
            <Button href="/events" variant="secondary" size="medium" className="w-full">
              View Upcoming Events
            </Button>
            <Button href="/knowledge" variant="secondary" size="medium" className="w-full">
              Access Knowledge Base
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}