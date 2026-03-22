'use client';

/**
 * CompanyContentTab - Bio & Logo management for a single company
 * Used within CompanyMembersModal
 *
 * Unified flow: Edit bio + translations, then save (approves if pending)
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Button from '../../../components/Button';
import { authFetch, authPost } from '../../../lib/auth-fetch';
import { UnifiedMember } from '../../../lib/unified-member';

interface CompanyContentTabProps {
  companyId: string;
  memberData?: UnifiedMember;
  onDataChange?: () => void;
}

const LANGUAGES = [
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
];

export default function CompanyContentTab({
  companyId,
  memberData,
  onDataChange
}: CompanyContentTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Content state - always editable
  const [bioText, setBioText] = useState('');
  const [translations, setTranslations] = useState<Record<string, string>>({
    fr: '', de: '', es: '', it: '', nl: ''
  });
  const [currentLogoURL, setCurrentLogoURL] = useState<string | null>(null);
  const [pendingLogoURL, setPendingLogoURL] = useState<string | null>(null);
  const [hasPendingBio, setHasPendingBio] = useState(false);
  const [pendingBioText, setPendingBioText] = useState<string | null>(null);

  // New logo upload
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);

  // Track if content has been modified
  const [hasChanges, setHasChanges] = useState(false);

  // Original values for comparison
  const [originalBio, setOriginalBio] = useState('');
  const [originalTranslations, setOriginalTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    loadContent();
  }, [companyId]);

  const loadContent = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      // Get current content from member data
      const summary = memberData?.companySummary;
      const currentBio = summary?.text || '';
      const currentTranslations = {
        fr: summary?.translations?.fr || '',
        de: summary?.translations?.de || '',
        es: summary?.translations?.es || '',
        it: summary?.translations?.it || '',
        nl: summary?.translations?.nl || '',
      };

      setCurrentLogoURL(memberData?.logoURL || null);

      // Check for pending content
      const response = await authFetch(`/api/admin/bio-review?type=single&companyId=${companyId}`);
      const data = await response.json();

      if (data.success && data.content) {
        const hasPending = data.content.hasPendingBio || false;
        const pendingText = data.content.pendingBioText || null;

        setHasPendingBio(hasPending);
        setPendingBioText(pendingText);
        setPendingLogoURL(data.content.pendingLogoURL || null);

        // If there's a pending bio, use it as the starting point for editing
        // This way admin can edit/translate the pending submission before approving
        if (hasPending && pendingText) {
          setBioText(pendingText);
          setOriginalBio(pendingText);
        } else {
          setBioText(currentBio);
          setOriginalBio(currentBio);
        }
      } else {
        setBioText(currentBio);
        setOriginalBio(currentBio);
      }

      setTranslations(currentTranslations);
      setOriginalTranslations(currentTranslations);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to load content:', err);
    } finally {
      setLoading(false);
    }
  };

  // Track changes
  useEffect(() => {
    const bioChanged = bioText !== originalBio;
    const translationsChanged = LANGUAGES.some(
      lang => (translations[lang.code] || '') !== (originalTranslations[lang.code] || '')
    );
    const logoChanged = newLogoFile !== null;
    setHasChanges(bioChanged || translationsChanged || logoChanged);
  }, [bioText, translations, newLogoFile, originalBio, originalTranslations]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogoSelection = () => {
    setNewLogoFile(null);
    setNewLogoPreview(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoURL: string | undefined;

      // Upload logo if provided
      if (newLogoFile) {
        setUploadingLogo(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', newLogoFile);
        uploadFormData.append('identifier', companyId);
        uploadFormData.append('organizationName', memberData?.organizationName || '');

        const uploadResponse = await authFetch('/api/upload-logo', {
          method: 'POST',
          body: uploadFormData,
        });

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          logoURL = result.downloadURL;
        }
        setUploadingLogo(false);
      }

      // Save content - this will also approve any pending bio
      const response = await authPost('/api/admin/bio-review', {
        action: 'save_edit',
        companyId,
        bioText: bioText.trim(),
        translations,
        logoURL,
        // If there was a pending bio, this save acts as approval with edits
        approvePending: hasPendingBio
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save');
      }

      // Update local state
      if (logoURL) {
        setCurrentLogoURL(logoURL);
      }
      setNewLogoFile(null);
      setNewLogoPreview(null);
      setHasPendingBio(false);
      setPendingBioText(null);
      setOriginalBio(bioText.trim());
      setOriginalTranslations({ ...translations });
      setHasChanges(false);
      onDataChange?.();

    } catch (err) {
      console.error('Failed to save content:', err);
      alert('Failed to save content');
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };

  const handleRejectPendingBio = async () => {
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;

    setSaving(true);
    try {
      const response = await authPost('/api/admin/bio-review', {
        action: 'review_bio',
        companyId,
        reviewAction: 'reject',
        reason
      });

      const data = await response.json();
      if (data.success) {
        // Revert to the approved bio (not the pending one)
        const summary = memberData?.companySummary;
        const approvedBio = summary?.text || '';
        setBioText(approvedBio);
        setOriginalBio(approvedBio);
        setHasPendingBio(false);
        setPendingBioText(null);
        setHasChanges(false);
        onDataChange?.();
      }
    } catch (err) {
      console.error('Failed to reject bio:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleApprovePendingLogo = async () => {
    setSaving(true);
    try {
      const response = await authPost('/api/admin/bio-review', {
        action: 'review_logo',
        companyId,
        reviewAction: 'approve',
        pendingLogoURL
      });

      const data = await response.json();
      if (data.success) {
        setCurrentLogoURL(pendingLogoURL);
        setPendingLogoURL(null);
        onDataChange?.();
      }
    } catch (err) {
      console.error('Failed to approve logo:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectPendingLogo = async () => {
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;

    setSaving(true);
    try {
      const response = await authPost('/api/admin/bio-review', {
        action: 'review_logo',
        companyId,
        reviewAction: 'reject',
        reason,
        pendingLogoURL
      });

      const data = await response.json();
      if (data.success) {
        setPendingLogoURL(null);
        onDataChange?.();
      }
    } catch (err) {
      console.error('Failed to reject logo:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setBioText(originalBio);
    setTranslations({ ...originalTranslations });
    setNewLogoFile(null);
    setNewLogoPreview(null);
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Logo Alert - separate from bio since it's just approve/reject */}
      {pendingLogoURL && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-3">Pending Logo</h4>
          <div className="flex items-start gap-4">
            <div className="relative w-16 h-16 bg-white rounded border flex-shrink-0">
              <Image
                src={pendingLogoURL}
                alt="Pending logo"
                fill
                className="object-contain p-1"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-yellow-800 mb-2">New logo submitted</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleRejectPendingLogo}
                  disabled={saving}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleApprovePendingLogo}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Editor */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Header with status and actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-medium text-gray-900">Bio & Translations</h4>
            {hasPendingBio && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                Pending Review
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button
                variant="secondary"
                size="small"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
            {hasPendingBio && !hasChanges && (
              <Button
                variant="secondary"
                size="small"
                onClick={handleRejectPendingBio}
                disabled={saving}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Reject
              </Button>
            )}
            <Button
              variant="primary"
              size="small"
              onClick={handleSave}
              disabled={saving || uploadingLogo || (!hasChanges && !hasPendingBio)}
            >
              {uploadingLogo ? 'Uploading...' : saving ? 'Saving...' : hasPendingBio ? 'Approve & Save' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Pending bio notice */}
        {hasPendingBio && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              A new bio was submitted for review. Edit the text and translations below, then click &quot;Approve &amp; Save&quot; to publish.
            </p>
          </div>
        )}

        {/* Logo Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
          <div className="flex items-start gap-4">
            <div className="relative w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center overflow-hidden">
              {newLogoPreview ? (
                <Image src={newLogoPreview} alt="New logo" fill className="object-contain p-2" />
              ) : currentLogoURL ? (
                <Image src={currentLogoURL} alt="Current logo" fill className="object-contain p-2" />
              ) : (
                <span className="text-xs text-gray-400">No logo</span>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleLogoFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-fase-navy file:text-white hover:file:bg-fase-navy/90 file:cursor-pointer"
              />
              <p className="mt-1 text-xs text-gray-500">PNG, JPG, SVG, or WebP. Max 5MB.</p>
              {newLogoPreview && (
                <button
                  type="button"
                  onClick={clearLogoSelection}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  Remove new logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* English Bio */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            English Bio
          </label>
          <textarea
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            placeholder="Enter company bio..."
          />
          <div className="mt-1 text-xs text-gray-500 text-right">
            {bioText.length} characters
          </div>
        </div>

        {/* Translations */}
        <div className="space-y-4">
          <h5 className="text-sm font-medium text-gray-700">Translations</h5>
          {LANGUAGES.map((lang) => (
            <div key={lang.code}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-600">
                  {lang.name}
                </label>
                {translations[lang.code]?.trim() ? (
                  <span className="text-xs text-green-600">Done</span>
                ) : (
                  <span className="text-xs text-gray-400">Missing</span>
                )}
              </div>
              <textarea
                value={translations[lang.code] || ''}
                onChange={(e) => setTranslations(prev => ({ ...prev, [lang.code]: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder={`${lang.name} translation...`}
              />
            </div>
          ))}
        </div>

        {/* Translation status summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Translation status:</span>
            <span className="font-medium">
              {LANGUAGES.filter(lang => translations[lang.code]?.trim()).length} / {LANGUAGES.length} complete
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
