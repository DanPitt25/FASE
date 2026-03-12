'use client';

import { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import { authFetch, authPost } from '@/lib/auth-fetch';
import type { Transaction } from '@/lib/admin-types';
import { calculateMembershipFee } from '@/lib/pricing';

interface PendingMember {
  id: string;
  organizationName: string;
  organizationType: string;
  gwpBand: string;
  email: string;
  status: string;
  contactName?: string;
  expectedAmount: number; // Calculated from organizationType + gwpBand using pricing.ts
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

// Check if amount matches the member's expected invoice (with tolerance)
const isPlausibleMembershipAmount = (amount: number, expectedAmount: number): boolean => {
  if (!expectedAmount) return false;
  return Math.abs(amount - expectedAmount) <= 100; // €100 tolerance
};

// Check if amount is plausible for rendezvous
const isPlausibleRendezvousAmount = (amount: number, expectedSubtotal: number): boolean => {
  return Math.abs(amount - expectedSubtotal) <= 100; // €100 tolerance
};

export default function PaymentMatchingTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [pendingItems, setPendingItems] = useState<PendingItemWithMatches[]>([]);

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
      // ONLY fetch Wise (bank transfer) transactions - Stripe payments are already linked automatically
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 365);

      const [transactionsRes, membersRes, registrationsRes] = await Promise.all([
        authFetch(`/api/admin/finance/transactions?source=wise&from=${fromDate.toISOString()}&hideSuppressed=true`),
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

      const allTransactions: Transaction[] = transactionsData.transactions || [];

      // Build pending items with possible matches
      const items: PendingItemWithMatches[] = [];

      // Process members - only match against membership-plausible transactions
      if (membersData.success && membersData.accounts) {
        for (const m of membersData.accounts) {
          const orgType = m.organizationType || 'MGA';
          const gwpBand = m.gwpBand || '<10m';
          const expectedAmount = calculateMembershipFee(orgType, gwpBand, false);

          const member: PendingMember = {
            id: m.id,
            organizationName: m.organizationName || 'Unknown',
            organizationType: orgType,
            gwpBand: gwpBand,
            email: m.email || '',
            status: m.status,
            contactName: m.contactName || '',
            expectedAmount: expectedAmount,
          };

          // Only match transactions that are close to this member's expected invoice amount
          const plausibleTransactions = allTransactions.filter(tx =>
            isPlausibleMembershipAmount(tx.amount, member.expectedAmount)
          );
          const matches = findMatchingTransactions(member, null, plausibleTransactions);
          items.push({ type: 'member', data: member, possibleMatches: matches });
        }
      }

      // Process registrations - filter to unpaid bank transfer only
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

          // Only match transactions that are plausible for this registration's amount
          const plausibleTransactions = allTransactions.filter((tx: Transaction) =>
            isPlausibleRendezvousAmount(tx.amount, reg.subtotal)
          );
          const matches = findMatchingTransactions(null, reg, plausibleTransactions);
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

  // Match transactions - require meaningful correlation, not just amount
  const findMatchingTransactions = (
    member: PendingMember | null,
    registration: PendingRegistration | null,
    transactions: Transaction[]
  ): Transaction[] => {
    const matches: Transaction[] = [];

    for (const tx of transactions) {
      const txSender = (tx.senderName || '').toLowerCase();
      const txEmail = (tx.email || '').toLowerCase();
      const txRef = ((tx.reference || '') + ' ' + (tx.description || '')).toLowerCase();

      if (member) {
        const orgName = member.organizationName.toLowerCase();
        const email = member.email.toLowerCase();
        const emailDomain = email.split('@')[1] || '';

        // Strong match: email domain matches (same company)
        if (txEmail && emailDomain && txEmail.endsWith('@' + emailDomain)) {
          matches.push(tx);
          continue;
        }

        // Strong match: company name appears in sender (must be distinctive part)
        const nameMatch = getCompanyNameMatch(orgName, txSender);
        if (nameMatch) {
          matches.push(tx);
          continue;
        }
      }

      if (registration) {
        const company = registration.company.toLowerCase();
        const email = registration.billingEmail.toLowerCase();
        const emailDomain = email.split('@')[1] || '';
        const invoiceNum = registration.invoiceNumber.toLowerCase();

        // Strong match: invoice number in reference
        if (invoiceNum && invoiceNum.length > 5 && txRef.includes(invoiceNum)) {
          matches.push(tx);
          continue;
        }

        // Strong match: email domain matches
        if (txEmail && emailDomain && txEmail.endsWith('@' + emailDomain)) {
          matches.push(tx);
          continue;
        }

        // Strong match: company name appears in sender
        const nameMatch = getCompanyNameMatch(company, txSender);
        if (nameMatch) {
          matches.push(tx);
          continue;
        }

        // Amount match ONLY if there's also partial name similarity
        const expectedAmount = registration.subtotal;
        if (expectedAmount > 0 && Math.abs(tx.amount - expectedAmount) / expectedAmount < 0.05) {
          // 5% tolerance, but need some name correlation
          if (hasWeakNameCorrelation(company, txSender)) {
            matches.push(tx);
            continue;
          }
        }
      }
    }

    return matches;
  };

  // Get distinctive company name match - not generic industry words
  const getCompanyNameMatch = (companyName: string, senderName: string): boolean => {
    // Words that are too common in insurance/MGA industry to be distinctive
    const industryWords = new Set([
      'the', 'and', 'ltd', 'llc', 'inc', 'gmbh', 'bv', 'ag', 'sa', 'srl', 'limited',
      'insurance', 'group', 'holding', 'holdings', 'company', 'co', 'services',
      'underwriting', 'underwriters', 'risk', 'risks', 'reinsurance', 'specialty',
      'international', 'global', 'europe', 'european', 'solutions', 'partners',
      'management', 'consulting', 'advisory', 'financial', 'capital', 'assurance'
    ]);

    // Extract distinctive words (4+ chars, not industry generic)
    const companyWords = companyName.split(/[\s\-_.,&()]+/)
      .map(w => w.toLowerCase())
      .filter(w => w.length >= 4 && !industryWords.has(w));

    const senderWords = senderName.split(/[\s\-_.,&()]+/)
      .map(w => w.toLowerCase())
      .filter(w => w.length >= 4 && !industryWords.has(w));

    // Need at least one distinctive word match
    for (const cw of companyWords) {
      for (const sw of senderWords) {
        // Exact match or one is a clear substring of the other (80%+ overlap)
        if (cw === sw) return true;
        if (cw.length >= 5 && sw.length >= 5) {
          if (sw.includes(cw) || cw.includes(sw)) return true;
        }
      }
    }
    return false;
  };

  // Weak correlation for amount-matching backup
  const hasWeakNameCorrelation = (company: string, sender: string): boolean => {
    // Check if first 3 meaningful characters match
    const getFirstMeaningfulChars = (str: string): string => {
      const cleaned = str.replace(/[^a-z]/gi, '').toLowerCase();
      return cleaned.substring(0, 4);
    };

    const companyStart = getFirstMeaningfulChars(company);
    const senderStart = getFirstMeaningfulChars(sender);

    return companyStart.length >= 3 && senderStart.length >= 3 &&
           (companyStart.startsWith(senderStart.substring(0, 3)) ||
            senderStart.startsWith(companyStart.substring(0, 3)));
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
                    {isMember && (
                      <div className="text-sm text-gray-500">
                        Expected: {formatCurrency((item.data as PendingMember).expectedAmount)}
                      </div>
                    )}
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
                            <span className="text-xs px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                              bank
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
              <div className="text-xs text-gray-400">Bank transfer • {formatDate(selectedTransaction.date)}</div>
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
