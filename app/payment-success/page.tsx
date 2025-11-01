'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '../../components/Button';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const provider = searchParams.get('provider');
  const orderId = searchParams.get('token'); // PayPal uses 'token' parameter for order ID
  
  useEffect(() => {
    if (provider === 'paypal' && orderId) {
      // For PayPal, the webhook should handle the payment processing
      // We just need to show success message
      setLoading(false);
    } else {
      setError('Invalid payment session');
      setLoading(false);
    }
  }, [provider, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Processing your payment...</p>
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
          <h1 className="text-2xl font-noto-serif font-bold text-gray-900 mb-4">Payment Error</h1>
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
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for your payment. Your FASE membership is being processed and you will receive a confirmation email shortly.
        </p>
        
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
          If you don&apos;t receive a confirmation email within 24 hours, please contact support.
        </p>
      </div>
    </div>
  );
}