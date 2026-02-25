'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';

interface Transaction {
  id: string;
  source: 'stripe' | 'wise';
  date: string;
  amount: number;
  currency: string;
  amountEur: number;
  reference: string;
  senderName?: string;
  email?: string;
  customerId?: string;
  description?: string;
}

interface PaymentActivity {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  performedBy: string;
  performedByName: string;
}

interface PaymentNote {
  id: string;
  content: string;
  category: string;
  createdAt: string;
  createdByName: string;
  isPinned?: boolean;
}

interface MemberSearchResult {
  id: string;
  organizationName: string;
  organizationType: string;
  status: string;
  primaryContact?: {
    name?: string;
    email?: string;
  };
}

type FilterSource = 'all' | 'stripe' | 'wise';
type DateRange = 'all' | '30' | '90' | '180' | '365';
type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';
type ModalTab = 'details' | 'invoice' | 'timeline' | 'notes';

export default function FinanceTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sourceFilter, setSourceFilter] = useState<FilterSource>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // API status
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [wiseConfigured, setWiseConfigured] = useState(false);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  // Modal state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>('details');
  const [activities, setActivities] = useState<PaymentActivity[]>([]);
  const [notes, setNotes] = useState<PaymentNote[]>([]);
  const [loadingCrm, setLoadingCrm] = useState(false);

  // Invoice generation state
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceOrganization, setInvoiceOrganization] = useState('');
  const [invoiceDescription, setInvoiceDescription] = useState('FASE Annual Membership');
  const [invoiceCurrency, setInvoiceCurrency] = useState('EUR');

  // Member search state
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<MemberSearchResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Note form state
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState('general');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    loadData();
  }, [sourceFilter, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/admin/finance/transactions?source=${sourceFilter}`;
      if (dateRange !== 'all') {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - parseInt(dateRange));
        url += `&from=${fromDate.toISOString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load transactions');
      }

      setTransactions(data.transactions || []);
      setStripeConfigured(data.summary?.stripeCount !== undefined);
      setApiErrors(data.errors || []);
      setWiseConfigured(data.summary?.wiseCount !== undefined);
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
        fetch(`/api/admin/finance/activities?transactionId=${transactionId}&source=${source}`),
        fetch(`/api/admin/finance/notes?transactionId=${transactionId}&source=${source}`),
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
    setInvoiceDescription('FASE Annual Membership');
    setInvoiceCurrency(tx.currency);
    setSelectedMember(null);
    setMemberSearchQuery('');
    setMemberSearchResults([]);
    loadPaymentCrmData(tx.id, tx.source);
  };

  const closeModal = () => {
    setSelectedTransaction(null);
    setActivities([]);
    setNotes([]);
    setNewNote('');
    setSelectedMember(null);
    setMemberSearchQuery('');
    setMemberSearchResults([]);
  };

  // Member search function
  const searchMembers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setMemberSearchResults([]);
      return;
    }

    setSearchingMembers(true);
    try {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();

      if (data.success && data.results) {
        setMemberSearchResults(data.results);
        setShowMemberDropdown(true);
      }
    } catch (err) {
      console.error('Failed to search members:', err);
    } finally {
      setSearchingMembers(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (memberSearchQuery.length >= 2) {
        searchMembers(memberSearchQuery);
      } else {
        setMemberSearchResults([]);
        setShowMemberDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearchQuery, searchMembers]);

  const selectMember = (member: MemberSearchResult) => {
    setSelectedMember(member);
    setInvoiceOrganization(member.organizationName);
    setMemberSearchQuery(member.organizationName);
    setShowMemberDropdown(false);
  };

  const clearSelectedMember = () => {
    setSelectedMember(null);
    setMemberSearchQuery('');
    setInvoiceOrganization('');
  };

  const handleGeneratePaidInvoice = async () => {
    if (!selectedTransaction || !invoiceOrganization.trim()) return;

    setGeneratingInvoice(true);
    try {
      const response = await fetch('/api/admin/finance/generate-paid-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: selectedTransaction.id,
          source: selectedTransaction.source,
          organizationName: invoiceOrganization,
          description: invoiceDescription,
          amount: selectedTransaction.amount,
          currency: invoiceCurrency,
          paidAt: selectedTransaction.date,
          paymentMethod: selectedTransaction.source,
          email: selectedMember?.primaryContact?.email || selectedTransaction.email,
          reference: selectedTransaction.reference,
          // Include accountId if a member was selected
          accountId: selectedMember?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invoice');
      }

      // Download the PDF
      if (data.pdfBase64) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.pdfBase64}`;
        link.download = `${data.invoiceNumber}-PAID.pdf`;
        link.click();
      }

      // Reload CRM data to show new activity
      loadPaymentCrmData(selectedTransaction.id, selectedTransaction.source);

      alert(`Invoice ${data.invoiceNumber} generated successfully!`);
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
      const response = await fetch('/api/admin/finance/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: selectedTransaction.id,
          source: selectedTransaction.source,
          content: newNote,
          category: noteCategory,
          createdBy: 'admin',
          createdByName: 'Admin',
        }),
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
      await fetch(`/api/admin/finance/notes?transactionId=${selectedTransaction.id}&source=${selectedTransaction.source}&noteId=${noteId}`, {
        method: 'DELETE',
      });
      loadPaymentCrmData(selectedTransaction.id, selectedTransaction.source);
    } catch (err) {
      console.error('Failed to delete note:', err);
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
    };
    return icons[type] || '•';
  };

  // Calculate totals (in EUR)
  const stripeTotal = transactions
    .filter((t) => t.source === 'stripe')
    .reduce((sum, t) => sum + t.amountEur, 0);
  const wiseTotal = transactions
    .filter((t) => t.source === 'wise')
    .reduce((sum, t) => sum + t.amountEur, 0);

  // Sort transactions
  const sortedTransactions = [...transactions].sort((a, b) => {
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">
            Total {dateRange === 'all' ? '(All Time)' : `(Last ${dateRange} Days)`}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stripeTotal + wiseTotal)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {transactions.length} payments
          </div>
        </div>
        <div className="bg-white border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Stripe</span>
            {!stripeConfigured && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                Not configured
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(stripeTotal)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {transactions.filter((t) => t.source === 'stripe').length} payments
          </div>
        </div>
        <div className="bg-white border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Wise</span>
            {!wiseConfigured && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                Not configured
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(wiseTotal)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {transactions.filter((t) => t.source === 'wise').length} payments
          </div>
        </div>
      </div>

      {/* API Errors */}
      {apiErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-800 mb-2">API Errors</div>
          <div className="text-sm text-red-700 space-y-1">
            {apiErrors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
          </div>
        </div>
      )}

      {/* API Setup Info */}
      {(!stripeConfigured || !wiseConfigured) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-800 mb-2">API Configuration</div>
          <div className="text-sm text-yellow-700 space-y-1">
            {!stripeConfigured && (
              <div>
                <strong>Stripe:</strong> Set <code className="bg-yellow-100 px-1 rounded">STRIPE_SECRET_KEY</code> in environment variables
              </div>
            )}
            {!wiseConfigured && (
              <div>
                <strong>Wise:</strong> Set <code className="bg-yellow-100 px-1 rounded">WISE_API_KEY</code> and <code className="bg-yellow-100 px-1 rounded">WISE_PROFILE_ID</code> in environment variables
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Incoming Payments</h3>
            <div className="flex gap-2">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((tx) => (
                  <tr key={`${tx.source}-${tx.id}`} className="hover:bg-gray-50">
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
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {tx.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={tx.reference}>
                      {tx.reference || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => openTransactionModal(tx)}
                        className="text-fase-navy hover:text-fase-navy/80 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <Modal
          isOpen={!!selectedTransaction}
          onClose={closeModal}
          title={`Payment: ${formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}`}
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
                    {selectedTransaction.senderName && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Sender Name</div>
                        <div>{selectedTransaction.senderName}</div>
                      </div>
                    )}
                    {selectedTransaction.email && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500">Email</div>
                        <div>{selectedTransaction.email}</div>
                      </div>
                    )}
                    {selectedTransaction.customerId && (
                      <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                        <div className="text-sm text-gray-500">Customer ID</div>
                        <div className="font-mono text-sm">{selectedTransaction.customerId}</div>
                      </div>
                    )}
                    {selectedTransaction.reference && (
                      <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                        <div className="text-sm text-gray-500">Reference</div>
                        <div>{selectedTransaction.reference}</div>
                      </div>
                    )}
                    {selectedTransaction.description && (
                      <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                        <div className="text-sm text-gray-500">Description</div>
                        <div>{selectedTransaction.description}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* INVOICE TAB */}
              {modalTab === 'invoice' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-800 mb-2">Generate PAID Invoice</div>
                    <p className="text-sm text-blue-700">
                      Create a payment confirmation invoice for this transaction. Search for an existing member or enter organization details manually.
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
                            {searchingMembers && (
                              <div className="absolute right-3 top-2.5">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-fase-navy"></div>
                              </div>
                            )}
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
                      <p className="text-xs text-gray-500 mt-1">
                        Search for a member to auto-fill their details, or enter manually below
                      </p>
                    </div>

                    {/* Manual organization name (fallback) */}
                    {!selectedMember && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Or Enter Organization Name Manually
                        </label>
                        <input
                          type="text"
                          value={invoiceOrganization}
                          onChange={(e) => setInvoiceOrganization(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                          placeholder="Enter organization name"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={invoiceDescription}
                        onChange={(e) => setInvoiceDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        placeholder="e.g., FASE Annual Membership"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Invoice Currency
                      </label>
                      <select
                        value={invoiceCurrency}
                        onChange={(e) => setInvoiceCurrency(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      >
                        <option value="EUR">EUR (Euro)</option>
                        <option value="GBP">GBP (British Pound)</option>
                        <option value="USD">USD (US Dollar)</option>
                      </select>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 mb-2">Invoice Preview</div>
                      <div className="space-y-1 text-sm">
                        <div><strong>Organization:</strong> {invoiceOrganization || '(not set)'}</div>
                        {selectedMember && (
                          <>
                            <div><strong>Member Type:</strong> {selectedMember.organizationType}</div>
                            {selectedMember.primaryContact?.email && (
                              <div><strong>Email:</strong> {selectedMember.primaryContact.email}</div>
                            )}
                          </>
                        )}
                        <div><strong>Amount:</strong> {formatCurrency(selectedTransaction.amount, invoiceCurrency)}</div>
                        <div><strong>Payment Date:</strong> {formatDate(selectedTransaction.date)}</div>
                        <div><strong>Payment Method:</strong> {selectedTransaction.source}</div>
                        <div><strong>Status:</strong> <span className="text-green-600 font-medium">PAID</span></div>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      onClick={handleGeneratePaidInvoice}
                      disabled={!invoiceOrganization.trim() || generatingInvoice}
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
                  {/* Add Note Form */}
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

                  {/* Notes List */}
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
