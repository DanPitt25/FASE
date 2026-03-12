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

interface PendingItemWithMatches {
  type: 'member' | 'registration';
  data: PendingMember | PendingRegistration;
  possibleMatches: Transaction[];
}

export default function PaymentMatchingTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [pendingItems, setPendingItems] = useState<PendingItemWithMatches[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Modal state
  const [selectedItem, setSelectedItem] = useState<PendingItemWithMatches | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Filters
  const [filter, setFilter] = useState<'all' | 'with-matches' | 'no-matches'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'members' | 'registrations'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load last 365 days of transactions for matching
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 365);

      const [transactionsRes, membersRes, registrationsRes] = await Promise.all([
        authFetch(`/api/admin/finance/transactions?source=all&from=${fromDate.toISOString()}&hideSuppressed=true`),
        authPost('/api/admin/get-filtered-accounts', {
          organizationTypes: [],
          accountStatuses: ['invoice_sent']
        }),
        authFetch('/api/admin/rendezvous-registrations'),
      ]);

      const [transactionsData, membersData, registrationsData] = await Promise.all([
        transactionsRes.json(),
        membersRes.json(),
        registrationsRes.json(),
      ]);

      if (!transactionsRes.ok) {
        throw new Error(transactionsData.error || 'Failed to load transactions');
      }

      const transactions: Transaction[] = transactionsData.transactions || [];
      setAllTransactions(transactions);

      // Build pending items with possible matches
      const items: PendingItemWithMatches[] = [];

      // Process members
      if (membersData.success && membersData.accounts) {
        for (const m of membersData.accounts) {
          const member: PendingMember = {
            id: m.id,
            organizationName: m.organizationName || 'Unknown',
            organizationType: m.organizationType || 'MGA',
            email: m.email || '',
            status: m.status,
            contactName: m.contactName || '',
          };

          const matches = findMatchingTransactions(member, null, transactions);
          items.push({ type: 'member', data: member, possibleMatches: matches });
        }
      }

      // Process registrations - filter to unpaid only
      const unpaidStatuses = ['pending_bank_transfer', 'pending'];
      if (registrationsData.success && registrationsData.registrations) {
        for (const r of registrationsData.registrations) {
          if (!unpaidStatuses.includes(r.paymentStatus)) continue;

          const reg: PendingRegistration = {
            id: r.id,
            registrationId: r.registrationId,
            invoiceNumber: r.invoiceNumber || '',
            company: r.billingInfo?.company || 'Unknown',
            billingEmail: r.billingInfo?.billingEmail || '',
            subtotal: r.subtotal || 0,
            paymentStatus: r.paymentStatus,
            numberOfAttendees: r.numberOfAttendees || 1,
            country: r.billingInfo?.country || '',
          };

          const matches = findMatchingTransactions(null, reg, transactions);
          items.push({ type: 'registration', data: reg, possibleMatches: matches });
        }
      }

      // Sort: items with matches first, then by name
      items.sort((a, b) => {
        if (a.possibleMatches.length > 0 && b.possibleMatches.length === 0) return -1;
        if (a.possibleMatches.length === 0 && b.possibleMatches.length > 0) return 1;
        const nameA = a.type === 'member' ? (a.data as PendingMember).organizationName : (a.data as PendingRegistration).company;
        const nameB = b.type === 'member' ? (b.data as PendingMember).organizationName : (b.data as PendingRegistration).company;
        return nameA.localeCompare(nameB);
      });

      setPendingItems(items);

    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Liberal matching - find any transaction that could plausibly be from this customer
  const findMatchingTransactions = (
    member: PendingMember | null,
    registration: PendingRegistration | null,
    transactions: Transaction[]
  ): Transaction[] => {
    const matches: Transaction[] = [];

    for (const tx of transactions) {
      let isMatch = false;

      const txSender = (tx.senderName || '').toLowerCase();
      const txEmail = (tx.email || '').toLowerCase();
      const txRef = ((tx.reference || '') + ' ' + (tx.description || '')).toLowerCase();

      if (member) {
        const orgName = member.organizationName.toLowerCase();
        const email = member.email.toLowerCase();

        // Email match (exact or partial)
        if (txEmail && email && (txEmail.includes(email.split('@')[0]) || email.includes(txEmail.split('@')[0]))) {
          isMatch = true;
        }

        // Company name match (liberal - any significant word overlap)
        if (hasWordOverlap(txSender, orgName)) {
          isMatch = true;
        }

        // Amount match for membership fees (€995 or with VAT ~€1204)
        if (tx.amount >= 900 && tx.amount <= 1300) {
          // Could be a membership payment - check name loosely
          if (txSender.length > 3 && orgName.includes(txSender.substring(0, 4))) {
            isMatch = true;
          }
        }
      }

      if (registration) {
        const company = registration.company.toLowerCase();
        const email = registration.billingEmail.toLowerCase();
        const invoiceNum = registration.invoiceNumber.toLowerCase();

        // Invoice number in reference
        if (invoiceNum && txRef.includes(invoiceNum)) {
          isMatch = true;
        }

        // Email match
        if (txEmail && email && (txEmail.includes(email.split('@')[0]) || email.includes(txEmail.split('@')[0]))) {
          isMatch = true;
        }

        // Company name match
        if (hasWordOverlap(txSender, company)) {
          isMatch = true;
        }

        // Amount match (within 10% of expected amount)
        const expectedAmount = registration.subtotal;
        if (expectedAmount > 0 && Math.abs(tx.amount - expectedAmount) / expectedAmount < 0.15) {
          isMatch = true;
        }
      }

      if (isMatch) {
        matches.push(tx);
      }
    }

    return matches;
  };

  // Check if two strings share significant words
  const hasWordOverlap = (str1: string, str2: string): boolean => {
    const stopWords = new Set(['the', 'and', 'ltd', 'llc', 'inc', 'gmbh', 'bv', 'ag', 'sa', 'srl', 'limited', 'insurance', 'group', 'holding', 'holdings', 'company', 'co', 'services']);

    const words1 = str1.split(/[\s\-_.,&]+/).filter(w => w.length > 2 && !stopWords.has(w));
    const words2 = str2.split(/[\s\-_.,&]+/).filter(w => w.length > 2 && !stopWords.has(w));

    for (const w1 of words1) {
      for (const w2 of words2) {
        // Exact match or one contains the other
        if (w1 === w2 || (w1.length > 3 && w2.includes(w1)) || (w2.length > 3 && w1.includes(w2))) {
          return true;
        }
      }
    }
    return false;
  };

  const handleConfirmMatch = async () => {
    if (!selectedItem || !selectedTransaction) return;

    setConfirming(true);
    try {
      if (selectedItem.type === 'registration') {
        const reg = selectedItem.data as PendingRegistration;
        const response = await authPost('/api/admin/update-rendezvous-status', {
          registrationId: reg.registrationId,
          status: 'paid',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update registration');
        }
      } else {
        const member = selectedItem.data as PendingMember;
        const response = await authPost('/api/admin/members/confirm-payment', {
          memberId: member.id,
          transactionId: selectedTransaction.id,
          transactionSource: selectedTransaction.source,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update member');
        }
      }

      // Suppress the transaction
      await authPost('/api/admin/finance/suppress', {
        transactionId: selectedTransaction.id,
        source: selectedTransaction.source,
        suppressed: true,
      });

      // Remove from lists
      setPendingItems(prev => prev.filter(item => {
        if (item.type !== selectedItem.type) return true;
        if (item.type === 'member') {
          return (item.data as PendingMember).id !== (selectedItem.data as PendingMember).id;
        } else {
          return (item.data as PendingRegistration).id !== (selectedItem.data as PendingRegistration).id;
        }
      }));

      setAllTransactions(prev => prev.filter(t => t.id !== selectedTransaction.id));
      setSelectedItem(null);
      setSelectedTransaction(null);
    } catch (err: any) {
      console.error('Failed to confirm match:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-EU', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  // Filter items
  const filteredItems = pendingItems.filter(item => {
    // Type filter
    if (typeFilter === 'members' && item.type !== 'member') return false;
    if (typeFilter === 'registrations' && item.type !== 'registration') return false;

    // Match filter
    if (filter === 'with-matches' && item.possibleMatches.length === 0) return false;
    if (filter === 'no-matches' && item.possibleMatches.length > 0) return false;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (item.type === 'member') {
        const m = item.data as PendingMember;
        if (!m.organizationName.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
      } else {
        const r = item.data as PendingRegistration;
        if (!r.company.toLowerCase().includes(q) && !r.billingEmail.toLowerCase().includes(q) && !r.invoiceNumber.toLowerCase().includes(q)) return false;
      }
    }

    return true;
  });

  // Stats
  const withMatches = pendingItems.filter(i => i.possibleMatches.length > 0).length;
  const membersCount = pendingItems.filter(i => i.type === 'member').length;
  const registrationsCount = pendingItems.filter(i => i.type === 'registration').length;

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
        <button onClick={loadData} className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{withMatches}</div>
          <div className="text-xs text-gray-500">Likely Paid</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-400">{pendingItems.length - withMatches}</div>
          <div className="text-xs text-gray-500">No Match Found</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{membersCount}</div>
          <div className="text-xs text-gray-500">Members</div>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{registrationsCount}</div>
          <div className="text-xs text-gray-500">Registrations</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-3 flex flex-wrap gap-3 items-center">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="all">All</option>
          <option value="with-matches">Likely Paid</option>
          <option value="no-matches">No Match</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="all">All Types</option>
          <option value="members">Members</option>
          <option value="registrations">Registrations</option>
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="text-sm border rounded px-2 py-1 flex-1 min-w-[150px]"
        />
        <button onClick={loadData} className="text-sm text-gray-600 hover:text-gray-900">Refresh</button>
      </div>

      {/* Pending items list */}
      <div className="bg-white border rounded-lg divide-y">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No pending payments to show</div>
        ) : (
          filteredItems.map((item) => {
            const isMember = item.type === 'member';
            const name = isMember ? (item.data as PendingMember).organizationName : (item.data as PendingRegistration).company;
            const email = isMember ? (item.data as PendingMember).email : (item.data as PendingRegistration).billingEmail;

            return (
              <div key={`${item.type}-${item.data.id}`} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        isMember ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isMember ? 'Member' : 'Registration'}
                      </span>
                      <span className="font-medium">{name}</span>
                      {item.possibleMatches.length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                          {item.possibleMatches.length} possible payment{item.possibleMatches.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{email}</div>
                    {!isMember && (
                      <div className="text-sm text-gray-500">
                        {(item.data as PendingRegistration).invoiceNumber} • {formatCurrency((item.data as PendingRegistration).subtotal)} • {(item.data as PendingRegistration).numberOfAttendees} attendee{(item.data as PendingRegistration).numberOfAttendees !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Possible matches */}
                {item.possibleMatches.length > 0 && (
                  <div className="mt-3 pl-4 border-l-2 border-green-200 space-y-2">
                    {item.possibleMatches.slice(0, 3).map((tx) => (
                      <div key={`${tx.source}-${tx.id}`} className="flex items-center justify-between bg-green-50 rounded p-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1 py-0.5 rounded ${
                              tx.source === 'stripe' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {tx.source}
                            </span>
                            <span className="font-medium text-sm">{formatCurrency(tx.amount, tx.currency)}</span>
                            <span className="text-xs text-gray-500">{formatDate(tx.date)}</span>
                          </div>
                          <div className="text-xs text-gray-600 truncate">{tx.senderName || 'Unknown'}</div>
                        </div>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => {
                            setSelectedItem(item);
                            setSelectedTransaction(tx);
                          }}
                        >
                          Match
                        </Button>
                      </div>
                    ))}
                    {item.possibleMatches.length > 3 && (
                      <div className="text-xs text-gray-500">+{item.possibleMatches.length - 3} more</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedItem && selectedTransaction && (
        <Modal
          isOpen={true}
          onClose={() => { setSelectedItem(null); setSelectedTransaction(null); }}
          title="Confirm Payment Match"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Mark this as paid? This will update the status and suppress the transaction.
            </p>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">
                {selectedItem.type === 'member' ? 'Member' : 'Registration'}
              </div>
              <div className="font-medium">
                {selectedItem.type === 'member'
                  ? (selectedItem.data as PendingMember).organizationName
                  : (selectedItem.data as PendingRegistration).company}
              </div>
              <div className="text-sm text-gray-600">
                {selectedItem.type === 'member'
                  ? (selectedItem.data as PendingMember).email
                  : `${(selectedItem.data as PendingRegistration).invoiceNumber} • ${formatCurrency((selectedItem.data as PendingRegistration).subtotal)}`}
              </div>
            </div>

            <div className="text-center text-gray-400">↓ paid via ↓</div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-1">Transaction</div>
              <div className="font-medium">{formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}</div>
              <div className="text-sm text-gray-600">{selectedTransaction.senderName || 'Unknown'}</div>
              <div className="text-xs text-gray-400">{selectedTransaction.source} • {formatDate(selectedTransaction.date)}</div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => { setSelectedItem(null); setSelectedTransaction(null); }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmMatch} disabled={confirming}>
                {confirming ? 'Confirming...' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
