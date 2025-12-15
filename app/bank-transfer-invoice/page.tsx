'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '../../components/PageLayout';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { createInvoiceRecord } from '../../lib/firestore';

function BankTransferInvoiceContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('bank_transfer_invoice');
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [cc, setCc] = useState('');
  const [accountData, setAccountData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const amount = searchParams?.get('amount');
  const originalAmount = searchParams?.get('originalAmount');
  const currency = searchParams?.get('currency') || 'EUR';
  const orgName = searchParams?.get('orgName');
  const fullName = searchParams?.get('fullName');
  const address = searchParams?.get('address'); // Legacy parameter
  const addressLine1 = searchParams?.get('addressLine1');
  const addressLine2 = searchParams?.get('addressLine2');
  const city = searchParams?.get('city');
  const county = searchParams?.get('county');
  const postcode = searchParams?.get('postcode');
  const country = searchParams?.get('country');
  const gender = searchParams?.get('gender');
  const recipientEmail = searchParams?.get('email');
  const hasOtherAssociations = searchParams?.get('hasOtherAssociations') === 'true';
  
  // Parse custom line item if provided
  const customLineItemParam = searchParams?.get('customLineItem');
  let customLineItem = null;
  try {
    if (customLineItemParam) {
      customLineItem = JSON.parse(decodeURIComponent(customLineItemParam));
    }
  } catch (error) {
    console.error('Error parsing custom line item:', error);
  }


  useEffect(() => {
    const fetchAccountData = async () => {
      if (recipientEmail) {
        try {
          const accountsRef = collection(db, 'accounts');
          const q = query(accountsRef, where('email', '==', recipientEmail));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            setAccountData(data);
          }
        } catch (error) {
          console.error('Error fetching account data:', error);
        }
      }
      setLoading(false);
    };

    fetchAccountData();
  }, [recipientEmail]);

  const generateInvoice = async () => {
    if (!amount || !orgName) {
      setError('Missing required information. Please contact admin@fasemga.com for assistance.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter an email address.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Invalid email format.');
      return;
    }

    // Validate CC if provided
    if (cc.trim() && !emailRegex.test(cc.trim())) {
      setError('Invalid CC email format.');
      return;
    }

    setIsGenerating(true);
    setError('');

    const addressData = {
      line1: accountData?.businessAddress?.line1 || addressLine1 || address || 'Not provided',
      line2: accountData?.businessAddress?.line2 || addressLine2 || '',
      city: accountData?.businessAddress?.city || city || 'Not provided',
      postcode: accountData?.businessAddress?.postcode || postcode || 'Not provided',
      country: accountData?.businessAddress?.country || country || 'Netherlands'
    };

    // Generate invoice number to use consistently
    const invoiceNumber = `FASE-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const response = await fetch('/api/send-invoice-only', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          cc: cc.trim() || undefined,
          organizationName: orgName,
          invoiceNumber,
          greeting: fullName || accountData?.accountAdministrator?.name || 'Client',
          totalAmount: parseFloat(amount),
          originalAmount: originalAmount ? parseFloat(originalAmount) : undefined,
          userLocale: searchParams?.get('locale') || 'en',
          gender: gender || 'm',
          address: addressData,
          country: addressData.country,
          forceCurrency: currency,
          hasOtherAssociations: hasOtherAssociations,
          customLineItem: customLineItem
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      const result = await response.json();
      
      // Track invoice in database (client-side)
      try {
        const invoiceData: any = {
          invoiceNumber,
          recipientEmail: email.trim(),
          recipientName: fullName || accountData?.accountAdministrator?.name || 'Client',
          organizationName: orgName,
          amount: parseFloat(amount),
          currency: currency,
          type: 'regular',
          status: 'sent',
          sentAt: new Date(),
          pdfGenerated: true
        };
        
        // Only add emailId if it exists
        if (result?.result?.id) {
          invoiceData.emailId = result.result.id;
        }
        
        await createInvoiceRecord(invoiceData);
        console.log('✅ Invoice tracked in database:', invoiceNumber);
      } catch (trackingError) {
        console.error('❌ Failed to track invoice:', trackingError);
        // Don't fail the UI if tracking fails
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate invoice. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (success) {
    return (
      <PageLayout>
        <section className="py-24 bg-white min-h-[60vh] flex items-center">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-noto-serif font-medium text-gray-900 mb-4">
                {t('success_title')}
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                {t('success_message')}
              </p>
              <p className="text-gray-600 mb-8">
                {t('next_steps')}
              </p>
              <Link 
                href="/" 
                className="inline-flex items-center px-6 py-3 bg-fase-navy text-white font-semibold rounded hover:bg-fase-orange transition-colors"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        </section>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading account data...</p>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Main Content Section */}
      <section className="bg-white py-24 lg:py-32 2xl:py-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="max-w-4xl mx-auto">
            {/* Page Title */}
            <div className="text-center mb-16">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-noto-serif font-medium text-fase-navy mb-8">
                {t('title')}
              </h1>
            </div>

            {/* Invoice Details Card */}
            <div className="bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden mb-12">
              <div className="bg-fase-navy text-white px-6 py-4">
                <h2 className="text-xl font-noto-serif font-semibold">
                  {t('details_title')}
                </h2>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="mb-4 text-fase-black"><strong>{t('organization')}:</strong> {orgName}</p>
                    {(fullName || accountData?.accountAdministrator?.name) && 
                      <p className="mb-4 text-fase-black">
                        <strong>{t('contact')}:</strong> {fullName || accountData?.accountAdministrator?.name}
                      </p>
                    }
                    {(accountData?.businessAddress || address) && 
                      <p className="mb-4 text-fase-black">
                        <strong>Address:</strong> {
                          accountData?.businessAddress ? 
                            `${accountData.businessAddress.line1}, ${accountData.businessAddress.city}, ${accountData.businessAddress.postcode}, ${accountData.businessAddress.country}` :
                          address
                        }
                      </p>
                    }
                    <p className="mb-4 text-fase-black"><strong>{t('amount')}:</strong> <span className="text-fase-navy font-bold text-xl">{currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€'}{amount}</span></p>
                  </div>
                  <div>
                    <p className="mb-4 text-fase-black"><strong>{t('invoice_type')}:</strong> FASE Annual Membership</p>
                    <p className="mb-4 text-fase-black"><strong>{t('payment_method')}:</strong> Bank Transfer</p>
                    <p className="mb-4 text-fase-black"><strong>{t('currency')}:</strong> {currency}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Form */}
            <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-8 mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-fase-black mb-2">
                    To <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="cc" className="block text-sm font-medium text-fase-black mb-2">
                    CC
                  </label>
                  <input
                    type="email"
                    id="cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={generateInvoice}
                  disabled={isGenerating || !email.trim()}
                  className="inline-flex items-center px-8 py-4 bg-fase-navy text-white font-semibold hover:bg-fase-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? t('generating') : t('generate_button')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

export default function BankTransferInvoicePage() {
  return (
    <Suspense fallback={
      <PageLayout>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    }>
      <BankTransferInvoiceContent />
    </Suspense>
  );
}