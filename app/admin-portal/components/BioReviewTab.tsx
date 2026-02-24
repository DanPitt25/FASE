'use client';

import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useUnifiedAuth } from '../../../contexts/UnifiedAuthContext';
import { OrganizationAccount, CompanySummary } from '../../../lib/unified-member';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import Image from 'next/image';

interface CompanyWithPendingContent extends OrganizationAccount {
  // Bio fields
  bioStatus?: CompanySummary['status'];
  bioText?: string;
  bioSubmittedAt?: any;
  // Logo fields
  pendingLogoURL?: string;
  logoSubmittedAt?: any;
  // Track what type of content is pending
  hasPendingBio: boolean;
  hasPendingLogo: boolean;
}

export default function BioReviewTab() {
  const { user } = useUnifiedAuth();
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<CompanyWithPendingContent[]>([]);
  const [selectedItem, setSelectedItem] = useState<CompanyWithPendingContent | null>(null);
  const [reviewType, setReviewType] = useState<'bio' | 'logo' | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'edit' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingReview, setProcessingReview] = useState(false);
  const [editedBioText, setEditedBioText] = useState('');
  const [translations, setTranslations] = useState({
    fr: '',
    de: '',
    es: '',
    it: '',
    nl: ''
  });

  // Write New Bio state
  const [showWriteNewModal, setShowWriteNewModal] = useState(false);
  const [allAccounts, setAllAccounts] = useState<OrganizationAccount[]>([]);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<OrganizationAccount | null>(null);
  const [newBioText, setNewBioText] = useState('');
  const [newBioTranslations, setNewBioTranslations] = useState({
    fr: '',
    de: '',
    es: '',
    it: '',
    nl: ''
  });
  const [savingNewBio, setSavingNewBio] = useState(false);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Edit Existing state
  const [showEditExistingModal, setShowEditExistingModal] = useState(false);
  const [editSearchQuery, setEditSearchQuery] = useState('');
  const [editSelectedAccount, setEditSelectedAccount] = useState<OrganizationAccount | null>(null);
  const [editBioText, setEditBioText] = useState('');
  const [editBioTranslations, setEditBioTranslations] = useState({
    fr: '',
    de: '',
    es: '',
    it: '',
    nl: ''
  });
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingEditLogo, setUploadingEditLogo] = useState(false);

  // Load pending submissions (both bios and logos)
  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
    try {
      setLoading(true);

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        console.error('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/bio-review?type=pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setPendingItems(data.pendingItems);
      }
    } catch (error) {
      console.error('Error loading pending items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewBio = async (companyId: string, action: 'approve' | 'reject' | 'edit', reason?: string) => {
    if (!user?.uid) return;

    try {
      setProcessingReview(true);

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        console.error('Not authenticated');
        setProcessingReview(false);
        return;
      }

      const response = await fetch('/api/admin/bio-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'review_bio',
          companyId,
          reviewAction: action,
          reason,
          editedBioText: action === 'edit' ? editedBioText : undefined,
          translations: action === 'edit' ? translations : undefined
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to review bio');
      }

      // Update local state - remove bio from pending, keep if logo still pending
      setPendingItems(prev => prev.map(item => {
        if (item.id !== companyId) return item;
        const newStatus: CompanySummary['status'] = action === 'approve' || action === 'edit' ? 'approved' : 'rejected';
        return { ...item, hasPendingBio: false, bioStatus: newStatus };
      }).filter(item => item.hasPendingBio || item.hasPendingLogo));

      // Close modal and reset state
      closeModal();

    } catch (error) {
      console.error('Error reviewing bio:', error);
    } finally {
      setProcessingReview(false);
    }
  };

  const handleReviewLogo = async (companyId: string, action: 'approve' | 'reject', reason?: string) => {
    if (!user?.uid) return;

    try {
      setProcessingReview(true);

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        console.error('Not authenticated');
        setProcessingReview(false);
        return;
      }

      const item = pendingItems.find(i => i.id === companyId);

      const response = await fetch('/api/admin/bio-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'review_logo',
          companyId,
          reviewAction: action,
          reason,
          pendingLogoURL: item?.pendingLogoURL
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to review logo');
      }

      // Update local state - remove logo from pending, keep if bio still pending
      setPendingItems(prev => prev.map(i => {
        if (i.id !== companyId) return i;
        return { ...i, hasPendingLogo: false };
      }).filter(i => i.hasPendingBio || i.hasPendingLogo));

      // Close modal and reset state
      closeModal();

    } catch (error) {
      console.error('Error reviewing logo:', error);
    } finally {
      setProcessingReview(false);
    }
  };

  const openBioReviewModal = (item: CompanyWithPendingContent, action: 'approve' | 'reject' | 'edit') => {
    setSelectedItem(item);
    setReviewType('bio');
    setReviewAction(action);
    setRejectionReason('');

    if (action === 'edit') {
      setEditedBioText(item.bioText || '');
      // Load existing translations if available
      const existingTranslations = item.companySummary?.translations || {};
      setTranslations({
        fr: existingTranslations.fr || '',
        de: existingTranslations.de || '',
        es: existingTranslations.es || '',
        it: existingTranslations.it || '',
        nl: existingTranslations.nl || ''
      });
    }
  };

  const openLogoReviewModal = (item: CompanyWithPendingContent, action: 'approve' | 'reject') => {
    setSelectedItem(item);
    setReviewType('logo');
    setReviewAction(action);
    setRejectionReason('');
  };

  const closeModal = () => {
    setSelectedItem(null);
    setReviewType(null);
    setReviewAction(null);
    setRejectionReason('');
    setEditedBioText('');
    setTranslations({ fr: '', de: '', es: '', it: '', nl: '' });
  };

  // Write New Bio functions
  const openWriteNewModal = async () => {
    setShowWriteNewModal(true);
    setSelectedAccount(null);
    setNewBioText('');
    setNewBioTranslations({ fr: '', de: '', es: '', it: '', nl: '' });
    setAccountSearchQuery('');

    // Load all accounts if not already loaded
    if (allAccounts.length === 0) {
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch('/api/admin/bio-review?type=all', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success) {
          setAllAccounts(data.accounts);
        }
      } catch (error) {
        console.error('Error loading accounts:', error);
      }
    }
  };

  const closeWriteNewModal = () => {
    setShowWriteNewModal(false);
    setSelectedAccount(null);
    setNewBioText('');
    setNewBioTranslations({ fr: '', de: '', es: '', it: '', nl: '' });
    setAccountSearchQuery('');
    setNewLogoFile(null);
    setNewLogoPreview(null);
  };

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

  const handleSaveNewBio = async () => {
    if (!user?.uid || !selectedAccount) return;
    // Need either bio text or logo
    if (!newBioText.trim() && !newLogoFile) return;

    try {
      setSavingNewBio(true);

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        console.error('Not authenticated');
        setSavingNewBio(false);
        return;
      }

      let logoURL: string | undefined;

      // Handle logo upload if provided
      if (newLogoFile) {
        setUploadingLogo(true);

        const formData = new FormData();
        formData.append('file', newLogoFile);
        formData.append('identifier', selectedAccount.id);
        formData.append('organizationName', selectedAccount.organizationName || '');

        const uploadResponse = await fetch('/api/upload-logo', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          logoURL = result.downloadURL;
        } else {
          const errorData = await uploadResponse.json().catch(() => ({}));
          console.error('Logo upload failed:', errorData);
        }

        setUploadingLogo(false);
      }

      // Save bio and logo status via API
      const response = await fetch('/api/admin/bio-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'save_new',
          companyId: selectedAccount.id,
          bioText: newBioText.trim(),
          translations: newBioTranslations,
          logoURL
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save');
      }

      closeWriteNewModal();
    } catch (error) {
      console.error('Error saving new bio:', error);
    } finally {
      setSavingNewBio(false);
      setUploadingLogo(false);
    }
  };

  // Edit Existing functions
  const loadAccountsIfNeeded = async () => {
    if (allAccounts.length === 0) {
      try {
        const auth = getAuth();
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const response = await fetch('/api/admin/bio-review?type=all', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (data.success) {
          setAllAccounts(data.accounts);
        }
      } catch (error) {
        console.error('Error loading accounts:', error);
      }
    }
  };

  const openEditExistingModal = async () => {
    setShowEditExistingModal(true);
    setEditSelectedAccount(null);
    setEditBioText('');
    setEditBioTranslations({ fr: '', de: '', es: '', it: '', nl: '' });
    setEditSearchQuery('');
    setEditLogoFile(null);
    setEditLogoPreview(null);
    await loadAccountsIfNeeded();
  };

  const closeEditExistingModal = () => {
    setShowEditExistingModal(false);
    setEditSelectedAccount(null);
    setEditBioText('');
    setEditBioTranslations({ fr: '', de: '', es: '', it: '', nl: '' });
    setEditSearchQuery('');
    setEditLogoFile(null);
    setEditLogoPreview(null);
  };

  const handleEditLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearEditLogoSelection = () => {
    setEditLogoFile(null);
    setEditLogoPreview(null);
  };

  const handleSaveEdit = async () => {
    if (!user?.uid || !editSelectedAccount) return;

    try {
      setSavingEdit(true);

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        console.error('Not authenticated');
        setSavingEdit(false);
        return;
      }

      let logoURL: string | undefined;

      // Handle logo upload if provided
      if (editLogoFile) {
        setUploadingEditLogo(true);

        const formData = new FormData();
        formData.append('file', editLogoFile);
        formData.append('identifier', editSelectedAccount.id);
        formData.append('organizationName', editSelectedAccount.organizationName || '');

        const uploadResponse = await fetch('/api/upload-logo', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          logoURL = result.downloadURL;
        } else {
          const errorData = await uploadResponse.json().catch(() => ({}));
          console.error('Logo upload failed:', errorData);
        }

        setUploadingEditLogo(false);
      }

      // Save via API
      const response = await fetch('/api/admin/bio-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'save_edit',
          companyId: editSelectedAccount.id,
          bioText: editBioText.trim(),
          translations: editBioTranslations,
          logoURL
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save');
      }

      // Update local allAccounts state to reflect changes
      const bioTranslations: Record<string, string> = {};
      Object.entries(editBioTranslations).forEach(([lang, text]) => {
        if (text.trim()) {
          bioTranslations[lang] = text;
        }
      });

      setAllAccounts(prev => prev.map(acc => {
        if (acc.id !== editSelectedAccount.id) return acc;
        return {
          ...acc,
          companySummary: editBioText.trim() ? {
            ...acc.companySummary,
            text: editBioText.trim(),
            status: 'approved' as const,
            translations: Object.keys(bioTranslations).length > 0 ? bioTranslations : acc.companySummary?.translations
          } : acc.companySummary,
          logoURL: logoURL || acc.logoURL
        };
      }));

      closeEditExistingModal();
    } catch (error) {
      console.error('Error saving edit:', error);
    } finally {
      setSavingEdit(false);
      setUploadingEditLogo(false);
    }
  };

  // Filter accounts based on search query
  const filteredAccounts = allAccounts.filter(account =>
    account.organizationName?.toLowerCase().includes(accountSearchQuery.toLowerCase())
  );

  // Filter accounts with approved content for edit modal
  const filteredEditAccounts = allAccounts.filter(account => {
    const matchesSearch = account.organizationName?.toLowerCase().includes(editSearchQuery.toLowerCase());
    const hasApprovedContent = account.companySummary?.status === 'approved' || account.logoURL;
    return matchesSearch && hasApprovedContent;
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown';
    return timestamp.toDate().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  const totalPending = pendingItems.reduce((acc, item) => {
    return acc + (item.hasPendingBio ? 1 : 0) + (item.hasPendingLogo ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Directory Content Reviews</h3>
          <p className="text-sm text-gray-600">
            Review and approve company logos and bios for the directory
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {totalPending} pending review{totalPending !== 1 ? 's' : ''}
          </div>
          <Button
            variant="secondary"
            size="small"
            onClick={openEditExistingModal}
          >
            Edit Existing
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={openWriteNewModal}
          >
            Add New
          </Button>
        </div>
      </div>

      {pendingItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-1">No pending reviews</h4>
          <p className="text-gray-600">All company logos and bios have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingItems.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{item.organizationName}</h4>
                  <p className="text-sm text-gray-600">
                    Organization Type: {item.organizationType || 'Not specified'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {item.hasPendingLogo && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Logo Pending
                    </span>
                  )}
                  {item.hasPendingBio && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Bio Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Pending Logo Section */}
              {item.hasPendingLogo && item.pendingLogoURL && (
                <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded border">
                      <Image
                        src={item.pendingLogoURL}
                        alt={`${item.organizationName} pending logo`}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Pending Logo</h5>
                      <p className="text-xs text-gray-500 mb-3">
                        Submitted: {formatDate(item.logoSubmittedAt)}
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => openLogoReviewModal(item, 'reject')}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => openLogoReviewModal(item, 'approve')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Bio Section */}
              {item.hasPendingBio && item.bioText && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Pending Bio:</h5>
                  <p className="text-xs text-gray-500 mb-2">
                    Submitted: {formatDate(item.bioSubmittedAt)}
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{item.bioText}</p>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Character count: {item.bioText.length}
                  </div>
                  <div className="flex justify-end space-x-3 mt-3">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => openBioReviewModal(item, 'reject')}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => openBioReviewModal(item, 'edit')}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      Edit & Translate
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => openBioReviewModal(item, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bio Review Modal */}
      <Modal
        isOpen={!!selectedItem && reviewType === 'bio' && !!reviewAction}
        onClose={closeModal}
        title={`${reviewAction === 'approve' ? 'Approve' : reviewAction === 'reject' ? 'Reject' : 'Edit'} Company Bio`}
        maxWidth={reviewAction === 'edit' ? 'xl' : 'lg'}
      >
        {selectedItem && reviewType === 'bio' && reviewAction && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">{selectedItem.organizationName}</h4>

              {reviewAction === 'edit' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    English Bio Text *
                  </label>
                  <textarea
                    value={editedBioText}
                    onChange={(e) => setEditedBioText(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    placeholder="Edit the company bio text..."
                    required
                  />
                  <div className="mt-1 text-xs text-gray-500 text-right">
                    {editedBioText.length} characters
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedItem.bioText}</p>
                </div>
              )}
            </div>

            {reviewAction === 'edit' && (
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900">Translations (Optional)</h5>

                {Object.entries(translations).map(([lang, text]) => {
                  const langNames = {
                    fr: 'French',
                    de: 'German',
                    es: 'Spanish',
                    it: 'Italian',
                    nl: 'Dutch'
                  };

                  return (
                    <div key={lang}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {langNames[lang as keyof typeof langNames]} Translation
                      </label>
                      <textarea
                        value={text}
                        onChange={(e) => setTranslations(prev => ({ ...prev, [lang]: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        placeholder={`Enter ${langNames[lang as keyof typeof langNames]} translation...`}
                      />
                      <div className="mt-1 text-xs text-gray-500 text-right">
                        {text.length} characters
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {reviewAction === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="Please provide a reason for rejection that will be shared with the company..."
                  required
                />
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={processingReview}
              >
                Cancel
              </Button>
              <Button
                variant={reviewAction === 'approve' ? 'primary' : 'secondary'}
                onClick={() => handleReviewBio(
                  selectedItem.id,
                  reviewAction,
                  reviewAction === 'reject' ? rejectionReason : undefined
                )}
                disabled={processingReview || (reviewAction === 'reject' && !rejectionReason.trim()) || (reviewAction === 'edit' && !editedBioText.trim())}
                className={reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : reviewAction === 'edit' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                {processingReview ? 'Processing...' : (reviewAction === 'approve' ? 'Approve Bio' : reviewAction === 'reject' ? 'Reject Bio' : 'Save Changes')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Logo Review Modal */}
      <Modal
        isOpen={!!selectedItem && reviewType === 'logo' && !!reviewAction}
        onClose={closeModal}
        title={`${reviewAction === 'approve' ? 'Approve' : 'Reject'} Company Logo`}
      >
        {selectedItem && reviewType === 'logo' && reviewAction && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-4">{selectedItem.organizationName}</h4>

              {selectedItem.pendingLogoURL && (
                <div className="flex justify-center mb-4">
                  <div className="relative w-32 h-32 bg-gray-100 rounded-lg border">
                    <Image
                      src={selectedItem.pendingLogoURL}
                      alt={`${selectedItem.organizationName} pending logo`}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                </div>
              )}
            </div>

            {reviewAction === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="Please provide a reason for rejection (e.g., low quality, inappropriate content)..."
                  required
                />
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={closeModal}
                disabled={processingReview}
              >
                Cancel
              </Button>
              <Button
                variant={reviewAction === 'approve' ? 'primary' : 'secondary'}
                onClick={() => handleReviewLogo(
                  selectedItem.id,
                  reviewAction as 'approve' | 'reject',
                  reviewAction === 'reject' ? rejectionReason : undefined
                )}
                disabled={processingReview || (reviewAction === 'reject' && !rejectionReason.trim())}
                className={reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700'}
              >
                {processingReview ? 'Processing...' : (reviewAction === 'approve' ? 'Approve Logo' : 'Reject Logo')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Write New Bio Modal */}
      <Modal
        isOpen={showWriteNewModal}
        onClose={closeWriteNewModal}
        title="Add Bio & Logo"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {/* Company Selection */}
          {!selectedAccount ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Company
              </label>
              <input
                type="text"
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="Search for a company..."
              />
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredAccounts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {allAccounts.length === 0 ? 'Loading companies...' : 'No companies found'}
                  </div>
                ) : (
                  filteredAccounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setSelectedAccount(account);
                        // Pre-populate with existing bio if available
                        if (account.companySummary?.text) {
                          setNewBioText(account.companySummary.text);
                          const existingTranslations = account.companySummary.translations || {};
                          setNewBioTranslations({
                            fr: existingTranslations.fr || '',
                            de: existingTranslations.de || '',
                            es: existingTranslations.es || '',
                            it: existingTranslations.it || '',
                            nl: existingTranslations.nl || ''
                          });
                        }
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{account.organizationName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{account.organizationType || 'Unknown type'}</span>
                        {account.companySummary?.status && (
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-xs ${
                            account.companySummary.status === 'approved' ? 'bg-green-100 text-green-700' :
                            account.companySummary.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                            account.companySummary.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            Bio: {account.companySummary.status}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Selected Company Header */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedAccount.organizationName}</h4>
                  <p className="text-xs text-gray-500">{selectedAccount.organizationType || 'Unknown type'}</p>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setSelectedAccount(null);
                    setNewBioText('');
                    setNewBioTranslations({ fr: '', de: '', es: '', it: '', nl: '' });
                    setNewLogoFile(null);
                    setNewLogoPreview(null);
                  }}
                >
                  Change
                </Button>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-start gap-4">
                  {/* Current/Preview Logo */}
                  <div className="relative w-24 h-24 bg-gray-100 rounded-lg border flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {newLogoPreview ? (
                      <Image
                        src={newLogoPreview}
                        alt="New logo preview"
                        fill
                        className="object-contain p-2"
                      />
                    ) : selectedAccount.logoURL ? (
                      <Image
                        src={selectedAccount.logoURL}
                        alt="Current logo"
                        fill
                        className="object-contain p-2"
                      />
                    ) : (
                      <span className="text-xs text-gray-400 text-center px-2">No logo</span>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  English Bio Text
                </label>
                <textarea
                  value={newBioText}
                  onChange={(e) => setNewBioText(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="Write the company bio in English..."
                />
                <div className="mt-1 text-xs text-right text-gray-500">
                  {newBioText.length} characters
                </div>
              </div>

              {/* Translations */}
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900">Translations (Optional)</h5>

                {Object.entries(newBioTranslations).map(([lang, text]) => {
                  const langNames = {
                    fr: 'French',
                    de: 'German',
                    es: 'Spanish',
                    it: 'Italian',
                    nl: 'Dutch'
                  };

                  return (
                    <div key={lang}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {langNames[lang as keyof typeof langNames]} Translation
                      </label>
                      <textarea
                        value={text}
                        onChange={(e) => setNewBioTranslations(prev => ({ ...prev, [lang]: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        placeholder={`Enter ${langNames[lang as keyof typeof langNames]} translation...`}
                      />
                      <div className="mt-1 text-xs text-right text-gray-500">
                        {text.length} characters
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={closeWriteNewModal}
                  disabled={savingNewBio || uploadingLogo}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveNewBio}
                  disabled={savingNewBio || uploadingLogo || (!newBioText.trim() && !newLogoFile)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {uploadingLogo ? 'Uploading logo...' : savingNewBio ? 'Saving...' : 'Save & Approve'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Edit Existing Modal */}
      <Modal
        isOpen={showEditExistingModal}
        onClose={closeEditExistingModal}
        title="Edit Existing Bio & Logo"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          {/* Company Selection */}
          {!editSelectedAccount ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search for a company with approved content
              </label>
              <input
                type="text"
                value={editSearchQuery}
                onChange={(e) => setEditSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="Search for a company..."
              />
              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredEditAccounts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {allAccounts.length === 0 ? 'Loading companies...' : 'No companies with approved content found'}
                  </div>
                ) : (
                  filteredEditAccounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setEditSelectedAccount(account);
                        setEditBioText(account.companySummary?.text || '');
                        const existingTranslations = account.companySummary?.translations || {};
                        setEditBioTranslations({
                          fr: existingTranslations.fr || '',
                          de: existingTranslations.de || '',
                          es: existingTranslations.es || '',
                          it: existingTranslations.it || '',
                          nl: existingTranslations.nl || ''
                        });
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        {account.logoURL && (
                          <div className="relative w-10 h-10 bg-gray-100 rounded border flex-shrink-0">
                            <Image
                              src={account.logoURL}
                              alt={account.organizationName || ''}
                              fill
                              className="object-contain p-1"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{account.organizationName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>{account.organizationType || 'Unknown type'}</span>
                            {account.companySummary?.status === 'approved' && (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700">
                                Bio
                              </span>
                            )}
                            {account.logoURL && (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                                Logo
                              </span>
                            )}
                          </div>
                          {account.companySummary?.text && (
                            <p className="text-xs text-gray-400 truncate mt-1">{account.companySummary.text}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Selected Company Header */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  {editSelectedAccount.logoURL && (
                    <div className="relative w-12 h-12 bg-white rounded border flex-shrink-0">
                      <Image
                        src={editSelectedAccount.logoURL}
                        alt={editSelectedAccount.organizationName || ''}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">{editSelectedAccount.organizationName}</h4>
                    <p className="text-xs text-gray-500">{editSelectedAccount.organizationType || 'Unknown type'}</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setEditSelectedAccount(null);
                    setEditBioText('');
                    setEditBioTranslations({ fr: '', de: '', es: '', it: '', nl: '' });
                    setEditLogoFile(null);
                    setEditLogoPreview(null);
                  }}
                >
                  Change
                </Button>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-start gap-4">
                  <div className="relative w-24 h-24 bg-gray-100 rounded-lg border flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {editLogoPreview ? (
                      <Image
                        src={editLogoPreview}
                        alt="New logo preview"
                        fill
                        className="object-contain p-2"
                      />
                    ) : editSelectedAccount.logoURL ? (
                      <Image
                        src={editSelectedAccount.logoURL}
                        alt="Current logo"
                        fill
                        className="object-contain p-2"
                      />
                    ) : (
                      <span className="text-xs text-gray-400 text-center px-2">No logo</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      onChange={handleEditLogoFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-fase-navy file:text-white hover:file:bg-fase-navy/90 file:cursor-pointer"
                    />
                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, SVG, or WebP. Max 5MB.</p>
                    {editLogoPreview && (
                      <button
                        type="button"
                        onClick={clearEditLogoSelection}
                        className="mt-2 text-xs text-red-600 hover:text-red-800"
                      >
                        Remove new logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* English Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  English Bio Text
                </label>
                <textarea
                  value={editBioText}
                  onChange={(e) => setEditBioText(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="Write the company bio in English..."
                />
                <div className="mt-1 text-xs text-right text-gray-500">
                  {editBioText.length} characters
                </div>
              </div>

              {/* Translations */}
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900">Translations (Optional)</h5>

                {Object.entries(editBioTranslations).map(([lang, text]) => {
                  const langNames = {
                    fr: 'French',
                    de: 'German',
                    es: 'Spanish',
                    it: 'Italian',
                    nl: 'Dutch'
                  };

                  return (
                    <div key={lang}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {langNames[lang as keyof typeof langNames]} Translation
                      </label>
                      <textarea
                        value={text}
                        onChange={(e) => setEditBioTranslations(prev => ({ ...prev, [lang]: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        placeholder={`Enter ${langNames[lang as keyof typeof langNames]} translation...`}
                      />
                      <div className="mt-1 text-xs text-right text-gray-500">
                        {text.length} characters
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={closeEditExistingModal}
                  disabled={savingEdit || uploadingEditLogo}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveEdit}
                  disabled={savingEdit || uploadingEditLogo}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {uploadingEditLogo ? 'Uploading logo...' : savingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}