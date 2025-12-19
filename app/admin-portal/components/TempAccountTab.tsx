'use client';

import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Button from '../../../components/Button';
import CountrySelector from '../../../components/CountrySelector';

export default function TempAccountTab() {
  const [formData, setFormData] = useState({
    organizationName: '',
    personalName: '',
    organizationType: 'MGA' as 'MGA' | 'carrier' | 'provider',
    carrierType: '' as '' | 'insurance_company' | 'reinsurance_company' | 'lloyds_managing_agency' | 'insurance_broker' | 'reinsurance_broker',
    country: '',
    website: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.organizationName || !formData.organizationType || !formData.country) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.organizationType === 'carrier' && !formData.carrierType) {
      alert('Please select a carrier type');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Generate a unique ID for the temporary account
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const tempAccountRef = doc(db, 'accounts', tempId);
      
      // Create minimal account document with temp flag
      const tempAccountData = {
        id: tempId,
        organizationName: formData.organizationName,
        personalName: formData.personalName || formData.organizationName,
        organizationType: formData.organizationType,
        status: 'approved', // Make visible in directory
        registeredAddress: {
          country: formData.country
        },
        website: formData.website || undefined,
        ...(formData.organizationType === 'carrier' && formData.carrierType && {
          carrierInfo: {
            organizationType: formData.carrierType
          }
        }),
        isTemporaryAccount: true, // Flag to identify temp accounts
        tempAccountNote: 'Temporary directory entry - not a full member account',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(tempAccountRef, tempAccountData);
      
      setSubmitStatus('success');
      // Reset form
      setFormData({
        organizationName: '',
        personalName: '',
        organizationType: 'MGA',
        carrierType: '',
        country: '',
        website: ''
      });

      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (error) {
      console.error('Error creating temporary account:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-4">
        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">
          Create Temporary Directory Entry
        </h3>
        <p className="text-sm text-gray-600">
          Create a minimal account that appears in the member directory without interfering with future full membership applications.
        </p>
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> These entries are flagged as temporary and can be upgraded to full accounts later.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name *
              </label>
              <input
                type="text"
                value={formData.organizationName}
                onChange={(e) => handleInputChange('organizationName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              />
            </div>

            {/* Personal Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.personalName}
                onChange={(e) => handleInputChange('personalName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="Optional - defaults to organization name"
              />
            </div>

            {/* Organization Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Type *
              </label>
              <select
                value={formData.organizationType}
                onChange={(e) => {
                  handleInputChange('organizationType', e.target.value);
                  if (e.target.value !== 'carrier') {
                    handleInputChange('carrierType', '');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              >
                <option value="MGA">MGA</option>
                <option value="carrier">Carrier</option>
                <option value="provider">Provider</option>
              </select>
            </div>

            {/* Carrier Type - only show when carrier is selected */}
            {formData.organizationType === 'carrier' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carrier Type *
                </label>
                <select
                  value={formData.carrierType}
                  onChange={(e) => handleInputChange('carrierType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  required
                >
                  <option value="">Select Carrier Type</option>
                  <option value="insurance_company">Insurance Company</option>
                  <option value="reinsurance_company">Reinsurance Company</option>
                  <option value="lloyds_managing_agency">Lloyd&apos;s Managing Agency</option>
                  <option value="insurance_broker">Insurance Broker</option>
                  <option value="reinsurance_broker">Reinsurance Broker</option>
                </select>
              </div>
            )}

            {/* Country */}
            <div>
              <CountrySelector
                label="Country *"
                value={formData.country}
                onChange={(value) => handleInputChange('country', value)}
                required
                placeholder="Search countries..."
                countriesFilter="all"
              />
            </div>

            {/* Website */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="example.com (no need for https://)"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant={submitStatus === 'success' ? 'primary' : submitStatus === 'error' ? 'secondary' : 'primary'}
              disabled={isSubmitting || submitStatus === 'success'}
            >
              {isSubmitting ? 'Creating...' : 
               submitStatus === 'success' ? 'Created!' : 
               submitStatus === 'error' ? 'Error - Retry' : 
               'Create Directory Entry'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}