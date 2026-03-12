'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import { authFetch, authPost } from '@/lib/auth-fetch';
import type { Transaction, RendezvousRegistration } from '@/lib/admin-types';

interface MemberMatch {
  id: string;
  organizationName: string;
  organizationType: string;
  email?: string;
  status: string;
  pendingAmount?: number;
}

interface RegistrationMatch {
  id: string;
  invoiceNumber: string;
  company: string;
  billingEmail: string;
  subtotal: number;
  paymentStatus: string;
  numberOfAttendees: number;
}

interface MatchSuggestion {
  type: 'member' | 'registration';
  matchType: 'email' | 'company_name' | 'invoice_reference' | 'amount';
  confidence: 'high' | 'medium' | 'low';
  member?: MemberMatch;
  registration?: RegistrationMatch;
  reason: string;
}

interface UnmatchedTransaction extends Transaction {
  suggestions: MatchSuggestion[];
}

export default function PaymentMatchingTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<UnmatchedTransaction[]>([]);
  const [members, setMembers] = useState<MemberMatch[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationMatch[]>([]);

  // Modal state
  const [selectedTransaction, setSelectedTransaction] = useState<UnmatchedTransaction | null>(null);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState<MatchSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Filters
  const [showMatched, setShowMatched] = useState(false);
  const [dateRange, setDateRange] = useState<'30' | '90' | '180' | '365'>('90');

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load transactions, members with pending payments, and registrations with pending payments
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - parseInt(dateRange));

      const [transactionsRes, membersRes, registrationsRes] = await Promise.all([
        authFetch(`/api/admin/finance/transactions?source=all&from=${fromDate.toISOString()}&hideSuppressed=true`),
        authPost('/api/admin/get-filtered-accounts', {
          organizationTypes: [],
          accountStatuses: ['pending_payment', 'invoice_sent', 'pending_invoice']
        }),
        authFetch('/api/admin/rendezvous-registrations?paymentStatus=pending_bank_transfer'),
      ]);

      const [transactionsData, membersData, registrationsData] = await Promise.all([
        transactionsRes.json(),
        membersRes.json(),
        registrationsRes.json(),
      ]);

      if (!transactionsRes.ok) {
        throw new Error(transactionsData.error || 'Failed to load transactions');
      }

      // Process members (from get-filtered-accounts which returns 'accounts')
      const membersList: MemberMatch[] = membersData.success && membersData.accounts
        ? membersData.accounts.map((m: any) => ({
            id: m.id,
            organizationName: m.organizationName,
            organizationType: m.organizationType,
            email: m.email,
            status: m.status,
            pendingAmount: 995, // Standard membership fee
          }))
        : [];

      // Process registrations
      const registrationsList: RegistrationMatch[] = registrationsData.success && registrationsData.registrations
        ? registrationsData.registrations.map((r: RendezvousRegistration) => ({
            id: r.id,
            invoiceNumber: r.invoiceNumber,
            company: r.billingInfo.company,
            billingEmail: r.billingInfo.billingEmail,
            subtotal: r.subtotal,
            paymentStatus: r.paymentStatus,
            numberOfAttendees: r.numberOfAttendees,
          }))
        : [];

      setMembers(membersList);
      setRegistrations(registrationsList);

      // Generate suggestions for each transaction
      const txWithSuggestions: UnmatchedTransaction[] = transactionsData.transactions.map((tx: Transaction) => ({
        ...tx,
        suggestions: generateSuggestions(tx, membersList, registrationsList),
      }));

      setTransactions(txWithSuggestions);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Generate match suggestions for a transaction
  const generateSuggestions = (
    tx: Transaction,
    membersList: MemberMatch[],
    registrationsList: RegistrationMatch[]
  ): MatchSuggestion[] => {
    const suggestions: MatchSuggestion[] = [];
    const senderNameLower = (tx.senderName || '').toLowerCase().trim();
    const emailLower = (tx.email || '').toLowerCase().trim();
    const referenceLower = (tx.reference || '').toLowerCase();
    const descriptionLower = (tx.description || '').toLowerCase();

    // Check for invoice number in reference/description (Rendezvous)
    const invoiceMatch = (referenceLower + ' ' + descriptionLower).match(/fase-rdv-\d+/i);
    if (invoiceMatch) {
      const invoiceNum = invoiceMatch[0].toUpperCase();
      const matchedReg = registrationsList.find(r => r.invoiceNumber === invoiceNum);
      if (matchedReg) {
        suggestions.push({
          type: 'registration',
          matchType: 'invoice_reference',
          confidence: 'high',
          registration: matchedReg,
          reason: `Invoice number ${invoiceNum} found in payment reference`,
        });
      }
    }

    // Email match for registrations
    if (emailLower) {
      for (const reg of registrationsList) {
        if (reg.billingEmail.toLowerCase() === emailLower) {
          // Avoid duplicates
          if (!suggestions.some(s => s.registration?.id === reg.id)) {
            suggestions.push({
              type: 'registration',
              matchType: 'email',
              confidence: 'high',
              registration: reg,
              reason: `Email matches registration billing email`,
            });
          }
        }
      }

      // Email match for members
      for (const member of membersList) {
        if (member.email && member.email.toLowerCase() === emailLower) {
          suggestions.push({
            type: 'member',
            matchType: 'email',
            confidence: 'high',
            member,
            reason: `Email matches member contact email`,
          });
        }
      }
    }

    // Company name fuzzy match
    if (senderNameLower && senderNameLower.length > 3) {
      // Check registrations
      for (const reg of registrationsList) {
        const companyLower = reg.company.toLowerCase();
        const similarity = calculateSimilarity(senderNameLower, companyLower);
        if (similarity > 0.6) {
          if (!suggestions.some(s => s.registration?.id === reg.id)) {
            suggestions.push({
              type: 'registration',
              matchType: 'company_name',
              confidence: similarity > 0.85 ? 'high' : 'medium',
              registration: reg,
              reason: `Company name "${reg.company}" similar to sender "${tx.senderName}"`,
            });
          }
        }
      }

      // Check members
      for (const member of membersList) {
        const orgLower = member.organizationName.toLowerCase();
        const similarity = calculateSimilarity(senderNameLower, orgLower);
        if (similarity > 0.6) {
          suggestions.push({
            type: 'member',
            matchType: 'company_name',
            confidence: similarity > 0.85 ? 'high' : 'medium',
            member,
            reason: `Organization "${member.organizationName}" similar to sender "${tx.senderName}"`,
          });
        }
      }
    }

    // Amount match (only if no other matches found)
    if (suggestions.length === 0) {
      // Check registrations for exact amount match
      for (const reg of registrationsList) {
        if (Math.abs(reg.subtotal - tx.amount) < 0.01) {
          suggestions.push({
            type: 'registration',
            matchType: 'amount',
            confidence: 'low',
            registration: reg,
            reason: `Amount ${tx.currency} ${tx.amount.toFixed(2)} matches registration subtotal`,
          });
        }
      }

      // Check standard membership fees
      if (tx.amount === 995 || tx.amount === 995 * 1.21) {
        for (const member of membersList) {
          suggestions.push({
            type: 'member',
            matchType: 'amount',
            confidence: 'low',
            member,
            reason: `Amount matches standard membership fee`,
          });
        }
      }
    }

    // Sort by confidence
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]);

    return suggestions;
  };

  // Simple string similarity (Dice coefficient)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const getBigrams = (s: string): Set<string> => {
      const bigrams = new Set<string>();
      for (let i = 0; i < s.length - 1; i++) {
        bigrams.add(s.slice(i, i + 2));
      }
      return bigrams;
    };

    const bigrams1 = getBigrams(str1);
    const bigrams2 = getBigrams(str2);
    let intersection = 0;
    bigrams1.forEach(b => { if (bigrams2.has(b)) intersection++; });
    return (2 * intersection) / (bigrams1.size + bigrams2.size);
  };

  // Manual search
  const handleManualSearch = useCallback(async () => {
    if (!manualSearchQuery.trim() || manualSearchQuery.length < 2) {
      setManualSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const query = manualSearchQuery.toLowerCase();
      const results: MatchSuggestion[] = [];

      // Search members
      for (const member of members) {
        if (member.organizationName.toLowerCase().includes(query) ||
            (member.email && member.email.toLowerCase().includes(query))) {
          results.push({
            type: 'member',
            matchType: 'company_name',
            confidence: 'medium',
            member,
            reason: 'Manual search match',
          });
        }
      }

      // Search registrations
      for (const reg of registrations) {
        if (reg.company.toLowerCase().includes(query) ||
            reg.billingEmail.toLowerCase().includes(query) ||
            reg.invoiceNumber.toLowerCase().includes(query)) {
          results.push({
            type: 'registration',
            matchType: 'company_name',
            confidence: 'medium',
            registration: reg,
            reason: 'Manual search match',
          });
        }
      }

      setManualSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, [manualSearchQuery, members, registrations]);

  // Confirm a match
  const handleConfirmMatch = async (suggestion: MatchSuggestion) => {
    if (!selectedTransaction) return;

    setConfirming(true);
    try {
      if (suggestion.type === 'registration' && suggestion.registration) {
        // Update registration payment status using existing endpoint
        const response = await authPost('/api/admin/update-rendezvous-status', {
          registrationId: suggestion.registration.id,
          status: 'paid',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update registration');
        }

        // Remove from registrations list
        setRegistrations(prev => prev.filter(r => r.id !== suggestion.registration!.id));
      } else if (suggestion.type === 'member' && suggestion.member) {
        // Update member payment status
        const response = await authPost('/api/admin/members/confirm-payment', {
          memberId: suggestion.member.id,
          transactionId: selectedTransaction.id,
          transactionSource: selectedTransaction.source,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update member');
        }

        // Remove from members list
        setMembers(prev => prev.filter(m => m.id !== suggestion.member!.id));
      }

      // Mark transaction as matched (suppress it)
      await authPost('/api/admin/finance/suppress', {
        transactionId: selectedTransaction.id,
        source: selectedTransaction.source,
        suppressed: true,
      });

      // Remove from view
      setTransactions(prev => prev.filter(t => t.id !== selectedTransaction.id));
      setSelectedTransaction(null);
    } catch (err: any) {
      console.error('Failed to confirm match:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles[confidence]}`}>
        {confidence}
      </span>
    );
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    if (!showMatched && tx.suggestions.length === 0) return true;
    return showMatched || tx.suggestions.length > 0;
  });

  // Summary stats
  const highConfidenceMatches = transactions.filter(tx =>
    tx.suggestions.some(s => s.confidence === 'high')
  ).length;
  const pendingRegistrations = registrations.length;
  const pendingMembers = members.length;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading payment data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800 font-medium">Error loading data</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
        <button
          onClick={loadData}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">High Confidence Matches</div>
          <div className="text-2xl font-bold text-green-600">{highConfidenceMatches}</div>
          <div className="text-xs text-gray-400">Ready to confirm</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Pending Registrations</div>
          <div className="text-2xl font-bold text-blue-600">{pendingRegistrations}</div>
          <div className="text-xs text-gray-400">Awaiting bank transfer</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Pending Members</div>
          <div className="text-2xl font-bold text-purple-600">{pendingMembers}</div>
          <div className="text-xs text-gray-400">Awaiting payment</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Unmatched Transactions</div>
          <div className="text-2xl font-bold text-gray-600">
            {transactions.filter(t => t.suggestions.length === 0).length}
          </div>
          <div className="text-xs text-gray-400">Need manual review</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-sm text-gray-600 mr-2">Date Range:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showMatched}
              onChange={(e) => setShowMatched(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show all transactions
          </label>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold">Transactions with Match Suggestions</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No transactions to match. All payments may be processed!
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={`${tx.source}-${tx.id}`}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedTransaction(tx);
                  setManualSearchQuery('');
                  setManualSearchResults([]);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        tx.source === 'stripe' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {tx.source}
                      </span>
                      <span className="font-medium">{formatCurrency(tx.amount, tx.currency)}</span>
                      <span className="text-sm text-gray-500">{formatDate(tx.date)}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {tx.senderName || 'Unknown sender'}
                      {tx.email && <span className="text-gray-400"> • {tx.email}</span>}
                    </div>
                    {tx.reference && (
                      <div className="mt-0.5 text-xs text-gray-400 truncate max-w-md">
                        Ref: {tx.reference}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {tx.suggestions.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {tx.suggestions.length} suggestion{tx.suggestions.length !== 1 ? 's' : ''}
                        </span>
                        {getConfidenceBadge(tx.suggestions[0].confidence)}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No matches</span>
                    )}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Preview top suggestion */}
                {tx.suggestions.length > 0 && tx.suggestions[0].confidence === 'high' && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <span className="font-medium text-green-800">Suggested: </span>
                    <span className="text-green-700">
                      {tx.suggestions[0].type === 'registration'
                        ? `Registration ${tx.suggestions[0].registration?.invoiceNumber} - ${tx.suggestions[0].registration?.company}`
                        : `Member: ${tx.suggestions[0].member?.organizationName}`}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Match Modal */}
      {selectedTransaction && (
        <Modal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          title="Match Payment"
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Transaction Details */}
            <div className="bg-fase-navy text-white p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-bold">
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </div>
                  <div className="text-sm text-gray-200 mt-1">
                    {selectedTransaction.senderName || 'Unknown sender'}
                    {selectedTransaction.email && ` • ${selectedTransaction.email}`}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    selectedTransaction.source === 'stripe' ? 'bg-purple-500' : 'bg-blue-500'
                  }`}>
                    {selectedTransaction.source}
                  </span>
                  <div className="text-sm text-gray-200 mt-1">
                    {formatDate(selectedTransaction.date)}
                  </div>
                </div>
              </div>
              {selectedTransaction.reference && (
                <div className="mt-2 text-sm text-gray-300">
                  Reference: {selectedTransaction.reference}
                </div>
              )}
            </div>

            {/* Suggestions */}
            {selectedTransaction.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Match Suggestions</h4>
                <div className="space-y-2">
                  {selectedTransaction.suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-3 hover:border-fase-navy transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              suggestion.type === 'registration' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {suggestion.type}
                            </span>
                            {getConfidenceBadge(suggestion.confidence)}
                          </div>
                          <div className="mt-1 font-medium">
                            {suggestion.type === 'registration'
                              ? `${suggestion.registration?.company} (${suggestion.registration?.invoiceNumber})`
                              : suggestion.member?.organizationName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {suggestion.reason}
                          </div>
                          {suggestion.type === 'registration' && suggestion.registration && (
                            <div className="text-sm text-gray-600 mt-1">
                              Amount: {formatCurrency(suggestion.registration.subtotal)} •
                              {suggestion.registration.numberOfAttendees} attendee{suggestion.registration.numberOfAttendees !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => handleConfirmMatch(suggestion)}
                          disabled={confirming}
                        >
                          {confirming ? 'Confirming...' : 'Confirm Match'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Search */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Manual Search</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualSearchQuery}
                  onChange={(e) => setManualSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  placeholder="Search by company name, email, or invoice number..."
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <Button
                  variant="secondary"
                  onClick={handleManualSearch}
                  disabled={searching || manualSearchQuery.length < 2}
                >
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {manualSearchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {manualSearchResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-3 hover:border-fase-navy transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            result.type === 'registration' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {result.type}
                          </span>
                          <span className="ml-2 font-medium">
                            {result.type === 'registration'
                              ? `${result.registration?.company} (${result.registration?.invoiceNumber})`
                              : result.member?.organizationName}
                          </span>
                        </div>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => handleConfirmMatch(result)}
                          disabled={confirming}
                        >
                          {confirming ? 'Confirming...' : 'Confirm'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skip / Close */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => setSelectedTransaction(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
