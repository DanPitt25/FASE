'use client';

import { useState, useEffect } from 'react';
import { getAllInvoices, updateInvoiceStatus, Invoice } from '../../../lib/firestore';

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingInvoice, setUpdatingInvoice] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const invoiceData = await getAllInvoices();
      setInvoices(invoiceData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (invoiceId: string, newStatus: 'sent' | 'paid' | 'overdue') => {
    try {
      setUpdatingInvoice(invoiceId);
      await updateInvoiceStatus(invoiceId, newStatus);
      
      // Update local state
      setInvoices(invoices.map(invoice => 
        invoice.id === invoiceId 
          ? { ...invoice, status: newStatus }
          : invoice
      ));
    } catch (err: any) {
      console.error('Failed to update invoice status:', err);
      alert('Failed to update invoice status');
    } finally {
      setUpdatingInvoice(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { 'EUR': '€', 'USD': '$', 'GBP': '£' };
    return `${symbols[currency] || currency} ${amount}`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'regular': return 'bg-blue-100 text-blue-800';
      case 'lost_invoice': return 'bg-orange-100 text-orange-800';
      case 'reminder': return 'bg-yellow-100 text-yellow-800';
      case 'followup': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'regular': return 'Regular';
      case 'lost_invoice': return 'Lost Invoice';
      case 'reminder': return 'Reminder';
      case 'followup': return 'Follow-up';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading invoices...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800 font-medium">Error loading invoices</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
        <button 
          onClick={loadInvoices}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Invoice Tracking</h2>
        <button 
          onClick={loadInvoices}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <div className="text-gray-600">No invoices found</div>
          <div className="text-gray-500 text-sm mt-1">
            Invoices will appear here after being sent from the Emails tab or Bank Transfer Invoice page
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PDF
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.sentAt)}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <div className="font-medium">{invoice.recipientName}</div>
                      <div className="text-gray-500">{invoice.recipientEmail}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {invoice.organizationName}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(invoice.type)}`}>
                        {getTypeLabel(invoice.type)}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.pdfGenerated ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-gray-400">✗ No</span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <select
                        value={invoice.status}
                        onChange={(e) => handleStatusUpdate(invoice.id, e.target.value as any)}
                        disabled={updatingInvoice === invoice.id}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                      >
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                      {updatingInvoice === invoice.id && (
                        <div className="inline-block ml-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Total: <span className="font-medium">{invoices.length}</span> invoices
              <span className="mx-2">|</span>
              Sent: <span className="font-medium">{invoices.filter(i => i.status === 'sent').length}</span>
              <span className="mx-2">|</span>
              Paid: <span className="font-medium">{invoices.filter(i => i.status === 'paid').length}</span>
              <span className="mx-2">|</span>
              Overdue: <span className="font-medium">{invoices.filter(i => i.status === 'overdue').length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}