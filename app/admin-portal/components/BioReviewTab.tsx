'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useUnifiedAuth } from '../../../contexts/UnifiedAuthContext';
import { OrganizationAccount, CompanySummary } from '../../../lib/unified-member';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';

interface CompanyWithBio extends OrganizationAccount {
  bioStatus: CompanySummary['status'];
  bioText: string;
  submittedAt?: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
}

export default function BioReviewTab() {
  const { user } = useUnifiedAuth();
  const [loading, setLoading] = useState(true);
  const [pendingBios, setPendingBios] = useState<CompanyWithBio[]>([]);
  const [selectedBio, setSelectedBio] = useState<CompanyWithBio | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  // Load pending bio submissions
  useEffect(() => {
    loadPendingBios();
  }, []);

  const loadPendingBios = async () => {
    try {
      setLoading(true);
      
      // Query all organization accounts
      const accountsRef = collection(db, 'accounts');
      const accountsSnapshot = await getDocs(accountsRef);
      
      const companiesWithPendingBios: CompanyWithBio[] = [];
      
      accountsSnapshot.docs.forEach(doc => {
        const data = doc.data() as OrganizationAccount;
        
        // Check if company has a pending bio
        if (data.companySummary?.status === 'pending_review') {
          companiesWithPendingBios.push({
            ...data,
            bioStatus: data.companySummary.status,
            bioText: data.companySummary.text,
            submittedAt: data.companySummary.submittedAt,
            reviewedAt: data.companySummary.reviewedAt,
            reviewedBy: data.companySummary.reviewedBy,
            rejectionReason: data.companySummary.rejectionReason
          });
        }
      });

      // Sort by submission date (newest first)
      companiesWithPendingBios.sort((a, b) => {
        const aTime = a.submittedAt?.toDate?.() || new Date(0);
        const bTime = b.submittedAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      setPendingBios(companiesWithPendingBios);
    } catch (error) {
      console.error('Error loading pending bios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewBio = async (companyId: string, action: 'approve' | 'reject', reason?: string) => {
    if (!user?.uid) return;

    try {
      setProcessingReview(true);

      const accountRef = doc(db, 'accounts', companyId);
      const updateData: any = {
        'companySummary.status': action === 'approve' ? 'approved' : 'rejected',
        'companySummary.reviewedAt': serverTimestamp(),
        'companySummary.reviewedBy': user.uid,
        updatedAt: serverTimestamp()
      };

      if (action === 'reject' && reason) {
        updateData['companySummary.rejectionReason'] = reason;
      }

      await updateDoc(accountRef, updateData);

      // Update local state
      setPendingBios(prev => prev.filter(bio => bio.id !== companyId));
      
      // Close modal
      setSelectedBio(null);
      setReviewAction(null);
      setRejectionReason('');

    } catch (error) {
      console.error('Error reviewing bio:', error);
    } finally {
      setProcessingReview(false);
    }
  };

  const openReviewModal = (bio: CompanyWithBio, action: 'approve' | 'reject') => {
    setSelectedBio(bio);
    setReviewAction(action);
    setRejectionReason('');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Company Bio Reviews</h3>
          <p className="text-sm text-gray-600">
            Review and approve company bio submissions for the directory
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {pendingBios.length} pending review{pendingBios.length !== 1 ? 's' : ''}
        </div>
      </div>

      {pendingBios.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-1">No pending bio reviews</h4>
          <p className="text-gray-600">All company bio submissions have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBios.map((bio) => (
            <div key={bio.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{bio.organizationName}</h4>
                  <p className="text-sm text-gray-600">
                    Submitted: {formatDate(bio.submittedAt)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Organization Type: {bio.organizationType || 'Not specified'}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending Review
                </span>
              </div>

              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Company Bio:</h5>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{bio.bioText}</p>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Character count: {bio.bioText.length}/500
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => openReviewModal(bio, 'reject')}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => openReviewModal(bio, 'approve')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedBio && !!reviewAction}
        onClose={() => {
          setSelectedBio(null);
          setReviewAction(null);
          setRejectionReason('');
        }}
        title={`${reviewAction === 'approve' ? 'Approve' : 'Reject'} Company Bio`}
      >
        {selectedBio && reviewAction && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">{selectedBio.organizationName}</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedBio.bioText}</p>
              </div>
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
                  placeholder="Please provide a reason for rejection that will be shared with the company..."
                  required
                />
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedBio(null);
                  setReviewAction(null);
                  setRejectionReason('');
                }}
                disabled={processingReview}
              >
                Cancel
              </Button>
              <Button
                variant={reviewAction === 'approve' ? 'primary' : 'secondary'}
                onClick={() => handleReviewBio(
                  selectedBio.id, 
                  reviewAction,
                  reviewAction === 'reject' ? rejectionReason : undefined
                )}
                disabled={processingReview || (reviewAction === 'reject' && !rejectionReason.trim())}
                className={reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
              >
                {processingReview ? 'Processing...' : (reviewAction === 'approve' ? 'Approve Bio' : 'Reject Bio')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}