'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout';
import Button from '../../components/Button';

export default function BankTransferInvoicePage() {
  const searchParams = useSearchParams();
  const t = useTranslations('bank_transfer_invoice');
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const userId = searchParams?.get('userId');
  const amount = searchParams?.get('amount');
  const orgName = searchParams?.get('orgName');

  const generateInvoice = async () => {
    if (!userId || !amount || !orgName) {
      setError('Missing required information. Please contact admin@fasemga.com for assistance.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/send-membership-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: '', // This will be filled by the API based on userId
          userId: userId,
          organizationName: orgName,
          totalAmount: parseFloat(amount),
          bankTransferOnly: true, // Flag to indicate PDF-only generation
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate invoice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-noto-serif font-medium text-fase-navy mb-4">
                {t('title')}
              </h1>
              <p className="text-lg text-gray-600">
                {t('subtitle')}
              </p>
            </div>

            {!success ? (
              <div className="space-y-6">
                <div className="bg-fase-cream p-6 rounded-lg">
                  <h2 className="text-xl font-semibold text-fase-navy mb-4">
                    {t('details_title')}
                  </h2>
                  <div className="space-y-2 text-gray-700">
                    <p><strong>{t('organization')}:</strong> {orgName}</p>
                    <p><strong>{t('amount')}:</strong> €{amount}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-600">
                    {t('description')}
                  </p>
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}

                  <div className="text-center">
                    <Button
                      onClick={generateInvoice}
                      disabled={isGenerating}
                      className="bg-fase-navy hover:bg-fase-orange transition-colors"
                    >
                      {isGenerating ? t('generating') : t('generate_button')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-6 rounded-lg">
                  <h2 className="text-xl font-semibold mb-2">{t('success_title')}</h2>
                  <p>{t('success_message')}</p>
                </div>
                
                <div className="text-gray-600">
                  <p>{t('next_steps')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}