'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '../../components/Button';

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const provider = searchParams.get('provider');
  const subscriptionId = searchParams.get('subscription_id');
  
  useEffect(() => {
    if (provider === 'paypal' && subscriptionId) {
      // For PayPal subscriptions, the webhook should handle the processing
      setLoading(false);
    } else {
      setError('Invalid subscription session');
      setLoading(false);
    }
  }, [provider, subscriptionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-noto-serif font-bold text-gray-900 mb-4">Subscription Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button 
            variant="primary" 
            onClick={() => window.location.href = '/register'}
          >
            Return to Registration
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-noto-serif font-bold text-gray-900 mb-4">
          Subscription Activated!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Your FASE membership subscription is now active! You&apos;ll be billed annually and your membership will automatically renew each year.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>What happens next:</strong><br/>
            • Your membership application is being processed<br/>
            • You&apos;ll receive a confirmation email shortly<br/>
            • Annual renewals will be automatic<br/>
            • You can manage your subscription in PayPal
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            variant="primary" 
            onClick={() => window.location.href = '/member-portal'}
            className="w-full"
          >
            Go to Member Portal
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Return to Home
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-6">
          Subscription ID: {subscriptionId}<br/>
          You can cancel anytime through your PayPal account.
        </p>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Loading...</p>
        </div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}