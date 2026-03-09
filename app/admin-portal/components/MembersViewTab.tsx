'use client';

/**
 * MembersViewTab - Simplified READ-ONLY view of member organizations
 *
 * Shows:
 * - Summary stats by status
 * - Simple member list with View modal
 * - Search/filter
 *
 * For management actions, use the Manage tab.
 */

import { useState, useEffect, useMemo } from 'react';
import { UnifiedMember } from '../../../lib/unified-member';
import { authFetch } from '@/lib/auth-fetch';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';

interface MembersViewTabProps {
  memberApplications: UnifiedMember[];
  loading: boolean;
  suppressedIds: Set<string>;
}

export default function MembersViewTab({
  memberApplications,
  loading,
  suppressedIds,
}: MembersViewTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnifiedMember['status'] | 'all'>('all');
  const [sortColumn, setSortColumn] = useState<string>('organizationName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // View modal
  const [selectedMember, setSelectedMember] = useState<UnifiedMember | null>(null);
  const [accountAdmin, setAccountAdmin] = useState<{
    personalName?: string;
    email?: string;
    jobTitle?: string;
    phone?: string;
  } | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Fetch account admin when modal opens
  useEffect(() => {
    const fetchAccountAdmin = async () => {
      if (!selectedMember) {
        setAccountAdmin(null);
        return;
      }

      setLoadingAdmin(true);
      try {
        const response = await authFetch(`/api/admin/company-members?companyId=${selectedMember.id}`);
        const data = await response.json();
        if (data.success && data.members) {
          const admin = data.members.find((m: any) => m.isAccountAdministrator);
          if (admin) {
            setAccountAdmin({
              personalName: admin.personalName,
              email: admin.email,
              jobTitle: admin.jobTitle,
              phone: admin.phone,
            });
          } else {
            setAccountAdmin(null);
          }
        }
      } catch (error) {
        console.error('Error fetching account admin:', error);
        setAccountAdmin(null);
      } finally {
        setLoadingAdmin(false);
      }
    };

    fetchAccountAdmin();
  }, [selectedMember]);

  // Filter out suppressed members
  const visibleMembers = useMemo(() => {
    return memberApplications.filter(m => !suppressedIds.has(m.id));
  }, [memberApplications, suppressedIds]);

  // Filter, search, and sort
  const filteredMembers = useMemo(() => {
    let filtered = visibleMembers;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        (m.organizationName || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.primaryContact?.name || m.personalName || '').toLowerCase().includes(q) ||
        (m.businessAddress?.country || m.registeredAddress?.country || '').toLowerCase().includes(q)
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';

      switch (sortColumn) {
        case 'organizationName':
          aVal = (a.organizationName || '').toLowerCase();
          bVal = (b.organizationName || '').toLowerCase();
          break;
        case 'country':
          aVal = (a.businessAddress?.country || a.registeredAddress?.country || '').toLowerCase();
          bVal = (b.businessAddress?.country || b.registeredAddress?.country || '').toLowerCase();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = (a.organizationName || '').toLowerCase();
          bVal = (b.organizationName || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [visibleMembers, statusFilter, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'pending_invoice': return 'bg-orange-100 text-orange-800';
      case 'pending_payment': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'invoice_sent': return 'bg-purple-100 text-purple-800';
      case 'internal': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    if (status === 'invoice_sent') return 'Invoiced';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search organization, contact, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UnifiedMember['status'] | 'all')}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="invoice_sent">Invoiced</option>
            <option value="pending">Pending</option>
            <option value="pending_invoice">Pending Invoice</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="internal">Internal</option>
          </select>
          <div className="text-sm text-gray-500 ml-auto">
            {filteredMembers.length} members
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-fase-light-gold">
            <thead className="bg-fase-navy">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('organizationName')}
                >
                  Organization {sortColumn === 'organizationName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Email
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('country')}
                >
                  Country {sortColumn === 'country' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('status')}
                >
                  Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{member.organizationName}</div>
                    <div className="text-xs text-gray-500">{member.organizationType}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{member.email || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.businessAddress?.country || member.registeredAddress?.country || '-'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.status)}`}>
                      {formatStatus(member.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setSelectedMember(member)}
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
            <p className="text-gray-500">No members found.</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      <Modal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title={selectedMember?.organizationName || 'Member Details'}
        maxWidth="2xl"
      >
        {selectedMember && (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex justify-between items-center">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedMember.status)}`}>
                {formatStatus(selectedMember.status)}
              </span>
              <span className="text-sm text-gray-500">
                {selectedMember.createdAt
                  ? `Applied: ${(selectedMember.createdAt.toDate?.() || new Date(selectedMember.createdAt)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                  : ''}
              </span>
            </div>

            {/* Organization Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-fase-navy mb-3">Organization</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Name</div>
                  <div className="font-medium">{selectedMember.organizationName || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Type</div>
                  <div className="font-medium">{selectedMember.organizationType || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">Website</div>
                  <div className="font-medium">
                    {selectedMember.website ? (
                      <a href={selectedMember.website} target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:underline">
                        {selectedMember.website}
                      </a>
                    ) : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info (Account Admin) */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-fase-navy mb-3">Account Admin</h4>
              {loadingAdmin ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : accountAdmin ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500">Name</div>
                    <div className="font-medium">{accountAdmin.personalName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Email</div>
                    <div className="font-medium">{accountAdmin.email || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Phone</div>
                    <div className="font-medium">{accountAdmin.phone || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Job Title</div>
                    <div className="font-medium">{accountAdmin.jobTitle || '-'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No account admin found</div>
              )}
            </div>

            {/* Address */}
            {(selectedMember.businessAddress || selectedMember.registeredAddress) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-fase-navy mb-3">Address</h4>
                <div className="text-sm">
                  {(() => {
                    const addr = selectedMember.businessAddress || selectedMember.registeredAddress;
                    if (!addr) return '-';
                    const parts = [
                      addr.line1,
                      addr.line2,
                      [addr.city, addr.postcode].filter(Boolean).join(' '),
                      addr.country
                    ].filter(Boolean);
                    return parts.join(', ');
                  })()}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-500">
                For actions, use the <strong>Members</strong> tile in Manage.
              </div>
              <Button variant="secondary" onClick={() => setSelectedMember(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
