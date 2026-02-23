'use client';

import { useState, useEffect } from 'react';

interface StorageInvoice {
  id: string;
  invoiceNumber: string;
  organizationName: string;
  organizationSlug: string;
  url: string;
  uploadedAt: string | null;
  size: number;
}

interface LineItem {
  id: string;
  description: string;
  amount: string;
  isDiscount: boolean;
}

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
  lineItems: LineItem[];
  paymentCurrency: string; // Currency for payment (EUR base, convert to GBP/USD)
  locale: string;
}

const createLineItem = (description = '', amount = '', isDiscount = false): LineItem => ({
  id: Math.random().toString(36).substr(2, 9),
  description,
  amount,
  isDiscount
});

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
  lineItems: [createLineItem('FASE Annual Membership', '')],
  paymentCurrency: 'EUR',
  locale: 'en'
};

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState<StorageInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const response = await fetch('/api/admin/storage-invoices');
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load invoices');
      }
      setInvoices(data.invoices);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total from line items
  const calculateTotal = () => {
    return formData.lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + (item.isDiscount ? -Math.abs(amount) : amount);
    }, 0);
  };

  const addLineItem = (isDiscount = false) => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, createLineItem('', '', isDiscount)]
    });
  };

  const removeLineItem = (id: string) => {
    if (formData.lineItems.length <= 1) return;
    setFormData({
      ...formData,
      lineItems: formData.lineItems.filter(item => item.id !== id)
    });
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | boolean) => {
    setFormData({
      ...formData,
      lineItems: formData.lineItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    });
  };

  const handleGenerateInvoice = async () => {
    if (!formData.organizationName.trim()) {
      alert('Organization name is required');
      return;
    }

    const total = calculateTotal();
    if (total <= 0) {
      alert('Total amount must be greater than zero');
      return;
    }

    // Check that at least one line item has description and amount
    const validItems = formData.lineItems.filter(item =>
      item.description.trim() && (parseFloat(item.amount) || 0) !== 0
    );
    if (validItems.length === 0) {
      alert('At least one line item with description and amount is required');
      return;
    }

    setGenerating(true);
    setGeneratedInvoice(null);

    try {
      // Convert line items to the format expected by the API
      const lineItemsPayload = formData.lineItems
        .filter(item => item.description.trim() && (parseFloat(item.amount) || 0) !== 0)
        .map(item => ({
          description: item.description,
          amount: item.isDiscount ? -Math.abs(parseFloat(item.amount) || 0) : parseFloat(item.amount) || 0,
          isDiscount: item.isDiscount
        }));

      const payload = {
        recipientName: formData.recipientName,
        email: formData.recipientEmail,
        organizationName: formData.organizationName,
        fullName: formData.recipientName,
        address: formData.address,
        lineItems: lineItemsPayload,
        paymentCurrency: formData.paymentCurrency,
        locale: formData.locale
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        <button onClick={loadInvoices} className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Invoice PDFs ({invoices.length})</h2>
        <div className="flex items-center gap-4">
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

                  {/* Line Items */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-gray-700">Line Items (EUR)</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => addLineItem(false)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          + Add Item
                        </button>
                        <button
                          type="button"
                          onClick={() => addLineItem(true)}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          + Add Discount
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {formData.lineItems.map((item, index) => (
                        <div key={item.id} className={`flex gap-2 items-center p-2 rounded ${item.isDiscount ? 'bg-green-50' : 'bg-gray-50'}`}>
                          <div className="flex-grow">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              placeholder={item.isDiscount ? "Discount description" : "Item description"}
                            />
                          </div>
                          <div className="w-28">
                            <div className="relative">
                              <span className={`absolute left-3 top-2 ${item.isDiscount ? 'text-green-600' : 'text-gray-500'}`}>
                                {item.isDiscount ? '-€' : '€'}
                              </span>
                              <input
                                type="number"
                                value={item.amount}
                                onChange={(e) => updateLineItem(item.id, 'amount', e.target.value)}
                                className={`w-full pl-8 pr-3 py-2 border rounded text-sm ${item.isDiscount ? 'border-green-300 text-green-700' : 'border-gray-300'}`}
                                placeholder="0"
                              />
                            </div>
                          </div>
                          {formData.lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLineItem(item.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Total Display */}
                    <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total (EUR):</span>
                      <span className={`text-lg font-bold ${calculateTotal() > 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        €{calculateTotal().toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Settings Row */}
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Invoice Language</label>
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
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Payment Currency</label>
                        <select
                          value={formData.paymentCurrency}
                          onChange={(e) => setFormData({ ...formData, paymentCurrency: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="EUR">EUR (no conversion)</option>
                          <option value="GBP">GBP (convert to British Pounds)</option>
                          <option value="USD">USD (convert to US Dollars)</option>
                        </select>
                        {formData.paymentCurrency !== 'EUR' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Invoice shows EUR base + converted {formData.paymentCurrency} total
                          </p>
                        )}
                      </div>
                    </div>
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

      {invoices.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <div className="text-gray-600">No invoice PDFs found in storage</div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-3 py-4 text-sm text-gray-900">{invoice.organizationName}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.uploadedAt)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{formatSize(invoice.size)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <a
                        href={invoice.url}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
