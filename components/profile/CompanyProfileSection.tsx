'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Button from '../Button';
import OrganizationLogo from '../OrganizationLogo';
import type { OrganizationAccount } from '../../lib/unified-member';

interface CompanyInfo {
  id: string;
  organizationName: string;
  organizationType: string;
  status: string;
  logoURL?: string;
  logoStatus?: {
    status: 'pending_review' | 'approved' | 'rejected';
    pendingURL?: string;
    rejectionReason?: string;
  };
}

interface CompanyProfileSectionProps {
  company: CompanyInfo;
  organizationAccount: OrganizationAccount;
  onLogoChange: (logoURL: string | null) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

export default function CompanyProfileSection({ 
  company, 
  organizationAccount, 
  onLogoChange,
  showSuccess,
  showError,
  showInfo
}: CompanyProfileSectionProps) {
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [directoryInclusion, setDirectoryInclusion] = useState(true);
  const [publicContact, setPublicContact] = useState(true);

  useEffect(() => {
    if (organizationAccount.companySummary?.text) {
      setBioText(organizationAccount.companySummary.text);
    }
  }, [organizationAccount.companySummary?.text]);

  const handleSubmitBio = async () => {
    if (!bioText.trim()) return;
    
    try {
      setSavingBio(true);
      
      const accountRef = doc(db, 'accounts', organizationAccount.id);
      await updateDoc(accountRef, {
        'companySummary.text': bioText.trim(),
        'companySummary.status': 'pending_review',
        'companySummary.submittedAt': serverTimestamp(),
        'companySummary.reviewedAt': null,
        'companySummary.reviewedBy': null,
        'companySummary.rejectionReason': null,
        updatedAt: serverTimestamp()
      });
      
      showSuccess('Profile submitted for review. You will be notified once approved.');
    } catch (error) {
      showError('Failed to submit profile. Please try again.');
    } finally {
      setSavingBio(false);
    }
  };

  const handleSaveBioDraft = async () => {
    try {
      setSavingBio(true);
      
      const accountRef = doc(db, 'accounts', organizationAccount.id);
      await updateDoc(accountRef, {
        'companySummary.text': bioText.trim(),
        'companySummary.status': 'draft',
        updatedAt: serverTimestamp()
      });
      
      showInfo('Draft saved successfully.');
    } catch (error) {
      showError('Failed to save draft. Please try again.');
    } finally {
      setSavingBio(false);
    }
  };

  const getBioStatusText = () => {
    const status = organizationAccount?.companySummary?.status;
    
    switch (status) {
      case 'pending_review':
        return <span className="text-sm text-gray-600">Submitted</span>;
      case 'approved':
        return <span className="text-sm text-green-600">Approved</span>;
      case 'rejected':
        return <span className="text-sm text-red-600">Rejected</span>;
      default:
        return <span className="text-sm text-gray-500">Draft</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Company Information */}
      <div className="bg-white border border-fase-light-gold rounded-lg p-6">
        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy mb-4">Company Profile</h2>
        
        <div className="text-sm text-gray-600 mb-4">
          {company.organizationName} • {company.organizationType}
        </div>

        {/* Directory Profile */}
        <div className="flex gap-4 p-4 border border-gray-200 rounded-lg">
          {/* Logo */}
          <div className="flex-shrink-0">
            <OrganizationLogo
              organizationName={company.organizationName}
              logoURL={company.logoURL}
              pendingLogoURL={company.logoStatus?.pendingURL}
              logoStatus={company.logoStatus?.status}
              onLogoChange={onLogoChange}
            />
            {/* Logo rejection message */}
            {company.logoStatus?.status === 'rejected' && company.logoStatus.rejectionReason && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 max-w-[80px]">
                {company.logoStatus.rejectionReason}
              </div>
            )}
          </div>
          
          {/* Bio */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Directory Profile</span>
              {getBioStatusText()}
            </div>
            
            <textarea
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              placeholder="Describe your company for the directory (subject to translation)..."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy resize-none text-sm mb-2"
              disabled={organizationAccount.companySummary?.status === 'pending_review'}
            />
            
            <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
              <span>{bioText.length}/500</span>
            </div>
            
            {/* Error message */}
            {organizationAccount.companySummary?.status === 'rejected' && organizationAccount.companySummary.rejectionReason && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-3">
                <strong>Rejected:</strong> {organizationAccount.companySummary.rejectionReason}
              </div>
            )}
            
            {/* Actions */}
            {organizationAccount.companySummary?.status !== 'pending_review' && (
              <div className="flex space-x-2">
                <Button 
                  onClick={handleSubmitBio} 
                  disabled={savingBio || !bioText.trim()} 
                  variant="primary" 
                  size="small"
                >
                  {savingBio ? 'Submitting...' : 'Submit'}
                </Button>
                <Button 
                  onClick={handleSaveBioDraft} 
                  disabled={savingBio} 
                  variant="secondary" 
                  size="small"
                >
                  Draft
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Directory Settings */}
      <div className="bg-white border border-fase-light-gold rounded-lg p-6">
        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy mb-6">Directory Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Include in Directory</span>
              <p className="text-xs text-gray-500">Show your company in the public membership directory</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={directoryInclusion}
                onChange={(e) => setDirectoryInclusion(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Public Contact Information</span>
              <p className="text-xs text-gray-500">Allow directory visitors to see your contact details</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={publicContact}
                onChange={(e) => setPublicContact(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}