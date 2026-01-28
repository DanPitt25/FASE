'use client';

import { useState, useEffect } from 'react';
import { getAllInvoices, updateInvoiceStatus, Invoice, createInvoiceRecord } from '../../../lib/firestore';

interface CustomInvoiceForm {
  recipientName: string;
  recipientEmail: string;
  organizationName: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    postcode: string;
    country: string;
  };
  totalAmount: string;
  currency: string;
  originalAmount: string;
  discountAmount: string;
  discountReason: string;
  customLineItem: {
    enabled: boolean;
    description: string;
    amount: string;
  };
  locale: string;
}

const initialFormState: CustomInvoiceForm = {
  recipientName: '',
  recipientEmail: '',
  organizationName: '',
  address: {
    line1: '',
    line2: '',
    city: '',
    postcode: '',
    country: ''
  },
  totalAmount: '',
  currency: 'EUR',
  originalAmount: '',
  discountAmount: '',
  discountReason: '',
  customLineItem: {
    enabled: false,
    description: '',
    amount: ''
  },
  locale: 'en'
};

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingInvoice, setUpdatingInvoice] = useState<string | null>(null);
  const [showOnlyWithPdf, setShowOnlyWithPdf] = useState(true);

  // Custom invoice modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CustomInvoiceForm>(initialFormState);
  const [generating, setGenerating] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<{ pdfUrl: string; invoiceNumber: string } | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const invoiceData = await getAllInvoices();
      invoiceData.sort((a, b) => {
        const dateA = a.sentAt?.toDate ? a.sentAt.toDate() : new Date(a.sentAt);
        const dateB = b.sentAt?.toDate ? b.sentAt.toDate() : new Date(b.sentAt);
        return dateB.getTime() - dateA.getTime();
      });
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
      setInvoices(invoices.map(invoice =>
        invoice.id === invoiceId ? { ...invoice, status: newStatus } : invoice
      ));
    } catch (err: any) {
      console.error('Failed to update invoice status:', err);
      alert('Failed to update invoice status');
    } finally {
      setUpdatingInvoice(null);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!formData.organizationName.trim()) {
      alert('Organization name is required');
      return;
    }
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      alert('Valid amount is required');
      return;
    }

    setGenerating(true);
    setGeneratedInvoice(null);

    try {
      const payload = {
        recipientName: formData.recipientName,
        email: formData.recipientEmail,
        organizationName: formData.organizationName,
        fullName: formData.recipientName,
        address: formData.address,
        totalAmount: parseFloat(formData.totalAmount),
        originalAmount: formData.originalAmount ? parseFloat(formData.originalAmount) : parseFloat(formData.totalAmount),
        discountAmount: formData.discountAmount ? parseFloat(formData.discountAmount) : 0,
        discountReason: formData.discountReason,
        currency: formData.currency,
        locale: formData.locale,
        customLineItem: formData.customLineItem.enabled ? {
          enabled: true,
          description: formData.customLineItem.description,
          amount: parseFloat(formData.customLineItem.amount) || 0
        } : null
      };

      const response = await fetch('/api/generate-invoice-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate invoice');
      }

      // Create invoice record in Firestore
      await createInvoiceRecord({
        invoiceNumber: data.invoiceNumber,
        recipientEmail: formData.recipientEmail || '',
        recipientName: formData.recipientName || formData.organizationName,
        organizationName: formData.organizationName,
        amount: parseFloat(formData.totalAmount),
        currency: formData.currency,
        type: 'standalone',
        status: 'sent',
        sentAt: new Date(),
        pdfUrl: data.pdfUrl,
        pdfGenerated: true
      });

      setGeneratedInvoice({
        pdfUrl: data.pdfUrl,
        invoiceNumber: data.invoiceNumber
      });

      loadInvoices();

    } catch (err: any) {
      console.error('Failed to generate invoice:', err);
      alert(err.message || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(initialFormState);
    setGeneratedInvoice(null);
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
    const symbols: Record<string, string> = { 'EUR': '€', 'USD': '$', 'GBP': '£', 'CHF': 'CHF ' };
    return `${symbols[currency] || currency + ' '}${amount}`;
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
      case 'standalone': return 'bg-indigo-100 text-indigo-800';
      case 'reminder': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'regular': return 'Regular';
      case 'standalone': return 'Standalone';
      case 'reminder': return 'Reminder';
      default: return type;
    }
  };

  const filteredInvoices = showOnlyWithPdf ? invoices.filter(i => i.pdfUrl) : invoices;
  const legacyCount = invoices.filter(i => !i.pdfUrl).length;

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
        <button onClick={loadInvoices} className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Invoice Tracking</h2>
        <div className="flex items-center gap-4">
          {legacyCount > 0 && (
            <label className="flex items-center text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyWithPdf}
                onChange={(e) => setShowOnlyWithPdf(e.target.checked)}
                className="mr-2"
              />
              Hide legacy invoices ({legacyCount})
            </label>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Generate Custom Invoice
          </button>
          <button
            onClick={loadInvoices}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Custom Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Generate Custom Invoice</h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {generatedInvoice ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Invoice Generated</h4>
                  <p className="text-gray-600 mb-4">Invoice {generatedInvoice.invoiceNumber}</p>
                  <div className="flex justify-center gap-4">
                    <a
                      href={generatedInvoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Download PDF
                    </a>
                    <button onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Recipient Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                      <input
                        type="text"
                        value={formData.recipientName}
                        onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="John Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                      <input
                        type="email"
                        value={formData.recipientEmail}
                        onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                    <input
                      type="text"
                      value={formData.organizationName}
                      onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="Company Ltd"
                      required
                    />
                  </div>

                  {/* Address */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Address</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={formData.address.line1}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, line1: e.target.value } })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Address Line 1"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={formData.address.line2}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, line2: e.target.value } })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Address Line 2"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={formData.address.city}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={formData.address.postcode}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, postcode: e.target.value } })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Postcode"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={formData.address.country}
                          onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Country"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Amount (EUR)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Total Amount (EUR) *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">€</span>
                          <input
                            type="number"
                            value={formData.totalAmount}
                            onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-sm"
                            placeholder="1500"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Language</label>
                        <select
                          value={formData.locale}
                          onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="en">English</option>
                          <option value="de">German</option>
                          <option value="fr">French</option>
                          <option value="es">Spanish</option>
                          <option value="it">Italian</option>
                          <option value="nl">Dutch</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Currency Conversion */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Currency</h4>
                    <p className="text-xs text-gray-500 mb-2">
                      Invoice will show EUR base amount with converted total for payment
                    </p>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="EUR">EUR (no conversion)</option>
                      <option value="GBP">GBP (British Pounds)</option>
                      <option value="USD">USD (US Dollars)</option>
                    </select>
                  </div>

                  {/* Discount */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Discount (optional)</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Original Amount</label>
                        <input
                          type="number"
                          value={formData.originalAmount}
                          onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="2000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Discount Amount</label>
                        <input
                          type="number"
                          value={formData.discountAmount}
                          onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Discount Reason</label>
                        <input
                          type="text"
                          value={formData.discountReason}
                          onChange={(e) => setFormData({ ...formData, discountReason: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Early bird"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Line Item */}
                  <div className="border-t pt-4">
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.customLineItem.enabled}
                        onChange={(e) => setFormData({
                          ...formData,
                          customLineItem: { ...formData.customLineItem, enabled: e.target.checked }
                        })}
                        className="mr-2"
                      />
                      Add Custom Line Item
                    </label>
                    {formData.customLineItem.enabled && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={formData.customLineItem.description}
                            onChange={(e) => setFormData({
                              ...formData,
                              customLineItem: { ...formData.customLineItem, description: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            placeholder="Description"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={formData.customLineItem.amount}
                            onChange={(e) => setFormData({
                              ...formData,
                              customLineItem: { ...formData.customLineItem, amount: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            placeholder="Amount"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t pt-4 flex justify-end gap-3">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={generating}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {generating ? 'Generating...' : 'Generate Invoice'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {filteredInvoices.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <div className="text-gray-600">
            {invoices.length === 0 ? 'No invoices found' : 'No invoices with PDFs found'}
          </div>
          <div className="text-gray-500 text-sm mt-1">
            {invoices.length === 0
              ? 'Invoices will appear here after being sent from the Emails tab'
              : 'Uncheck "Hide legacy invoices" to see all invoices'}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.sentAt)}</td>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      <div className="font-medium">{invoice.recipientName}</div>
                      <div className="text-gray-500">{invoice.recipientEmail}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900">{invoice.organizationName}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{formatAmount(invoice.amount, invoice.currency)}</td>
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
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800"
                          title="Download PDF"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </a>
                      ) : invoice.pdfGenerated ? (
                        <span className="text-gray-400 text-xs">Legacy</span>
                      ) : (
                        <span className="text-gray-400">-</span>
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
              Showing: <span className="font-medium">{filteredInvoices.length}</span> of {invoices.length} invoices
              <span className="mx-2">|</span>
              Sent: <span className="font-medium">{filteredInvoices.filter(i => i.status === 'sent').length}</span>
              <span className="mx-2">|</span>
              Paid: <span className="font-medium">{filteredInvoices.filter(i => i.status === 'paid').length}</span>
              <span className="mx-2">|</span>
              Overdue: <span className="font-medium">{filteredInvoices.filter(i => i.status === 'overdue').length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
