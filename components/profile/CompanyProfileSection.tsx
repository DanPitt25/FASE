'use client';

import { useState, useEffect } from 'react';
import { auth } from '../../lib/firebase';
import Button from '../Button';
import OrganizationLogo from '../OrganizationLogo';
import { usePortalTranslations } from '../../app/member-portal/hooks/usePortalTranslations';
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
  onBioStatusChange?: (status: 'pending_review' | 'draft') => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

export default function CompanyProfileSection({
  company,
  organizationAccount,
  onLogoChange,
  onBioStatusChange,
  showSuccess,
  showError,
  showInfo
}: CompanyProfileSectionProps) {
  const { t } = usePortalTranslations();
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [directoryInclusion, setDirectoryInclusion] = useState(true);
  const [publicContact, setPublicContact] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(false);

  // Determine if bio should start in editing mode (only if not approved and not pending)
  const bioStatus = organizationAccount.companySummary?.status;
  const isApprovedOrPending = bioStatus === 'approved' || bioStatus === 'pending_review';

  useEffect(() => {
    if (organizationAccount.companySummary?.text) {
      setBioText(organizationAccount.companySummary.text);
    }
    // Load website from organizationAccount
    if ((organizationAccount as any).website) {
      setWebsiteUrl((organizationAccount as any).website);
    }
    // Start in editing mode if no bio or rejected
    if (!isApprovedOrPending) {
      setEditingBio(true);
    }
  }, [organizationAccount.companySummary?.text, (organizationAccount as any).website, isApprovedOrPending]);

  const handleSubmitBio = async () => {
    if (!bioText.trim()) return;

    try {
      setSavingBio(true);

      const user = auth.currentUser;
      if (!user) {
        showError(t('manage_profile.login_required'));
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/submit-bio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: organizationAccount.id,
          bioText: bioText.trim(),
          action: 'submit'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit bio');
      }

      setEditingBio(false);
      onBioStatusChange?.('pending_review');
      showSuccess(t('manage_profile.bio_submitted_success'));
    } catch (error: any) {
      showError(error.message || t('manage_profile.bio_submit_failed'));
    } finally {
      setSavingBio(false);
    }
  };

  const handleSaveBioDraft = async () => {
    try {
      setSavingBio(true);

      const user = auth.currentUser;
      if (!user) {
        showError(t('manage_profile.login_required_draft'));
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/submit-bio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: organizationAccount.id,
          bioText: bioText.trim(),
          action: 'draft'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save draft');
      }

      onBioStatusChange?.('draft');
      showInfo(t('manage_profile.draft_saved'));
    } catch (error: any) {
      showError(error.message || t('manage_profile.draft_save_failed'));
    } finally {
      setSavingBio(false);
    }
  };

  const getBioStatusText = () => {
    const status = organizationAccount?.companySummary?.status;

    switch (status) {
      case 'pending_review':
        return <span className="text-sm text-gray-600">{t('manage_profile.bio_status_submitted')}</span>;
      case 'approved':
        return <span className="text-sm text-green-600">{t('manage_profile.bio_status_approved')}</span>;
      case 'rejected':
        return <span className="text-sm text-red-600">{t('manage_profile.bio_status_rejected')}</span>;
      default:
        return <span className="text-sm text-gray-500">{t('manage_profile.bio_status_draft')}</span>;
    }
  };

  const handleSaveWebsite = async () => {
    try {
      setSavingWebsite(true);

      const user = auth.currentUser;
      if (!user) {
        showError(t('manage_profile.login_required_website'));
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch('/api/submit-bio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: organizationAccount.id,
          website: websiteUrl.trim(),
          action: 'update_website'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save website');
      }

      setWebsiteUrl(result.website || '');
      setEditingWebsite(false);
      showSuccess(t('manage_profile.website_saved'));
    } catch (error: any) {
      showError(error.message || t('manage_profile.website_save_failed'));
    } finally {
      setSavingWebsite(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Company Information */}
      <div className="bg-white border border-fase-light-gold rounded-lg p-6">
        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy mb-4">{t('manage_profile.company_profile')}</h2>

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
              <span className="text-sm font-medium text-gray-900">{t('manage_profile.company_bio')}</span>
              <div className="flex items-center gap-2">
                {getBioStatusText()}
                {(bioStatus === 'approved' || bioStatus === 'pending_review') && !editingBio && (
                  <Button
                    onClick={() => setEditingBio(true)}
                    variant="secondary"
                    size="small"
                  >
                    {t('manage_profile.edit')}
                  </Button>
                )}
              </div>
            </div>

            {/* Read-only view for approved or pending bios */}
            {!editingBio && (bioStatus === 'approved' || bioStatus === 'pending_review') ? (
              <div className="text-sm text-gray-700 leading-relaxed">
                {bioText || <span className="text-gray-400 italic">{t('manage_profile.bio_no_set')}</span>}
                {bioStatus === 'pending_review' && (
                  <p className="mt-2 text-xs text-gray-500 italic">{t('manage_profile.bio_pending_review')}</p>
                )}
              </div>
            ) : (
              <>
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  placeholder={t('manage_profile.bio_placeholder')}
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy resize-none text-sm mb-2"
                />

                <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                  <span>{bioText.length}/500</span>
                </div>

                {/* Error message */}
                {bioStatus === 'rejected' && organizationAccount.companySummary?.rejectionReason && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-3">
                    <strong>{t('manage_profile.bio_rejected_label')}:</strong> {organizationAccount.companySummary.rejectionReason}
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSubmitBio}
                    disabled={savingBio || !bioText.trim()}
                    variant="primary"
                    size="small"
                  >
                    {savingBio ? t('manage_profile.submitting') : t('manage_profile.submit_for_review')}
                  </Button>
                  <Button
                    onClick={handleSaveBioDraft}
                    disabled={savingBio}
                    variant="secondary"
                    size="small"
                  >
                    {t('manage_profile.save_draft')}
                  </Button>
                  {(bioStatus === 'approved' || bioStatus === 'pending_review') && (
                    <Button
                      onClick={() => {
                        setBioText(organizationAccount.companySummary?.text || '');
                        setEditingBio(false);
                      }}
                      disabled={savingBio}
                      variant="secondary"
                      size="small"
                    >
                      {t('manage_profile.cancel')}
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Website */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{t('manage_profile.company_website')}</span>
              </div>
              {editingWebsite ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder={t('manage_profile.website_placeholder')}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy text-sm"
                  />
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSaveWebsite}
                      disabled={savingWebsite}
                      variant="primary"
                      size="small"
                    >
                      {savingWebsite ? t('manage_profile.saving') : t('manage_profile.save')}
                    </Button>
                    <Button
                      onClick={() => {
                        setWebsiteUrl((organizationAccount as any).website || '');
                        setEditingWebsite(false);
                      }}
                      disabled={savingWebsite}
                      variant="secondary"
                      size="small"
                    >
                      {t('manage_profile.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    {websiteUrl ? (
                      <a
                        href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fase-navy hover:underline"
                      >
                        {websiteUrl}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">{t('manage_profile.website_not_set')}</span>
                    )}
                  </div>
                  <Button
                    onClick={() => setEditingWebsite(true)}
                    variant="secondary"
                    size="small"
                  >
                    {websiteUrl ? t('manage_profile.edit') : t('manage_profile.add')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}