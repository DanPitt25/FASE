'use client';

import { useState } from 'react';
import { UnifiedMember } from '../../../lib/unified-member';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import CompanyMembersModal from './CompanyMembersModal';

interface MembersTabProps {
  memberApplications: UnifiedMember[];
  loading: boolean;
  onStatusUpdate: (memberId: string, newStatus: UnifiedMember['status'], adminNotes?: string) => void;
  onMemberDeleted?: (memberId: string) => void;
}

export default function MembersTab({
  memberApplications,
  loading,
  onStatusUpdate,
  onMemberDeleted
}: MembersTabProps) {
  const [statusFilter, setStatusFilter] = useState<UnifiedMember['status'] | 'all'>('all');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string; memberData: UnifiedMember } | null>(null);

  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<UnifiedMember | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading members...</p>
      </div>
    );
  }

  // Filter members based on status
  const filteredMembers = statusFilter === 'all'
    ? memberApplications
    : memberApplications.filter(member => member.status === statusFilter);

  // Count for header excludes internal accounts (they're not really "member applications")
  const memberApplicationCount = memberApplications.filter(m => m.status !== 'internal').length;
  const filteredMemberCount = statusFilter === 'all'
    ? memberApplicationCount
    : filteredMembers.length;

  // Get unique statuses for filter dropdown
  const statuses = Array.from(new Set(memberApplications.map(member => member.status)));

  const getStatusColor = (status: UnifiedMember['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'pending_invoice': return 'bg-orange-100 text-orange-800';
      case 'pending_payment': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'invoice_sent': return 'bg-purple-100 text-purple-800';
      case 'internal': return 'bg-cyan-100 text-cyan-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'guest': return 'bg-gray-100 text-gray-800';
      case 'flagged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: UnifiedMember['status']) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleViewMembers = (member: UnifiedMember) => {
    setSelectedCompany({
      id: member.id,
      name: member.organizationName || 'Unknown Organization',
      memberData: member
    });
    setShowMembersModal(true);
  };

  const handleDeleteClick = (member: UnifiedMember) => {
    setMemberToDelete(member);
    setDeleteConfirmation('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete || deleteConfirmation !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch('/api/admin/delete-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: memberToDelete.id,
          confirmationPhrase: deleteConfirmation
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete member');
      }

      // Close modal and notify parent
      setShowDeleteModal(false);
      setMemberToDelete(null);
      setDeleteConfirmation('');

      if (onMemberDeleted) {
        onMemberDeleted(memberToDelete.id);
      }

      alert(`Successfully deleted ${result.details?.organizationName || 'member'}. ${result.details?.membersDeleted || 0} member documents and ${result.details?.authUsersDeleted || 0} auth accounts removed.`);

    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete member');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
            Member Applications ({filteredMemberCount})
          </h3>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UnifiedMember['status'] | 'all')}
              className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="all">All Statuses ({memberApplicationCount})</option>
              {statuses.map(status => (
                <option key={status} value={status}>
                  {formatStatus(status)} ({memberApplications.filter(m => m.status === status).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-fase-light-gold">
            <thead className="bg-fase-navy">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{member.organizationName}</div>
                      <div className="text-gray-500 text-xs">{member.organizationType}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">{member.primaryContact?.name || member.personalName || 'Unknown'}</div>
                      <div className="text-gray-500 text-xs">{member.email || 'No email'}</div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.status)}`}>
                      {formatStatus(member.status)}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-xs text-gray-500">
                    {member.createdAt ? (member.createdAt.toDate?.() || new Date(member.createdAt)).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Unknown'}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium">
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleViewMembers(member)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMembers.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-fase-black">No members found matching the current filter.</p>
          </div>
        )}
      </div>

      {/* Company Members Modal */}
      <CompanyMembersModal
        isOpen={showMembersModal}
        onClose={() => {
          setShowMembersModal(false);
          setSelectedCompany(null);
        }}
        companyId={selectedCompany?.id || ''}
        companyName={selectedCompany?.name || ''}
        memberData={selectedCompany?.memberData}
        onStatusUpdate={onStatusUpdate}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMemberToDelete(null);
          setDeleteConfirmation('');
          setDeleteError(null);
        }}
        title="Delete Member Account"
        maxWidth="md"
      >
        {memberToDelete && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-red-800 font-semibold">Warning: This action cannot be undone</h4>
                  <p className="text-red-700 text-sm mt-1">
                    This will permanently delete the account, all team members, and their Firebase Auth credentials.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Account to delete:</div>
              <div className="font-semibold text-gray-900">{memberToDelete.organizationName}</div>
              <div className="text-sm text-gray-600">{memberToDelete.email}</div>
              <div className="text-xs text-gray-500 mt-1">ID: {memberToDelete.id}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-mono bg-gray-100 px-1">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Type DELETE here"
                disabled={deleting}
              />
            </div>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{deleteError}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setMemberToDelete(null);
                  setDeleteConfirmation('');
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteConfirm}
                disabled={deleting || deleteConfirmation !== 'DELETE'}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}