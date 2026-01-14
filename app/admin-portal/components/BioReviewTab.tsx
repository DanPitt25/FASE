'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useUnifiedAuth } from '../../../contexts/UnifiedAuthContext';
import { OrganizationAccount, CompanySummary, LogoStatus } from '../../../lib/unified-member';
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

  // Load pending submissions (both bios and logos)
  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
    try {
      setLoading(true);

      // Query all organization accounts
      const accountsRef = collection(db, 'accounts');
      const accountsSnapshot = await getDocs(accountsRef);

      const companiesWithPendingContent: CompanyWithPendingContent[] = [];

      accountsSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as OrganizationAccount;

        const hasPendingBio = data.companySummary?.status === 'pending_review';
        const hasPendingLogo = data.logoStatus?.status === 'pending_review';

        // Include if either bio or logo is pending
        if (hasPendingBio || hasPendingLogo) {
          companiesWithPendingContent.push({
            ...data,
            id: docSnap.id,
            hasPendingBio,
            hasPendingLogo,
            bioStatus: data.companySummary?.status,
            bioText: data.companySummary?.text,
            bioSubmittedAt: data.companySummary?.submittedAt,
            pendingLogoURL: data.logoStatus?.pendingURL,
            logoSubmittedAt: data.logoStatus?.submittedAt
          });
        }
      });

      // Sort by most recent submission (either bio or logo)
      companiesWithPendingContent.sort((a, b) => {
        const aTime = Math.max(
          a.bioSubmittedAt?.toDate?.()?.getTime() || 0,
          a.logoSubmittedAt?.toDate?.()?.getTime() || 0
        );
        const bTime = Math.max(
          b.bioSubmittedAt?.toDate?.()?.getTime() || 0,
          b.logoSubmittedAt?.toDate?.()?.getTime() || 0
        );
        return bTime - aTime;
      });

      setPendingItems(companiesWithPendingContent);
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

      const accountRef = doc(db, 'accounts', companyId);
      let updateData: any = {
        'companySummary.reviewedAt': serverTimestamp(),
        'companySummary.reviewedBy': user.uid,
        updatedAt: serverTimestamp()
      };

      if (action === 'edit') {
        // Update bio text and translations, keep status as approved
        updateData['companySummary.text'] = editedBioText;
        updateData['companySummary.status'] = 'approved';

        // Add translations if provided
        const bioTranslations: any = {};
        Object.entries(translations).forEach(([lang, text]) => {
          if (text.trim()) {
            bioTranslations[lang] = text;
          }
        });

        if (Object.keys(bioTranslations).length > 0) {
          updateData['companySummary.translations'] = bioTranslations;
        }
      } else {
        updateData['companySummary.status'] = action === 'approve' ? 'approved' : 'rejected';

        if (action === 'reject' && reason) {
          updateData['companySummary.rejectionReason'] = reason;
        }
      }

      await updateDoc(accountRef, updateData);

      // Update local state - remove bio from pending, keep if logo still pending
      setPendingItems(prev => prev.map(item => {
        if (item.id !== companyId) return item;
        return { ...item, hasPendingBio: false, bioStatus: action === 'approve' || action === 'edit' ? 'approved' : 'rejected' };
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

      const accountRef = doc(db, 'accounts', companyId);
      const item = pendingItems.find(i => i.id === companyId);

      let updateData: any = {
        'logoStatus.reviewedAt': serverTimestamp(),
        'logoStatus.reviewedBy': user.uid,
        'logoStatus.status': action === 'approve' ? 'approved' : 'rejected',
        updatedAt: serverTimestamp()
      };

      if (action === 'approve' && item?.pendingLogoURL) {
        // Move pending logo to approved logoURL
        updateData['logoURL'] = item.pendingLogoURL;
      }

      if (action === 'reject' && reason) {
        updateData['logoStatus.rejectionReason'] = reason;
      }

      await updateDoc(accountRef, updateData);

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
        <div className="text-sm text-gray-500">
          {totalPending} pending review{totalPending !== 1 ? 's' : ''}
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
                    Character count: {item.bioText.length}/500
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
                    maxLength={500}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    placeholder="Edit the company bio text..."
                    required
                  />
                  <div className="mt-1 text-xs text-gray-500 text-right">
                    {editedBioText.length}/500 characters
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
                        maxLength={500}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        placeholder={`Enter ${langNames[lang as keyof typeof langNames]} translation...`}
                      />
                      <div className="mt-1 text-xs text-gray-500 text-right">
                        {text.length}/500 characters
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
    </div>
  );
}