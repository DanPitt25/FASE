'use client';

import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  source: 'stripe' | 'wise';
  date: string;
  amount: number;
  currency: string;
  amountEur: number;
  reference: string;
  senderName?: string;
}

type FilterSource = 'all' | 'stripe' | 'wise';
type DateRange = 'all' | '30' | '90' | '180' | '365';
type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
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
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={tx.reference}>
                      {tx.reference || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
