'use client';

import { useState, useEffect } from 'react';
// Import the translations directly
import translations from '../../messages/en.json';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '../../components/PageLayout';
import SearchableCountrySelect from '../../components/SearchableCountrySelectSubsite';

interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  isFaseMember: boolean;
}

export default function RegisterPage() {
  // Use translations directly
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations.register;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };
  const searchParams = useSearchParams();
  const [billingInfo, setBillingInfo] = useState({
    company: '',
    billingEmail: '',
    country: '',
    address: '',
    organizationType: ''
  });

  const [attendees, setAttendees] = useState<Attendee[]>([
    {
      id: '1',
      firstName: '',
      lastName: '',
      email: '',
      title: '',
      isFaseMember: false
    }
  ]);

  const [additionalInfo, setAdditionalInfo] = useState({
    specialRequests: ''
  });

  const [companyIsFaseMember, setCompanyIsFaseMember] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);

  // Check for test mode from URL parameter
  useEffect(() => {
    const testMode = searchParams.get('test') === 'true';
    setIsTestMode(testMode);
  }, [searchParams]);

  // Update all attendees when company FASE membership changes
  const handleCompanyFaseMemberChange = (isMember: boolean) => {
    setCompanyIsFaseMember(isMember);
    setAttendees(attendees.map(attendee => ({
      ...attendee,
      isFaseMember: isMember
    })));
  };

  const pricingData = {
    'MGA': { nonMember: 800, faseMember: 400 },
    'Insurer': { nonMember: 1100, faseMember: 550 },
    'Reinsurer': { nonMember: 1100, faseMember: 550 },
    'Lloyds': { nonMember: 1100, faseMember: 550 },
    'Broker': { nonMember: 1100, faseMember: 550 },
    'Service Provider': { nonMember: 1400, faseMember: 700 },
    'Other': { nonMember: 1100, faseMember: 550 }
  };

  const getAttendeePrice = () => {
    if (!billingInfo.organizationType) return 0;
    const pricing = pricingData[billingInfo.organizationType as keyof typeof pricingData];
    return companyIsFaseMember ? pricing.faseMember : pricing.nonMember;
  };

  const getTotalPrice = () => {
    if (isTestMode) return 1; // 1 EUR for testing
    return attendees.length * getAttendeePrice();
  };

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addAttendee = () => {
    const newAttendee: Attendee = {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      email: '',
      title: '',
      isFaseMember: companyIsFaseMember
    };
    setAttendees([...attendees, newAttendee]);
  };

  const removeAttendee = (id: string) => {
    if (attendees.length > 1) {
      setAttendees(attendees.filter(attendee => attendee.id !== id));
    }
  };

  const updateAttendee = (id: string, field: keyof Attendee, value: string | boolean) => {
    setAttendees(attendees.map(attendee => 
      attendee.id === id ? { ...attendee, [field]: value } : attendee
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🟢 Form submitted');
    setSubmitting(true);
    setError('');

    try {
      const registrationData = {
        billingInfo,
        attendees: attendees.map(attendee => ({
          ...attendee,
          organizationType: billingInfo.organizationType
        })),
        additionalInfo,
        currency: 'EUR',
        numberOfAttendees: attendees.length,
        companyIsFaseMember,
        registrationType: 'interest',
        submittedAt: new Date().toISOString()
      };
      
      console.log('🔍 Sending registration data:', registrationData);
      
      // Submit interest registration to Firestore
      const response = await fetch('/api/submit-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      console.log('🔍 Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ Error response:', errorData);
        throw new Error(errorData.error || 'Failed to submit registration');
      }

      const result = await response.json();
      console.log('✅ Interest registration submitted:', result);
      
      // Show success message
      setSubmitted(true);
      
      /* STRIPE INTEGRATION - COMMENTED OUT FOR FUTURE USE
      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment session');
      }

      const result = await response.json();
      
      // Redirect to Stripe checkout
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No payment URL received');
      }
      */
    } catch (error) {
      console.error('❌ Registration submission error:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit registration');
    } finally {
      console.log('🔄 Setting submitting to false');
      setSubmitting(false);
    }
  };

  const isFormValid = () => {
    const billingValid = billingInfo.company && billingInfo.billingEmail && billingInfo.country && billingInfo.organizationType;
    const attendeesValid = attendees.every(attendee => 
      attendee.firstName && attendee.lastName && attendee.email && attendee.title
    );
    return billingValid && attendeesValid;
  };

  if (submitted) {
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
                {t('thank_you.title')}
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                {t('thank_you.message')}
              </p>
              <Link 
                href="/" 
                className="inline-flex items-center px-6 py-3 bg-fase-navy text-white font-semibold rounded hover:bg-fase-orange transition-colors"
              >
                {t('thank_you.back')}
              </Link>
            </div>
          </div>
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="py-16 bg-fase-navy text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-noto-serif font-medium leading-tight mb-6 animate-fade-in-up">
            {t('title')}
          </h1>
        </div>
      </section>

      {/* Registration Form */}
      <section className="py-24 bg-white scroll-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Company Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-noto-serif font-medium text-fase-navy mb-6 border-b border-fase-light-gold pb-2">
                {t('form.company.title')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.company.name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={billingInfo.company}
                    onChange={(e) => setBillingInfo({...billingInfo, company: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.company.email')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={billingInfo.billingEmail}
                    onChange={(e) => setBillingInfo({...billingInfo, billingEmail: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <SearchableCountrySelect
                  label={t('form.company.country')}
                  value={billingInfo.country}
                  onChange={(value) => setBillingInfo({...billingInfo, country: value})}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.company.org_type')} *
                  </label>
                  <select
                    required
                    value={billingInfo.organizationType}
                    onChange={(e) => setBillingInfo({...billingInfo, organizationType: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  >
                    <option value="">{t('org_types.select')}</option>
                    <option value="MGA">{t('org_types.mga')}</option>
                    <option value="Insurer">{t('org_types.insurer')}</option>
                    <option value="Reinsurer">{t('org_types.reinsurer')}</option>
                    <option value="Lloyds">{t('org_types.lloyds')}</option>
                    <option value="Broker">{t('org_types.broker')}</option>
                    <option value="Service Provider">{t('org_types.service_provider')}</option>
                    <option value="Other">{t('org_types.other')}</option>
                  </select>
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.company.address')}
                </label>
                <textarea
                  rows={3}
                  value={billingInfo.address}
                  onChange={(e) => setBillingInfo({...billingInfo, address: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
              
              <div className="mt-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={companyIsFaseMember}
                    onChange={(e) => handleCompanyFaseMemberChange(e.target.checked)}
                    className="w-4 h-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                  />
                  <span className="text-lg font-medium text-gray-700">
                    {t('form.company.fase_member')}
                  </span>
                </label>
              </div>
            </div>

            {/* Attendees */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-noto-serif font-medium text-fase-navy border-b border-fase-light-gold pb-2">
                  {t('form.attendees.title')} ({attendees.length})
                </h2>
                <button
                  type="button"
                  onClick={addAttendee}
                  className="px-4 py-2 bg-fase-orange text-white font-medium rounded hover:bg-fase-gold transition-colors"
                >
                  {t('form.attendees.add_attendee')}
                </button>
              </div>

              {attendees.map((attendee, index) => (
                <div key={attendee.id} className="bg-fase-cream rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-fase-navy">
                      {t('form.attendees.attendee_number')} {index + 1}
                    </h3>
                    {attendees.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAttendee(attendee.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        {t('form.attendees.remove')}
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('form.first_name')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={attendee.firstName}
                        onChange={(e) => updateAttendee(attendee.id, 'firstName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('form.last_name')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={attendee.lastName}
                        onChange={(e) => updateAttendee(attendee.id, 'lastName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('form.email')} *
                      </label>
                      <input
                        type="email"
                        required
                        value={attendee.email}
                        onChange={(e) => updateAttendee(attendee.id, 'email', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('form.job_title')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={attendee.title}
                        onChange={(e) => updateAttendee(attendee.id, 'title', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-noto-serif font-medium text-fase-navy mb-6 border-b border-fase-light-gold pb-2">
                {t('form.additional_info.title')}
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('form.additional_info.special_requests')}
                </label>
                <textarea
                  rows={4}
                  value={additionalInfo.specialRequests}
                  onChange={(e) => setAdditionalInfo({...additionalInfo, specialRequests: e.target.value})}
                  placeholder={t('form.additional_info.special_requests_placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
            </div>


            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="bg-fase-cream p-6 rounded-lg">
              <p className="text-sm text-gray-600">
                {t('form.privacy')}{' '}
                <a href="https://fasemga.com/privacy-policy" className="text-fase-navy hover:text-fase-orange" target="_blank" rel="noopener noreferrer">
                  {t('form.privacy_link')}
                </a>{' '}
                and{' '}
                <a href="https://fasemga.com/about/code-of-conduct" className="text-fase-navy hover:text-fase-orange" target="_blank" rel="noopener noreferrer">
                  {t('form.terms_link')}
                </a>.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !isFormValid()}
              className="w-full bg-fase-navy text-white py-4 px-8 rounded-lg font-semibold hover:bg-fase-orange transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {submitting ? t('form.processing') : t('form.submit')}
            </button>
          </form>
        </div>
      </section>
    </PageLayout>
  );
}