'use client';

/**
 * MembersManageTab - MANAGE functions for member organizations
 *
 * MANAGE functions:
 * - Member list with filter/sort
 * - Full CompanyMembersModal with all tabs and actions
 * - Status changes
 * - Email sending
 * - Notes management (add/pin/delete)
 * - Delete member functionality
 * - Suppress/unsuppress members
 *
 * All VIEW functions are in MembersViewTab.tsx
 */

import { useState, useEffect } from 'react';
import { UnifiedMember } from '../../../lib/unified-member';
import Button from '../../../components/Button';
import CompanyMembersModal from './CompanyMembersModal';
import { authFetch, authPost } from '@/lib/auth-fetch';

interface MembersManageTabProps {
  memberApplications: UnifiedMember[];
  loading: boolean;
  onStatusUpdate: (memberId: string, newStatus: UnifiedMember['status'], adminNotes?: string) => void;
  onMemberDeleted?: (memberId: string) => void;
}

export default function MembersManageTab({
  memberApplications,
  loading,
  onStatusUpdate,
  onMemberDeleted
}: MembersManageTabProps) {
  const [statusFilter, setStatusFilter] = useState<UnifiedMember['status'] | 'all'>('all');
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string; memberData: UnifiedMember } | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('organizationName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Suppression state
  const [suppressedIds, setSuppressedIds] = useState<Set<string>>(new Set());
  const [showSuppressed, setShowSuppressed] = useState(false);

  // Load suppressed IDs on mount
  useEffect(() => {
    const loadSuppressedIds = async () => {
      try {
        const response = await authFetch('/api/admin/members/suppress');
        const data = await response.json();
        if (data.success) {
          setSuppressedIds(new Set(data.suppressedIds));
        }
      } catch (error) {
        console.error('Error loading suppressed members:', error);
      }
    };
    loadSuppressedIds();
  }, []);

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

      // Update local state
      setSuppressedIds(prev => {
        const newSet = new Set(prev);
        if (isSuppressed) {
          newSet.delete(memberId);
        } else {
          newSet.add(memberId);
        }
        return newSet;
      });
    } catch (err: any) {
      console.error('Failed to toggle suppressed:', err);
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading members...</p>
      </div>
    );
  }

  // Filter and sort members
  const filteredMembers = (() => {
    let filtered = memberApplications;

    // Filter by suppression status
    if (!showSuppressed) {
      filtered = filtered.filter(member => !suppressedIds.has(member.id));
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === statusFilter);
    }

    return [...filtered].sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';

      switch (sortColumn) {
        case 'organizationName':
          aVal = (a.organizationName || '').toLowerCase();
          bVal = (b.organizationName || '').toLowerCase();
          break;
        case 'country':
          aVal = (a.registeredAddress?.country || '').toLowerCase();
          bVal = (b.registeredAddress?.country || '').toLowerCase();
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
  })();

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Count for header only includes approved and invoice_sent (actual members)
  const memberApplicationCount = memberApplications.filter(m => m.status === 'approved' || m.status === 'invoice_sent').length;
  const filteredMemberCount = statusFilter === 'all'
    ? memberApplicationCount
    : filteredMembers.length;

  // Get unique statuses for filter dropdown
  const statuses = Array.from(new Set(memberApplications.map(member => member.status)));

  // Count suppressed members
  const suppressedCount = memberApplications.filter(m => suppressedIds.has(m.id)).length;

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

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
            Manage Members ({filteredMemberCount})
          </h3>
          <div className="flex gap-2 items-center">
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showSuppressed}
                onChange={(e) => setShowSuppressed(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show suppressed {suppressedCount > 0 && `(${suppressedCount})`}
            </label>
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => {
                const isSuppressed = suppressedIds.has(member.id);
                return (
                  <tr key={member.id} className={`hover:bg-gray-50 ${isSuppressed ? 'opacity-50 bg-gray-100' : ''}`}>
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
                    <td className="px-3 py-4 text-xs text-gray-500">
                      {member.createdAt ? (member.createdAt.toDate?.() || new Date(member.createdAt)).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Unknown'}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium">
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
            <p className="text-fase-black">No members found matching the current filter.</p>
          </div>
        )}
      </div>

      {/* Company Members Modal (full functionality) */}
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
