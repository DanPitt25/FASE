'use client';

import { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import Image from 'next/image';
import Button from '../../../components/Button';

interface CompanyDetailsTabProps {
  companyId: string;
  memberData?: any;
  onDataChange?: () => void;
}

interface CompanyDetails {
  website?: string;
  logoURL?: string;
  logoStatus?: {
    status: 'pending_review' | 'approved' | 'rejected';
    pendingURL?: string;
    rejectionReason?: string;
  };
  companySummary?: {
    text?: string;
    status?: 'draft' | 'pending_review' | 'approved' | 'rejected';
    translations?: Record<string, string>;
  };
}

export default function CompanyDetailsTab({ companyId, memberData, onDataChange }: CompanyDetailsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({});
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [website, setWebsite] = useState('');
  const [bioText, setBioText] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load company details
  useEffect(() => {
    const loadCompanyDetails = async () => {
      if (!companyId) return;

      try {
        setLoading(true);

        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          console.error('Not authenticated');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/admin/company-details?companyId=${encodeURIComponent(companyId)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (data.success) {
          setCompanyDetails({
            website: data.companyDetails.website || '',
            logoURL: data.companyDetails.logoURL,
            logoStatus: data.companyDetails.logoStatus,
            companySummary: data.companyDetails.companySummary
          });
          setWebsite(data.companyDetails.website || '');
          setBioText(data.companyDetails.companySummary?.text || '');
        }
      } catch (error) {
        console.error('Error loading company details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanyDetails();
  }, [companyId]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be less than 2MB');
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!logoFile || !companyId) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', logoFile);
      formData.append('accountId', companyId);
      formData.append('isAdminUpload', 'true'); // Flag for admin uploads to skip review

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Admin uploads are auto-approved
        setCompanyDetails(prev => ({
          ...prev,
          logoURL: data.logoURL,
          logoStatus: { status: 'approved' }
        }));
        setLogoFile(null);
        setLogoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onDataChange?.();
      } else {
        alert(data.error || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;

    setSaving(true);
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert('Not authenticated');
        setSaving(false);
        return;
      }

      // Normalize website URL
      let normalizedWebsite = website.trim();
      if (normalizedWebsite && !normalizedWebsite.startsWith('http://') && !normalizedWebsite.startsWith('https://')) {
        normalizedWebsite = 'https://' + normalizedWebsite;
      }

      const response = await fetch('/api/admin/company-details', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          companyId,
          website: normalizedWebsite || null,
          bioText: bioText !== companyDetails.companySummary?.text ? bioText : undefined
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save changes');
      }

      setCompanyDetails(prev => ({
        ...prev,
        website: normalizedWebsite,
        companySummary: {
          ...prev.companySummary,
          text: bioText,
          status: 'approved'
        }
      }));

      setEditMode(false);
      onDataChange?.();
    } catch (error) {
      console.error('Error saving company details:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setWebsite(companyDetails.website || '');
    setBioText(companyDetails.companySummary?.text || '');
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setEditMode(false);
  };

  const getLogoStatusBadge = () => {
    const status = companyDetails.logoStatus?.status;
    if (!status) return null;

    const config = {
      pending_review: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' }
    };

    const cfg = config[status];
    if (!cfg) return null;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  const getBioStatusBadge = () => {
    const status = companyDetails.companySummary?.status;
    if (!status) return null;

    const config = {
      draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
      pending_review: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' }
    };

    const cfg = config[status];
    if (!cfg) return null;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${cfg.color}`}>
        {cfg.label}
      </span>
    );
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
      {/* Header with Edit button */}
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium text-fase-navy">Company Details</h4>
        {!editMode && (
          <Button variant="secondary" size="small" onClick={() => setEditMode(true)}>
            Edit
          </Button>
        )}
      </div>

      {/* Logo Section */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-medium text-gray-700">Logo</h5>
          {getLogoStatusBadge()}
        </div>

        <div className="flex items-start gap-4">
          {/* Current Logo */}
          <div className="flex-shrink-0">
            {companyDetails.logoURL ? (
              <div className="relative w-24 h-24 border border-gray-200 rounded-lg overflow-hidden bg-white">
                <Image
                  src={companyDetails.logoURL}
                  alt="Company logo"
                  fill
                  className="object-contain p-2"
                />
              </div>
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white">
                <span className="text-gray-400 text-xs text-center">No logo</span>
              </div>
            )}
          </div>

          {/* Logo Upload (when editing) */}
          {editMode && (
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                className="hidden"
                id="logo-upload"
              />

              {logoPreview ? (
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 border border-gray-200 rounded overflow-hidden">
                    <Image
                      src={logoPreview}
                      alt="New logo preview"
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="primary"
                      size="small"
                      onClick={handleUploadLogo}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Select New Logo
                </label>
              )}
              <p className="text-xs text-gray-500 mt-2">Max 2MB. PNG, JPG, or SVG.</p>
            </div>
          )}
        </div>
      </div>

      {/* Website Section */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Website</h5>
        {editMode ? (
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="www.example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          />
        ) : (
          <div className="text-sm">
            {companyDetails.website ? (
              <a
                href={companyDetails.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fase-navy hover:underline"
              >
                {companyDetails.website}
              </a>
            ) : (
              <span className="text-gray-400 italic">Not set</span>
            )}
          </div>
        )}
      </div>

      {/* Bio Section */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-sm font-medium text-gray-700">Company Bio</h5>
          {getBioStatusBadge()}
        </div>

        {editMode ? (
          <textarea
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            rows={6}
            placeholder="Enter company bio/description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent resize-none"
          />
        ) : (
          <div className="text-sm text-gray-700">
            {companyDetails.companySummary?.text ? (
              <p className="whitespace-pre-wrap">{companyDetails.companySummary.text}</p>
            ) : (
              <span className="text-gray-400 italic">No bio set</span>
            )}
          </div>
        )}
      </div>

      {/* Organization Info (Read-only) */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-3">Organization Info</h5>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Type:</span>
            <span className="ml-2 font-medium text-gray-900">{memberData?.organizationType || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Country:</span>
            <span className="ml-2 font-medium text-gray-900">
              {memberData?.registeredAddress?.country || memberData?.businessAddress?.country || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Save/Cancel buttons (when editing) */}
      {editMode && (
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}
