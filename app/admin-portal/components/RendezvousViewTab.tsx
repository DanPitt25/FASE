'use client';

/**
 * RendezvousViewTab - Simplified READ-ONLY view of Rendezvous registrations
 *
 * Shows:
 * - Summary stats (attendees, revenue)
 * - Simple attendee list (no modal, no actions)
 * - Search/filter
 * - Export to Excel
 *
 * For detailed view or management, use the Manage tab.
 */

import { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/Button';
import * as XLSX from 'xlsx';
import { authFetch } from '@/lib/auth-fetch';
import type {
  RendezvousRegistration,
  RendezvousPaymentStatus,
} from '@/lib/admin-types';

type PaymentStatus = RendezvousPaymentStatus;

interface FlatAttendee {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  company: string;
  country: string;
  organizationType: string;
  paymentStatus: PaymentStatus;
  isFaseMember?: boolean;
  isAsaseMember?: boolean;
}

export default function RendezvousViewTab() {
  const [registrations, setRegistrations] = useState<RendezvousRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [sortColumn, setSortColumn] = useState<string>('company');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Suppressed registrations
  const [suppressedIds, setSuppressedIds] = useState<Set<string>>(new Set());

  // Load suppressed IDs on mount
  useEffect(() => {
    const loadSuppressedIds = async () => {
      try {
        const response = await authFetch('/api/admin/rendezvous/suppress');
        const data = await response.json();
        if (data.success) {
          setSuppressedIds(new Set(data.suppressedIds));
        }
      } catch (error) {
        console.error('Error loading suppressed registrations:', error);
      }
    };
    loadSuppressedIds();
  }, []);

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/admin/rendezvous-registrations');
      if (!response.ok) throw new Error('Failed to fetch registrations');
      const data = await response.json();
      const allRegistrations = data.registrations || [];
      // Only actual registrations (not interest)
      const actual = allRegistrations.filter((r: any) => r.registrationType !== 'interest');
      setRegistrations(actual);
    } catch (error) {
      console.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter out suppressed registrations
  const visibleRegistrations = useMemo(() => {
    return registrations.filter(reg => !suppressedIds.has(reg.registrationId));
  }, [registrations, suppressedIds]);

  // Flatten all attendees from visible registrations
  const allAttendees = useMemo((): FlatAttendee[] => {
    const attendees: FlatAttendee[] = [];
    visibleRegistrations.forEach(reg => {
      (reg.attendees || []).forEach(att => {
        attendees.push({
          firstName: att.firstName,
          lastName: att.lastName,
          email: att.email,
          jobTitle: att.jobTitle,
          company: reg.billingInfo?.company || '',
          country: reg.billingInfo?.country || '',
          organizationType: reg.billingInfo?.organizationType || '',
          paymentStatus: reg.paymentStatus,
          isFaseMember: reg.companyIsFaseMember,
          isAsaseMember: reg.isAsaseMember,
        });
      });
    });
    return attendees;
  }, [visibleRegistrations]);

  // Filter and sort attendees
  const filteredAttendees = useMemo(() => {
    let filtered = allAttendees;

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending_bank_transfer') {
        filtered = filtered.filter(a => a.paymentStatus === 'pending_bank_transfer' || a.paymentStatus === 'pending');
      } else {
        filtered = filtered.filter(a => a.paymentStatus === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.company.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';

      switch (sortColumn) {
        case 'name':
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'company':
          aVal = a.company.toLowerCase();
          bVal = b.company.toLowerCase();
          break;
        case 'jobTitle':
          aVal = (a.jobTitle || '').toLowerCase();
          bVal = (b.jobTitle || '').toLowerCase();
          break;
        case 'status':
          aVal = a.paymentStatus;
          bVal = b.paymentStatus;
          break;
        default:
          aVal = a.company.toLowerCase();
          bVal = b.company.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [allAttendees, statusFilter, searchQuery, sortColumn, sortDirection]);

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
      case 'paid': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'complimentary': return 'bg-purple-100 text-purple-800';
      case 'pending_bank_transfer':
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'confirmed': return 'Confirmed';
      case 'complimentary': return 'Complimentary';
      case 'pending_bank_transfer':
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const exportToExcel = () => {
    const data = allAttendees.map(a => ({
      'First Name': a.firstName,
      'Last Name': a.lastName,
      'Email': a.email,
      'Job Title': a.jobTitle,
      'Company': a.company,
      'Country': a.country,
      'Payment Status': formatStatus(a.paymentStatus),
      'FASE Member': a.isFaseMember ? 'Yes' : 'No',
      'ASASE Member': a.isAsaseMember ? 'Yes' : 'No',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendees');
    XLSX.writeFile(workbook, `rendezvous-attendees-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading registrations...</p>
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
            placeholder="Search name, email, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="confirmed">Confirmed</option>
            <option value="complimentary">Complimentary</option>
            <option value="pending_bank_transfer">Pending</option>
          </select>
          <Button variant="secondary" size="small" onClick={exportToExcel}>
            Export Excel
          </Button>
          <div className="text-sm text-gray-500 ml-auto">
            {filteredAttendees.length} attendees
          </div>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-fase-light-gold">
            <thead className="bg-fase-navy">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('name')}
                >
                  Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('company')}
                >
                  Company {sortColumn === 'company' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('jobTitle')}
                >
                  Job Title {sortColumn === 'jobTitle' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-white uppercase tracking-wider cursor-pointer hover:bg-fase-navy/80"
                  onClick={() => handleSort('status')}
                >
                  Status {sortColumn === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAttendees.map((attendee, index) => (
                <tr key={`${attendee.email}-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {attendee.firstName} {attendee.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{attendee.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{attendee.company}</div>
                    <div className="flex gap-1 mt-0.5">
                      {attendee.isFaseMember && (
                        <span className="inline-flex px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">FASE</span>
                      )}
                      {attendee.isAsaseMember && (
                        <span className="inline-flex px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">ASASE</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{attendee.jobTitle}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendee.paymentStatus)}`}>
                      {formatStatus(attendee.paymentStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAttendees.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No attendees found.</p>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="text-sm text-gray-500 text-center">
        To manage registrations, send emails, or edit details, use the <strong>Registrations</strong> tile in the Manage section.
      </div>
    </div>
  );
}
