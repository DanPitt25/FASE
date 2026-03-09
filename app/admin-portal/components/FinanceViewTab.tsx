'use client';

import { useState, useEffect } from 'react';
import Modal from '../../../components/Modal';
import { authFetch } from '@/lib/auth-fetch';
import type {
  Transaction,
  FinanceFilterSource,
  FinanceDateRange,
  FinanceSortField,
  SortDirection,
} from '@/lib/admin-types';

type FilterSource = FinanceFilterSource;
type DateRange = FinanceDateRange;
type SortField = FinanceSortField;

export default function FinanceViewTab() {
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

  // Modal state (view-only details)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    loadData();
  }, [sourceFilter, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/admin/finance/transactions?source=${sourceFilter}&hideSuppressed=true`;
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

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date', 'Source', 'Amount', 'Currency', 'Amount (EUR)', 'From', 'Email', 'Reference'];
    const rows = sortedTransactions.map(tx => [
      formatDate(tx.date),
      tx.source,
      tx.amount.toString(),
      tx.currency,
      tx.amountEur.toString(),
      tx.senderName || '',
      tx.email || '',
      tx.reference || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finance-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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

      {/* Payments Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-lg font-semibold">Incoming Payments</h3>
            <div className="flex flex-wrap gap-2">
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
                onClick={handleExport}
                className="px-3 py-1 bg-fase-navy text-white rounded text-sm hover:bg-fase-navy/90"
              >
                Export CSV
              </button>
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
                        onClick={() => setSelectedTransaction(tx)}
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

      {/* View-Only Transaction Detail Modal */}
      {selectedTransaction && (
        <Modal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          title={`Payment: ${formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Summary Header */}
            <div className="bg-gradient-to-r from-fase-navy to-fase-navy/90 text-white p-4 rounded-lg">
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

            {/* Transaction Details */}
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

            <div className="text-sm text-gray-500 text-center pt-4 border-t">
              To generate invoices or add notes, use the <strong>Finance</strong> tile in the Manage section.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
