'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';
import { authFetch, authPost, authDelete } from '@/lib/auth-fetch';
import type {
  Transaction,
  PaymentActivity,
  PaymentNote,
  FinanceFilterSource,
  FinanceDateRange,
  FinanceSortField,
  FinanceModalTab,
  SortDirection,
  LinkedPayment,
  LinkedPaymentType,
} from '@/lib/admin-types';
import type { UnifiedMember } from '@/lib/unified-member';
import { matchPayment, formatMatchSummary, type PaymentMatch } from '@/lib/payment-matching';

type FilterSource = FinanceFilterSource;
type DateRange = FinanceDateRange;
type SortField = FinanceSortField;
type ModalTab = FinanceModalTab;
type LinkFilter = 'all' | 'linked' | 'unlinked';

interface FinanceManageTabProps {
  memberApplications: UnifiedMember[];
}

export default function FinanceManageTab({ memberApplications }: FinanceManageTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sourceFilter, setSourceFilter] = useState<FilterSource>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSuppressed, setShowSuppressed] = useState(false);
  const [linkFilter, setLinkFilter] = useState<LinkFilter>('all');

  // Modal state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>('details');
  const [activities, setActivities] = useState<PaymentActivity[]>([]);
  const [notes, setNotes] = useState<PaymentNote[]>([]);
  const [loadingCrm, setLoadingCrm] = useState(false);

  // Invoice generation state
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceOrganization, setInvoiceOrganization] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState('EUR');
  const [invoiceContactName, setInvoiceContactName] = useState('');
  const [invoiceAddressLine1, setInvoiceAddressLine1] = useState('');
  const [invoiceAddressLine2, setInvoiceAddressLine2] = useState('');
  const [invoiceCity, setInvoiceCity] = useState('');
  const [invoicePostcode, setInvoicePostcode] = useState('');
  const [invoiceCountry, setInvoiceCountry] = useState('');
  const [invoiceVatNumber, setInvoiceVatNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');  // Optional: override auto-generated number
  const [invoiceLineItems, setInvoiceLineItems] = useState<{ description: string; quantity: number; unitPrice: number }[]>([
    { description: 'FASE Annual Membership', quantity: 1, unitPrice: 0 }
  ]);

  // Member search state (client-side filtering of memberApplications)
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<UnifiedMember | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Note form state
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState('general');
  const [savingNote, setSavingNote] = useState(false);

  // Payment linking state
  const [linkPaymentType, setLinkPaymentType] = useState<LinkedPaymentType>('membership');
  const [linkingPayment, setLinkingPayment] = useState(false);

  useEffect(() => {
    loadData();
  }, [sourceFilter, dateRange, showSuppressed]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/admin/finance/transactions?source=${sourceFilter}`;
      if (!showSuppressed) {
        url += '&hideSuppressed=true';
      }
      if (dateRange !== 'all') {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - parseInt(dateRange));
        url += `&from=${fromDate.toISOString()}`;
      }

      const response = await authFetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load transactions');
      }

      setTransactions(data.transactions || []);
    } catch (err: any) {
      console.error('Failed to load finance data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentCrmData = useCallback(async (transactionId: string, source: string) => {
    setLoadingCrm(true);
    try {
      const [activitiesRes, notesRes] = await Promise.all([
        authFetch(`/api/admin/finance/activities?transactionId=${transactionId}&source=${source}`),
        authFetch(`/api/admin/finance/notes?transactionId=${transactionId}&source=${source}`),
      ]);

      const [activitiesData, notesData] = await Promise.all([
        activitiesRes.json(),
        notesRes.json(),
      ]);

      if (activitiesData.success) setActivities(activitiesData.activities || []);
      if (notesData.success) setNotes(notesData.notes || []);
    } catch (err) {
      console.error('Failed to load payment CRM data:', err);
    } finally {
      setLoadingCrm(false);
    }
  }, []);

  const openTransactionModal = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setModalTab('details');
    setInvoiceOrganization(tx.senderName || '');
    setInvoiceCurrency(tx.currency);
    setInvoiceLineItems([{ description: 'FASE Annual Membership', quantity: 1, unitPrice: tx.amount }]);
    setInvoiceContactName('');
    setInvoiceAddressLine1('');
    setInvoiceAddressLine2('');
    setInvoiceCity('');
    setInvoicePostcode('');
    setInvoiceCountry('');
    setSelectedMember(null);
    setMemberSearchQuery('');
        loadPaymentCrmData(tx.id, tx.source);
  };

  const closeModal = () => {
    setSelectedTransaction(null);
    setActivities([]);
    setNotes([]);
    setNewNote('');
    setSelectedMember(null);
    setMemberSearchQuery('');
        setInvoiceContactName('');
    setInvoiceAddressLine1('');
    setInvoiceAddressLine2('');
    setInvoiceCity('');
    setInvoicePostcode('');
    setInvoiceCountry('');
  };

  // Suppress/unsuppress transaction
  const handleToggleSuppressed = async (tx: Transaction) => {
    const newSuppressed = !tx.suppressed;
    try {
      const response = await authPost('/api/admin/finance/suppress', {
        transactionId: tx.id,
        source: tx.source,
        suppressed: newSuppressed,
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      // Update local state
      setTransactions(prev =>
        prev.map(t =>
          t.id === tx.id && t.source === tx.source
            ? { ...t, suppressed: newSuppressed }
            : t
        )
      );

      // If we're not showing suppressed and we just suppressed it, remove from view
      if (!showSuppressed && newSuppressed) {
        setTransactions(prev => prev.filter(t => !(t.id === tx.id && t.source === tx.source)));
      }
    } catch (err: any) {
      console.error('Failed to toggle suppressed:', err);
      alert(`Error: ${err.message}`);
    }
  };

  // Client-side member search (filters memberApplications prop)
  const memberSearchResults = memberSearchQuery.length >= 2
    ? memberApplications.filter(member => {
        const query = memberSearchQuery.toLowerCase();
        const orgName = (member.organizationName || '').toLowerCase();
        const contactName = (member.primaryContact?.name || member.personalName || '').toLowerCase();
        const email = (member.email || member.primaryContact?.email || '').toLowerCase();
        return orgName.includes(query) || contactName.includes(query) || email.includes(query);
      }).slice(0, 10)
    : [];

  // Show dropdown when we have results and query is long enough
  useEffect(() => {
    if (memberSearchQuery.length >= 2 && memberSearchResults.length > 0) {
      setShowMemberDropdown(true);
    } else if (memberSearchQuery.length < 2) {
      setShowMemberDropdown(false);
    }
  }, [memberSearchQuery, memberSearchResults.length]);

  const selectMember = (member: UnifiedMember) => {
    setSelectedMember(member);
    setInvoiceOrganization(member.organizationName || '');
    setMemberSearchQuery(member.organizationName || '');
    setShowMemberDropdown(false);

    // Populate fields directly from the member data
    const address = (member as any).businessAddress || member.registeredAddress || {};
    const contactName = (member as any).accountAdministrator?.name || member.primaryContact?.name || '';

    setInvoiceContactName(contactName);
    setInvoiceAddressLine1(address.line1 || '');
    setInvoiceAddressLine2(address.line2 || '');
    setInvoiceCity(address.city || '');
    setInvoicePostcode(address.postcode || '');
    setInvoiceCountry(address.country || '');
    setInvoiceVatNumber((member as any).vatNumber || '');
  };

  const clearSelectedMember = () => {
    setSelectedMember(null);
    setMemberSearchQuery('');
    setInvoiceOrganization('');
    setInvoiceContactName('');
    setInvoiceAddressLine1('');
    setInvoiceAddressLine2('');
    setInvoiceCity('');
    setInvoicePostcode('');
    setInvoiceCountry('');
    setInvoiceVatNumber('');
    setInvoiceNumber('');
  };

  const handleGeneratePaidInvoice = async () => {
    if (!selectedTransaction || !invoiceOrganization.trim()) return;
    if (invoiceLineItems.length === 0 || invoiceLineItems.every(item => !item.description.trim())) return;

    setGeneratingInvoice(true);
    try {
      const response = await authPost('/api/admin/finance/generate-paid-invoice', {
        transactionId: selectedTransaction.id,
        source: selectedTransaction.source,
        organizationName: invoiceOrganization,
        lineItems: invoiceLineItems.filter(item => item.description.trim()),
        currency: invoiceCurrency,
        paidAt: selectedTransaction.date,
        paymentMethod: selectedTransaction.source,
        email: selectedMember?.primaryContact?.email || selectedTransaction.email,
        reference: selectedTransaction.reference,
        accountId: selectedMember?.id || null,
        contactName: invoiceContactName,
        address: {
          line1: invoiceAddressLine1,
          line2: invoiceAddressLine2,
          city: invoiceCity,
          postcode: invoicePostcode,
          country: invoiceCountry,
        },
        vatNumber: invoiceVatNumber || undefined,
        invoiceNumber: invoiceNumber || undefined,  // Optional: use existing invoice number
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invoice');
      }

      if (data.pdfBase64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.pdfBase64}`;
        link.download = `${data.invoiceNumber}-PAID.pdf`;
        link.click();
      }

      loadPaymentCrmData(selectedTransaction.id, selectedTransaction.source);
    } catch (err: any) {
      console.error('Failed to generate invoice:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedTransaction || !newNote.trim()) return;

    setSavingNote(true);
    try {
      const response = await authPost('/api/admin/finance/notes', {
        transactionId: selectedTransaction.id,
        source: selectedTransaction.source,
        content: newNote,
        category: noteCategory,
        createdBy: 'admin',
        createdByName: 'Admin',
      });

      const data = await response.json();
      if (data.success) {
        setNewNote('');
        loadPaymentCrmData(selectedTransaction.id, selectedTransaction.source);
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedTransaction || !confirm('Delete this note?')) return;

    try {
      await authDelete(`/api/admin/finance/notes?transactionId=${selectedTransaction.id}&source=${selectedTransaction.source}&noteId=${noteId}`);
      loadPaymentCrmData(selectedTransaction.id, selectedTransaction.source);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Link payment to selected member
  const handleLinkPayment = async () => {
    if (!selectedTransaction || !selectedMember) return;

    setLinkingPayment(true);
    try {
      const response = await authPost('/api/admin/finance/link', {
        transactionId: selectedTransaction.id,
        source: selectedTransaction.source,
        accountId: selectedMember.id,
        accountName: selectedMember.organizationName,
        paymentType: linkPaymentType,
        amount: selectedTransaction.amount,
        currency: selectedTransaction.currency,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to link payment');
      }

      // Update local state
      setTransactions(prev =>
        prev.map(t =>
          t.id === selectedTransaction.id && t.source === selectedTransaction.source
            ? {
                ...t,
                linkedPayment: {
                  id: `${selectedTransaction.source}_${selectedTransaction.id}`,
                  transactionId: selectedTransaction.id,
                  source: selectedTransaction.source,
                  accountId: selectedMember.id,
                  accountName: selectedMember.organizationName || '',
                  paymentType: linkPaymentType,
                  amount: selectedTransaction.amount,
                  currency: selectedTransaction.currency,
                  linkedAt: new Date().toISOString(),
                  linkedBy: 'admin',
                  linkedByName: 'Admin',
                },
              }
            : t
        )
      );

      // Update selected transaction
      setSelectedTransaction({
        ...selectedTransaction,
        linkedPayment: {
          id: `${selectedTransaction.source}_${selectedTransaction.id}`,
          transactionId: selectedTransaction.id,
          source: selectedTransaction.source,
          accountId: selectedMember.id,
          accountName: selectedMember.organizationName || '',
          paymentType: linkPaymentType,
          amount: selectedTransaction.amount,
          currency: selectedTransaction.currency,
          linkedAt: new Date().toISOString(),
          linkedBy: 'admin',
          linkedByName: 'Admin',
        },
      });

      loadPaymentCrmData(selectedTransaction.id, selectedTransaction.source);
    } catch (err: any) {
      console.error('Failed to link payment:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLinkingPayment(false);
    }
  };

  // Unlink payment from member
  const handleUnlinkPayment = async () => {
    if (!selectedTransaction || !confirm('Unlink this payment from the member?')) return;

    setLinkingPayment(true);
    try {
      const response = await authDelete(
        `/api/admin/finance/link?transactionId=${selectedTransaction.id}&source=${selectedTransaction.source}`
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlink payment');
      }

      // Update local state
      setTransactions(prev =>
        prev.map(t =>
          t.id === selectedTransaction.id && t.source === selectedTransaction.source
            ? { ...t, linkedPayment: undefined }
            : t
        )
      );

      // Update selected transaction
      setSelectedTransaction({
        ...selectedTransaction,
        linkedPayment: undefined,
      });

      loadPaymentCrmData(selectedTransaction.id, selectedTransaction.source);
    } catch (err: any) {
      console.error('Failed to unlink payment:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLinkingPayment(false);
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
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      invoice_generated: '📄',
      note_added: '📝',
      matched_to_member: '🔗',
      manual_entry: '✏️',
      suppressed: '🚫',
      unsuppressed: '✅',
    };
    return icons[type] || '•';
  };

  // Filter and sort transactions
  const filteredByLink = linkFilter === 'all'
    ? transactions
    : linkFilter === 'linked'
    ? transactions.filter(t => t.linkedPayment)
    : transactions.filter(t => !t.linkedPayment);

  const sortedTransactions = [...filteredByLink].sort((a, b) => {
    if (sortField === 'date') {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDirection === 'asc' ? diff : -diff;
    } else {
      const diff = a.amountEur - b.amountEur;
      return sortDirection === 'asc' ? diff : -diff;
    }
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Payment matching helpers (must be before early returns)
  const getPaymentMatch = useCallback((tx: Transaction): PaymentMatch => {
    return matchPayment(tx.amountEur);
  }, []);

  const getMatchBadgeColor = (confidence: PaymentMatch['confidence']) => {
    switch (confidence) {
      case 'exact': return 'bg-green-100 text-green-800';
      case 'likely': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading payments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800 font-medium">Error loading payments</div>
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

  const modalTabs: { id: ModalTab; label: string; count?: number }[] = [
    { id: 'details', label: 'Details' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'timeline', label: 'Timeline', count: activities.length },
    { id: 'notes', label: 'Notes', count: notes.length },
  ];

  const suppressedCount = transactions.filter(t => t.suppressed).length;

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm font-medium text-blue-800">Finance Management</div>
        <p className="text-sm text-blue-700 mt-1">
          Generate invoices for payments, add notes, and suppress irrelevant transactions (test payments, duplicates, etc.).
        </p>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-lg font-semibold">Manage Transactions</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">All Time</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="180">Last 6 Months</option>
                <option value="365">Last Year</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as FilterSource)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">All Sources</option>
                <option value="stripe">Stripe Only</option>
                <option value="wise">Wise Only</option>
              </select>
              <select
                value={linkFilter}
                onChange={(e) => setLinkFilter(e.target.value as LinkFilter)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="all">All Status</option>
                <option value="linked">Linked</option>
                <option value="unlinked">Unlinked</option>
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
              <button
                onClick={loadData}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  Date {sortField === 'date' && (sortDirection === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  Amount {sortField === 'amount' && (sortDirection === 'desc' ? '↓' : '↑')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Linked</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((tx) => (
                  <tr
                    key={`${tx.source}-${tx.id}`}
                    className={`hover:bg-gray-50 ${tx.suppressed ? 'opacity-50 bg-gray-100' : ''}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          tx.source === 'stripe'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {tx.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(tx.amount, tx.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {tx.senderName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={tx.reference}>
                      {tx.reference || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const match = getPaymentMatch(tx);
                        return (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getMatchBadgeColor(match.confidence)}`}
                            title={match.suggestions.length > 0 ? match.suggestions.map(s => s.description).join(', ') : 'No match found'}
                          >
                            {formatMatchSummary(match)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tx.linkedPayment ? (
                        <span
                          className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800"
                          title={`${tx.linkedPayment.paymentType} - ${tx.linkedPayment.accountName}`}
                        >
                          {tx.linkedPayment.paymentType === 'membership' ? '🔗 Membership' : '🔗 Rendezvous'}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-500">
                          Unlinked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openTransactionModal(tx)}
                          className="text-fase-navy hover:text-fase-navy/80 text-sm font-medium"
                        >
                          Manage
                        </button>
                        <button
                          onClick={() => handleToggleSuppressed(tx)}
                          className={`text-sm ${tx.suppressed ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-red-600'}`}
                          title={tx.suppressed ? 'Unsuppress' : 'Suppress'}
                        >
                          {tx.suppressed ? '✓ Show' : '✕ Hide'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Management Modal */}
      {selectedTransaction && (
        <Modal
          isOpen={!!selectedTransaction}
          onClose={closeModal}
          title={`Manage: ${formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}`}
          maxWidth="4xl"
        >
          <div className="h-[600px] flex flex-col">
            {/* Summary Header */}
            <div className="bg-gradient-to-r from-fase-navy to-fase-navy/90 text-white p-4 rounded-lg mb-4 flex-shrink-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedTransaction.senderName || 'Unknown Sender'}
                  </h3>
                  <div className="text-sm text-gray-200">
                    {selectedTransaction.email && <span>{selectedTransaction.email}</span>}
                    {selectedTransaction.reference && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Ref: {selectedTransaction.reference}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedTransaction.suppressed && (
                    <span className="px-2 py-1 text-xs bg-red-500 text-white rounded">
                      Suppressed
                    </span>
                  )}
                  <span
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                      selectedTransaction.source === 'stripe'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedTransaction.source}
                  </span>
                  <span className="text-lg font-bold">
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 flex-shrink-0">
              <nav className="flex space-x-4">
                {modalTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      modalTab === tab.id
                        ? 'border-fase-navy text-fase-navy'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {/* DETAILS TAB */}
              {modalTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Transaction ID</div>
                      <div className="font-mono text-sm">{selectedTransaction.id}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Date</div>
                      <div>{formatDateTime(selectedTransaction.date)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Amount</div>
                      <div className="font-bold">
                        {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                        {selectedTransaction.currency !== 'EUR' && (
                          <span className="text-sm text-gray-500 font-normal ml-2">
                            (~{formatCurrency(selectedTransaction.amountEur, 'EUR')})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500">Source</div>
                      <div className="capitalize">{selectedTransaction.source}</div>
                    </div>
                  </div>

                  {/* Link to Member Section */}
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium text-gray-700 mb-3">Link to Member</div>

                    {selectedTransaction.linkedPayment ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-blue-900">
                              {selectedTransaction.linkedPayment.accountName}
                            </div>
                            <div className="text-sm text-blue-700">
                              {selectedTransaction.linkedPayment.paymentType === 'membership' ? 'FASE Membership' : 'MGA Rendezvous'}
                              {selectedTransaction.linkedPayment.linkedAt && (
                                <span className="text-blue-500 ml-2">
                                  • Linked {formatDateTime(selectedTransaction.linkedPayment.linkedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={handleUnlinkPayment}
                            disabled={linkingPayment}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            {linkingPayment ? 'Unlinking...' : 'Unlink'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Member Search */}
                        <div className="relative">
                          {selectedMember ? (
                            <div className="flex items-center justify-between border border-green-300 bg-green-50 rounded-lg p-3">
                              <div>
                                <div className="font-medium text-gray-900">{selectedMember.organizationName}</div>
                                <div className="text-sm text-gray-500">
                                  {selectedMember.organizationType} • {selectedMember.primaryContact?.email || 'No email'}
                                </div>
                              </div>
                              <button
                                onClick={clearSelectedMember}
                                className="text-gray-400 hover:text-red-500 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                onFocus={() => memberSearchResults.length > 0 && setShowMemberDropdown(true)}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                                placeholder="Search by organization name, email, or contact..."
                              />
                              {showMemberDropdown && memberSearchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {memberSearchResults.map((member) => (
                                    <button
                                      key={member.id}
                                      onClick={() => selectMember(member)}
                                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="font-medium text-gray-900">{member.organizationName}</div>
                                      <div className="text-sm text-gray-500">
                                        <span className={`inline-flex px-1.5 py-0.5 text-xs rounded mr-2 ${
                                          member.organizationType === 'MGA' ? 'bg-blue-100 text-blue-700' :
                                          member.organizationType === 'carrier' ? 'bg-purple-100 text-purple-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}>
                                          {member.organizationType}
                                        </span>
                                        {member.primaryContact?.email || member.primaryContact?.name || 'No contact'}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Payment Type Selection */}
                        {selectedMember && (
                          <div className="flex items-center gap-4">
                            <label className="text-sm text-gray-600">Payment for:</label>
                            <div className="flex gap-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="paymentType"
                                  value="membership"
                                  checked={linkPaymentType === 'membership'}
                                  onChange={() => setLinkPaymentType('membership')}
                                  className="text-fase-navy focus:ring-fase-navy"
                                />
                                <span className="text-sm">Membership</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="paymentType"
                                  value="rendezvous"
                                  checked={linkPaymentType === 'rendezvous'}
                                  onChange={() => setLinkPaymentType('rendezvous')}
                                  className="text-fase-navy focus:ring-fase-navy"
                                />
                                <span className="text-sm">Rendezvous</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Link Button */}
                        {selectedMember && (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={handleLinkPayment}
                            disabled={linkingPayment}
                            className="w-full"
                          >
                            {linkingPayment ? 'Linking...' : `Link Payment to ${selectedMember.organizationName}`}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Suppress/Unsuppress button */}
                  <div className="border-t pt-4">
                    <button
                      onClick={() => {
                        handleToggleSuppressed(selectedTransaction);
                        setSelectedTransaction({ ...selectedTransaction, suppressed: !selectedTransaction.suppressed });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        selectedTransaction.suppressed
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {selectedTransaction.suppressed ? '✓ Unsuppress Transaction' : '✕ Suppress Transaction'}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      {selectedTransaction.suppressed
                        ? 'This transaction is hidden from reports. Click to show it again.'
                        : 'Suppress this transaction to hide it from reports (e.g., test payments, duplicates).'}
                    </p>
                  </div>
                </div>
              )}

              {/* INVOICE TAB */}
              {modalTab === 'invoice' && (
                <div className="space-y-4">
                  {/* Payment Suggestions */}
                  {(() => {
                    const match = getPaymentMatch(selectedTransaction);
                    if (match.confidence === 'unknown') return null;

                    return (
                      <div className={`border rounded-lg p-4 ${
                        match.confidence === 'exact' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className={`text-sm font-medium mb-2 ${
                          match.confidence === 'exact' ? 'text-green-800' : 'text-yellow-800'
                        }`}>
                          {match.confidence === 'exact' ? 'Suggested Match' : 'Possible Match'}
                        </div>
                        <div className="space-y-2">
                          {match.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                if (suggestion.lineItems) {
                                  setInvoiceLineItems(suggestion.lineItems);
                                }
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                match.confidence === 'exact'
                                  ? 'border-green-300 hover:bg-green-100 bg-white'
                                  : 'border-yellow-300 hover:bg-yellow-100 bg-white'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-gray-900">{suggestion.description}</div>
                                  {suggestion.details && (
                                    <div className="text-xs text-gray-500 mt-0.5">{suggestion.details}</div>
                                  )}
                                </div>
                                <div className="text-sm font-medium text-gray-700">
                                  €{suggestion.amount.toLocaleString()}
                                </div>
                              </div>
                              {suggestion.lineItems && (
                                <div className="text-xs text-fase-navy mt-1">Click to fill line items →</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-800 mb-2">Generate PAID Invoice</div>
                    <p className="text-sm text-blue-700">
                      Create a payment confirmation invoice for this transaction.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Member Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Member *
                      </label>
                      <div className="relative">
                        {selectedMember ? (
                          <div className="flex items-center justify-between border border-green-300 bg-green-50 rounded-lg p-3">
                            <div>
                              <div className="font-medium text-gray-900">{selectedMember.organizationName}</div>
                              <div className="text-sm text-gray-500">
                                {selectedMember.organizationType} • {selectedMember.primaryContact?.email || 'No email'}
                              </div>
                            </div>
                            <button
                              onClick={clearSelectedMember}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={memberSearchQuery}
                              onChange={(e) => setMemberSearchQuery(e.target.value)}
                              onFocus={() => memberSearchResults.length > 0 && setShowMemberDropdown(true)}
                              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                              placeholder="Search by organization name, email, or contact..."
                            />
                            {showMemberDropdown && memberSearchResults.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {memberSearchResults.map((member) => (
                                  <button
                                    key={member.id}
                                    onClick={() => selectMember(member)}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-gray-900">{member.organizationName}</div>
                                    <div className="text-sm text-gray-500">
                                      <span className={`inline-flex px-1.5 py-0.5 text-xs rounded mr-2 ${
                                        member.organizationType === 'MGA' ? 'bg-blue-100 text-blue-700' :
                                        member.organizationType === 'carrier' ? 'bg-purple-100 text-purple-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {member.organizationType}
                                      </span>
                                      {member.primaryContact?.email || member.primaryContact?.name || 'No contact'}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bill To Section */}
                    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="text-sm font-medium text-gray-700 border-b pb-2">Bill To</div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Organization Name *</label>
                        <input
                          type="text"
                          value={invoiceOrganization}
                          onChange={(e) => setInvoiceOrganization(e.target.value)}
                          className="w-full border border-gray-300 rounded p-2 text-sm"
                          placeholder="Organization name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Contact Name</label>
                          <input
                            type="text"
                            value={invoiceContactName}
                            onChange={(e) => setInvoiceContactName(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Country</label>
                          <input
                            type="text"
                            value={invoiceCountry}
                            onChange={(e) => setInvoiceCountry(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Address</label>
                        <input
                          type="text"
                          value={invoiceAddressLine1}
                          onChange={(e) => setInvoiceAddressLine1(e.target.value)}
                          className="w-full border border-gray-300 rounded p-2 text-sm mb-2"
                          placeholder="Line 1"
                        />
                        <input
                          type="text"
                          value={invoiceAddressLine2}
                          onChange={(e) => setInvoiceAddressLine2(e.target.value)}
                          className="w-full border border-gray-300 rounded p-2 text-sm"
                          placeholder="Line 2 (optional)"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">City</label>
                          <input
                            type="text"
                            value={invoiceCity}
                            onChange={(e) => setInvoiceCity(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Postcode</label>
                          <input
                            type="text"
                            value={invoicePostcode}
                            onChange={(e) => setInvoicePostcode(e.target.value)}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">VAT Number (optional)</label>
                        <input
                          type="text"
                          value={invoiceVatNumber}
                          onChange={(e) => setInvoiceVatNumber(e.target.value)}
                          className="w-full border border-gray-300 rounded p-2 text-sm"
                          placeholder="e.g. GB123456789"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Invoice Number (optional)</label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="w-full border border-gray-300 rounded p-2 text-sm"
                          placeholder="Leave blank to auto-generate, or enter existing invoice # to create revision"
                        />
                      </div>
                    </div>

                    {/* Line Items */}
                    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="text-sm font-medium text-gray-700">Line Items</div>
                        <div>
                          <label className="text-xs text-gray-500 mr-2">Currency:</label>
                          <select
                            value={invoiceCurrency}
                            onChange={(e) => setInvoiceCurrency(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                      </div>

                      {invoiceLineItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-6">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const newItems = [...invoiceLineItems];
                                newItems[index].description = e.target.value;
                                setInvoiceLineItems(newItems);
                              }}
                              className="w-full border border-gray-300 rounded p-2 text-sm"
                              placeholder="Description"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...invoiceLineItems];
                                newItems[index].quantity = parseInt(e.target.value) || 1;
                                setInvoiceLineItems(newItems);
                              }}
                              className="w-full border border-gray-300 rounded p-2 text-sm text-center"
                              min="1"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newItems = [...invoiceLineItems];
                                newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                                setInvoiceLineItems(newItems);
                              }}
                              className="w-full border border-gray-300 rounded p-2 text-sm text-right"
                              step="0.01"
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            {invoiceLineItems.length > 1 && (
                              <button
                                onClick={() => setInvoiceLineItems(invoiceLineItems.filter((_, i) => i !== index))}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => setInvoiceLineItems([...invoiceLineItems, { description: '', quantity: 1, unitPrice: 0 }])}
                        className="text-sm text-fase-navy hover:text-fase-navy/80 font-medium"
                      >
                        + Add Line Item
                      </button>

                      <div className="border-t pt-3 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total:</span>
                        <span className="text-lg font-bold text-fase-navy">
                          {invoiceCurrency === 'EUR' ? '€' : invoiceCurrency === 'GBP' ? '£' : '$'}
                          {invoiceLineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      onClick={handleGeneratePaidInvoice}
                      disabled={!invoiceOrganization.trim() || generatingInvoice || invoiceLineItems.every(item => !item.description.trim())}
                      className="w-full"
                    >
                      {generatingInvoice ? 'Generating...' : 'Generate & Download PAID Invoice'}
                    </Button>
                  </div>
                </div>
              )}

              {/* TIMELINE TAB */}
              {modalTab === 'timeline' && (
                <div className="space-y-4">
                  {loadingCrm ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fase-navy mx-auto"></div>
                    </div>
                  ) : activities.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No activity recorded yet</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      {activities.map((activity) => (
                        <div key={activity.id} className="relative pl-10 pb-4">
                          <div className="absolute left-2 w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-xs">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="font-medium text-gray-900">{activity.title}</div>
                              <div className="text-xs text-gray-500">{formatDateTime(activity.createdAt)}</div>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              by {activity.performedByName || 'System'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* NOTES TAB */}
              {modalTab === 'notes' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-fase-navy focus:border-transparent resize-none"
                      rows={3}
                    />
                    <div className="flex justify-between items-center mt-3">
                      <select
                        value={noteCategory}
                        onChange={(e) => setNoteCategory(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-1 text-sm"
                      >
                        <option value="general">General</option>
                        <option value="payment">Payment</option>
                        <option value="support">Support</option>
                        <option value="followup">Follow-up</option>
                      </select>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || savingNote}
                      >
                        {savingNote ? 'Saving...' : 'Add Note'}
                      </Button>
                    </div>
                  </div>

                  {loadingCrm ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fase-navy mx-auto"></div>
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No notes yet</p>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className={`bg-white border rounded-lg p-4 ${
                            note.isPinned ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span>{note.createdByName}</span>
                                <span>•</span>
                                <span>{formatDateTime(note.createdAt)}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full ${
                                    note.category === 'payment'
                                      ? 'bg-green-100 text-green-700'
                                      : note.category === 'support'
                                      ? 'bg-blue-100 text-blue-700'
                                      : note.category === 'followup'
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {note.category}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 ml-4"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
