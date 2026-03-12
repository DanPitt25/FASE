'use client';

import { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import { authFetch, authPost } from '@/lib/auth-fetch';
import type { Transaction } from '@/lib/admin-types';

interface PendingMember {
  id: string;
  organizationName: string;
  organizationType: string;
  email: string;
  status: string;
  contactName?: string;
}

interface PendingRegistration {
  id: string;
  registrationId: string;
  invoiceNumber: string;
  company: string;
  billingEmail: string;
  subtotal: number;
  paymentStatus: string;
  numberOfAttendees: number;
  country?: string;
}

type PendingItem =
  | { type: 'member'; data: PendingMember }
  | { type: 'registration'; data: PendingRegistration };

export default function PaymentMatchingTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);

  // Selection state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedPending, setSelectedPending] = useState<PendingItem | null>(null);

  // Match modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState<'30' | '90' | '180' | '365'>('90');
  const [pendingFilter, setPendingFilter] = useState<'all' | 'members' | 'registrations'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - parseInt(dateRange));

      // Load all data in parallel
      const [transactionsRes, membersRes, registrationsRes] = await Promise.all([
        authFetch(`/api/admin/finance/transactions?source=all&from=${fromDate.toISOString()}&hideSuppressed=true`),
        authPost('/api/admin/get-filtered-accounts', {
          organizationTypes: [],
          accountStatuses: ['invoice_sent'] // Only invoice_sent members need payment matching
        }),
        authFetch('/api/admin/rendezvous-registrations'), // Get all, filter client-side
      ]);

      const [transactionsData, membersData, registrationsData] = await Promise.all([
        transactionsRes.json(),
        membersRes.json(),
        registrationsRes.json(),
      ]);

      if (!transactionsRes.ok) {
        throw new Error(transactionsData.error || 'Failed to load transactions');
      }

      setTransactions(transactionsData.transactions || []);

      // Process members
      const members: PendingMember[] = membersData.success && membersData.accounts
        ? membersData.accounts.map((m: any) => ({
            id: m.id,
            organizationName: m.organizationName || 'Unknown',
            organizationType: m.organizationType || 'MGA',
            email: m.email || '',
            status: m.status,
            contactName: m.contactName || '',
          }))
        : [];
      setPendingMembers(members);

      // Process registrations - filter to unpaid only
      const unpaidStatuses = ['pending_bank_transfer', 'pending'];
      const regs: PendingRegistration[] = registrationsData.success && registrationsData.registrations
        ? registrationsData.registrations
            .filter((r: any) => unpaidStatuses.includes(r.paymentStatus))
            .map((r: any) => ({
              id: r.id,
              registrationId: r.registrationId,
              invoiceNumber: r.invoiceNumber || '',
              company: r.billingInfo?.company || 'Unknown',
              billingEmail: r.billingInfo?.billingEmail || '',
              subtotal: r.subtotal || 0,
              paymentStatus: r.paymentStatus,
              numberOfAttendees: r.numberOfAttendees || 1,
              country: r.billingInfo?.country || '',
            }))
        : [];
      setPendingRegistrations(regs);

    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // When both are selected, show match modal
  useEffect(() => {
    if (selectedTransaction && selectedPending) {
      setShowMatchModal(true);
    }
  }, [selectedTransaction, selectedPending]);

  const handleConfirmMatch = async () => {
    if (!selectedTransaction || !selectedPending) return;

    setConfirming(true);
    try {
      if (selectedPending.type === 'registration') {
        const reg = selectedPending.data;
        const response = await authPost('/api/admin/update-rendezvous-status', {
          registrationId: reg.registrationId,
          status: 'paid',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update registration');
        }

        setPendingRegistrations(prev => prev.filter(r => r.id !== reg.id));
      } else {
        const member = selectedPending.data;
        const response = await authPost('/api/admin/members/confirm-payment', {
          memberId: member.id,
          transactionId: selectedTransaction.id,
          transactionSource: selectedTransaction.source,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update member');
        }

        setPendingMembers(prev => prev.filter(m => m.id !== member.id));
      }

      // Suppress the transaction
      await authPost('/api/admin/finance/suppress', {
        transactionId: selectedTransaction.id,
        source: selectedTransaction.source,
        suppressed: true,
      });

      setTransactions(prev => prev.filter(t => t.id !== selectedTransaction.id));

      // Reset selection
      setSelectedTransaction(null);
      setSelectedPending(null);
      setShowMatchModal(false);
    } catch (err: any) {
      console.error('Failed to confirm match:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  const cancelMatch = () => {
    setShowMatchModal(false);
    setSelectedTransaction(null);
    setSelectedPending(null);
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Filter pending items
  const filteredPending: PendingItem[] = [
    ...(pendingFilter === 'all' || pendingFilter === 'members'
      ? pendingMembers.map(m => ({ type: 'member' as const, data: m }))
      : []),
    ...(pendingFilter === 'all' || pendingFilter === 'registrations'
      ? pendingRegistrations.map(r => ({ type: 'registration' as const, data: r }))
      : []),
  ].filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (item.type === 'member') {
      return item.data.organizationName.toLowerCase().includes(q) ||
             item.data.email.toLowerCase().includes(q);
    } else {
      return item.data.company.toLowerCase().includes(q) ||
             item.data.billingEmail.toLowerCase().includes(q) ||
             item.data.invoiceNumber.toLowerCase().includes(q);
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800 font-medium">Error</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
        <button onClick={loadData} className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>How to match:</strong> Click a transaction on the left, then click a pending payment on the right to match them.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-700">{transactions.length}</div>
          <div className="text-xs text-gray-500">Incoming Payments</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{pendingMembers.length}</div>
          <div className="text-xs text-gray-500">Members (Invoice Sent)</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{pendingRegistrations.length}</div>
          <div className="text-xs text-gray-500">Registrations (Pending)</div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Transactions */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Incoming Payments</h3>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">6 months</option>
              <option value="365">1 year</option>
            </select>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y">
            {transactions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No transactions</div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={`${tx.source}-${tx.id}`}
                  onClick={() => setSelectedTransaction(selectedTransaction?.id === tx.id ? null : tx)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${
                    selectedTransaction?.id === tx.id ? 'bg-fase-navy/10 border-l-4 border-fase-navy' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          tx.source === 'stripe' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {tx.source}
                        </span>
                        <span className="font-medium text-sm">{formatCurrency(tx.amount, tx.currency)}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {tx.senderName || 'Unknown'}
                      </div>
                      {tx.email && (
                        <div className="text-xs text-gray-400 truncate">{tx.email}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 ml-2 shrink-0">
                      {formatDate(tx.date)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Pending Payments */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Awaiting Payment</h3>
              <select
                value={pendingFilter}
                onChange={(e) => setPendingFilter(e.target.value as typeof pendingFilter)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All</option>
                <option value="members">Members Only</option>
                <option value="registrations">Registrations Only</option>
              </select>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, email, invoice..."
              className="w-full text-xs border rounded px-2 py-1.5"
            />
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y">
            {filteredPending.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No pending payments</div>
            ) : (
              filteredPending.map((item) => {
                const isSelected = selectedPending?.type === item.type &&
                  (item.type === 'member'
                    ? (selectedPending.data as PendingMember).id === item.data.id
                    : (selectedPending.data as PendingRegistration).id === item.data.id);

                return (
                  <div
                    key={`${item.type}-${item.data.id}`}
                    onClick={() => setSelectedPending(isSelected ? null : item)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${
                      isSelected ? 'bg-fase-gold/10 border-l-4 border-fase-gold' : ''
                    }`}
                  >
                    {item.type === 'member' ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                            Member
                          </span>
                          <span className="font-medium text-sm truncate">{item.data.organizationName}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{item.data.email}</div>
                        <div className="text-xs text-gray-400">Status: {item.data.status}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            Registration
                          </span>
                          <span className="font-medium text-sm truncate">{item.data.company}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {item.data.invoiceNumber} • {formatCurrency(item.data.subtotal)} • {item.data.numberOfAttendees} attendee{item.data.numberOfAttendees !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-gray-400">{item.data.billingEmail}</div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Selection indicator */}
      {(selectedTransaction || selectedPending) && !showMatchModal && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-fase-navy text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-4">
          <span className="text-sm">
            {selectedTransaction && !selectedPending && 'Now select a pending payment →'}
            {!selectedTransaction && selectedPending && '← Now select a transaction'}
          </span>
          <button
            onClick={() => { setSelectedTransaction(null); setSelectedPending(null); }}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Match Confirmation Modal */}
      {showMatchModal && selectedTransaction && selectedPending && (
        <Modal
          isOpen={showMatchModal}
          onClose={cancelMatch}
          title="Confirm Match"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Match this transaction to the selected pending payment?
            </p>

            {/* Transaction */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Transaction</div>
              <div className="font-medium">
                {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
              </div>
              <div className="text-sm text-gray-600">{selectedTransaction.senderName}</div>
              {selectedTransaction.email && (
                <div className="text-xs text-gray-400">{selectedTransaction.email}</div>
              )}
            </div>

            <div className="text-center text-gray-400">↓ matches ↓</div>

            {/* Pending item */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">
                {selectedPending.type === 'member' ? 'Member' : 'Registration'}
              </div>
              {selectedPending.type === 'member' ? (
                <>
                  <div className="font-medium">{selectedPending.data.organizationName}</div>
                  <div className="text-sm text-gray-600">{selectedPending.data.email}</div>
                </>
              ) : (
                <>
                  <div className="font-medium">{selectedPending.data.company}</div>
                  <div className="text-sm text-gray-600">
                    {selectedPending.data.invoiceNumber} • {formatCurrency(selectedPending.data.subtotal)}
                  </div>
                  <div className="text-xs text-gray-400">{selectedPending.data.billingEmail}</div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={cancelMatch}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmMatch} disabled={confirming}>
                {confirming ? 'Confirming...' : 'Confirm Match'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
