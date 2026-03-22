'use client';

/**
 * MembersTab - Unified member management
 *
 * Combines VIEW and MANAGE functionality with:
 * - Member list with search/filter/sort
 * - "Show suppressed" toggle
 * - Full CompanyMembersModal with all tabs and actions
 * - Status changes, email sending, notes, delete
 * - Suppress/unsuppress members
 */

import { useState, useMemo } from 'react';
import { UnifiedMember } from '../../../lib/unified-member';
import Button from '../../../components/Button';
import CompanyMembersModal from './CompanyMembersModal';
import { authPost } from '../../../lib/auth-fetch';

interface MembersTabProps {
  memberApplications: UnifiedMember[];
  loading: boolean;
  onStatusUpdate: (memberId: string, newStatus: UnifiedMember['status'], adminNotes?: string) => void;
  onMemberDeleted?: (memberId: string) => void;
  suppressedIds: Set<string>;
  onSuppressedIdsChange: (ids: Set<string>) => void;
}

export default function MembersTab({
  memberApplications,
  loading,
  onStatusUpdate,
  onMemberDeleted,
  suppressedIds,
  onSuppressedIdsChange
}: MembersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnifiedMember['status'] | 'all'>('all');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string; memberData: UnifiedMember } | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('organizationName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showSuppressed, setShowSuppressed] = useState(false);

  // Handle suppress/unsuppress
  const handleToggleSuppressed = async (memberId: string) => {
    const isSuppressed = suppressedIds.has(memberId);
    try {
      const response = await authPost('/api/admin/members/suppress', {
        memberId,
        suppressed: !isSuppressed,
      });

      if (!response.ok) {
        throw new Error('Failed to update suppression');
      }

      const newSet = new Set(suppressedIds);
      if (isSuppressed) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      onSuppressedIdsChange(newSet);
    } catch (err: any) {
      console.error('Failed to toggle suppressed:', err);
      alert(`Error: ${err.message}`);
    }
  };

  // Filter, search, and sort
  const filteredMembers = useMemo(() => {
    let filtered = memberApplications;

    // Filter by suppression status
    if (!showSuppressed) {
      filtered = filtered.filter(member => !suppressedIds.has(member.id));
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }

    // Search
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
        case 'createdAt':
          aVal = a.createdAt?.toString() || '';
          bVal = b.createdAt?.toString() || '';
          break;
        default:
          aVal = (a.organizationName || '').toLowerCase();
          bVal = (b.organizationName || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [memberApplications, suppressedIds, showSuppressed, statusFilter, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Counts
  const visibleMemberCount = memberApplications.filter(m => !suppressedIds.has(m.id)).length;
  const suppressedCount = memberApplications.filter(m => suppressedIds.has(m.id)).length;
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
    if (status === 'invoice_sent') return 'Invoiced';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleManageMembers = (member: UnifiedMember) => {
    setSelectedCompany({
      id: member.id,
      name: member.organizationName || 'Unknown Organization',
      memberData: member
    });
    setShowMembersModal(true);
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
            placeholder="Search organization, contact, email, country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm w-72 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UnifiedMember['status'] | 'all')}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="all">All Statuses ({visibleMemberCount})</option>
            {statuses.map(status => (
              <option key={status} value={status}>
                {formatStatus(status)} ({memberApplications.filter(m => m.status === status && !suppressedIds.has(m.id)).length})
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showSuppressed}
              onChange={(e) => setShowSuppressed(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show suppressed {suppressedCount > 0 && `(${suppressedCount})`}
          </label>
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
                  Contact
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
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
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('createdAt')}
                >
                  Applied {sortColumn === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => {
                const isSuppressed = suppressedIds.has(member.id);
                return (
                  <tr key={member.id} className={`hover:bg-gray-50 ${isSuppressed ? 'opacity-50 bg-gray-100' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{member.organizationName}</div>
                      <div className="text-xs text-gray-500">{member.organizationType}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{member.primaryContact?.name || member.personalName || '-'}</div>
                      <div className="text-xs text-gray-500">{member.email || '-'}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {member.businessAddress?.country || member.registeredAddress?.country || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.status)}`}>
                          {formatStatus(member.status)}
                        </span>
                        {isSuppressed && (
                          <span className="inline-flex px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                            Hidden
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {member.createdAt ? (member.createdAt.toDate?.() || new Date(member.createdAt)).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => handleManageMembers(member)}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredMembers.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No members found.</p>
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
        onDelete={onMemberDeleted}
        isSuppressed={selectedCompany ? suppressedIds.has(selectedCompany.id) : false}
        onToggleSuppressed={handleToggleSuppressed}
      />
    </div>
  );
}
