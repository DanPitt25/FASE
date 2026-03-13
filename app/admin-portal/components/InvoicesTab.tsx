'use client';

/**
 * InvoicesTab - Unified Invoice Generator
 *
 * Supports all invoice types:
 * - Membership invoices (regular and paid)
 * - Rendezvous invoices (regular and paid)
 * - Custom/freeform invoices
 * - Credit notes
 *
 * Can be pre-populated via InvoiceContext when linked from other tabs.
 */

import { useState, useEffect, useMemo } from 'react';
import { authPost } from '@/lib/auth-fetch';
import Button from '@/components/Button';
import {
  useInvoice,
  InvoiceData,
  InvoiceLineItem,
  InvoiceType,
  generateLineItemId,
} from '@/lib/contexts/InvoiceContext';

// ============================================================================
// Constants
// ============================================================================

const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  membership: 'Membership Invoice',
  membership_paid: 'Membership PAID Confirmation',
  rendezvous: 'Rendezvous Invoice',
  rendezvous_paid: 'Rendezvous PAID Confirmation',
  custom: 'Custom Invoice',
  credit_note: 'Credit Note',
};

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
];

const CURRENCIES = [
  { code: 'auto', label: 'Auto (based on country)' },
  { code: 'EUR', label: 'EUR - Wise Belgium' },
  { code: 'GBP', label: 'GBP - Wise UK' },
  { code: 'USD', label: 'USD - Wise US' },
];

const ORG_TYPES = [
  { code: 'mga', label: 'MGA' },
  { code: 'carrier_broker', label: 'Carrier/Broker' },
  { code: 'service_provider', label: 'Service Provider' },
];

// ============================================================================
// Component
// ============================================================================

export default function InvoicesTab() {
  // Context for pre-population
  const { pendingInvoice, clearPendingInvoice, showToast } = useInvoice();

  // Form state
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('custom');
  const [isPaid, setIsPaid] = useState(false);

  // Bill To
  const [organizationName, setOrganizationName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  // Line Items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: generateLineItemId(), description: '', quantity: 1, unitPrice: 0 },
  ]);

  // Settings
  const [currency, setCurrency] = useState<'EUR' | 'GBP' | 'USD' | 'auto'>('EUR');
  const [locale, setLocale] = useState<'en' | 'fr' | 'de' | 'es' | 'it' | 'nl'>('en');

  // Rendezvous-specific
  const [organizationType, setOrganizationType] = useState<'mga' | 'carrier_broker' | 'service_provider'>('mga');
  const [isFaseMember, setIsFaseMember] = useState(false);
  const [isAsaseMember, setIsAsaseMember] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // PAID invoice fields
  const [paidAt, setPaidAt] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  // UI State
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{
    pdfUrl?: string;
    pdfBase64?: string;
    invoiceNumber: string;
    filename?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Handle pending invoice from context
  // ============================================================================

  useEffect(() => {
    if (pendingInvoice) {
      populateFromData(pendingInvoice);
      clearPendingInvoice();
    }
  }, [pendingInvoice, clearPendingInvoice]);

  const populateFromData = (data: InvoiceData) => {
    setInvoiceType(data.type);
    setIsPaid(data.isPaid);

    // Bill To
    setOrganizationName(data.organizationName || '');
    setContactName(data.contactName || '');
    setEmail(data.email || '');
    setAddressLine1(data.address?.line1 || '');
    setAddressLine2(data.address?.line2 || '');
    setCity(data.address?.city || '');
    setCounty(data.address?.county || '');
    setPostcode(data.address?.postcode || '');
    setCountry(data.address?.country || '');
    setVatNumber(data.vatNumber || '');

    // Line items
    if (data.lineItems.length > 0) {
      setLineItems(data.lineItems);
    }

    // Settings
    setCurrency(data.currency || 'EUR');
    setLocale(data.locale || 'en');

    // Rendezvous-specific
    if (data.organizationType) setOrganizationType(data.organizationType);
    setIsFaseMember(data.isFaseMember || false);
    setIsAsaseMember(data.isAsaseMember || false);
    setRegistrationId(data.registrationId || '');
    setInvoiceNumber(data.invoiceNumber || '');

    // PAID fields
    setPaidAt(data.paidAt || '');
    setPaymentMethod(data.paymentMethod || '');
    setPaymentReference(data.paymentReference || '');
  };

  // ============================================================================
  // Calculate totals
  // ============================================================================

  const { subtotal, total } = useMemo(() => {
    const sub = lineItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      return sum + itemTotal;
    }, 0);
    return { subtotal: sub, total: sub };
  }, [lineItems]);

  // ============================================================================
  // Line item management
  // ============================================================================

  const addLineItem = (isDiscount = false) => {
    setLineItems([
      ...lineItems,
      {
        id: generateLineItemId(),
        description: isDiscount ? '' : '',
        quantity: 1,
        unitPrice: 0,
        isDiscount,
      },
    ]);
  };

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  // ============================================================================
  // Reset form
  // ============================================================================

  const resetForm = () => {
    setInvoiceType('custom');
    setIsPaid(false);
    setOrganizationName('');
    setContactName('');
    setEmail('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setCounty('');
    setPostcode('');
    setCountry('');
    setVatNumber('');
    setLineItems([{ id: generateLineItemId(), description: '', quantity: 1, unitPrice: 0 }]);
    setCurrency('EUR');
    setLocale('en');
    setOrganizationType('mga');
    setIsFaseMember(false);
    setIsAsaseMember(false);
    setRegistrationId('');
    setInvoiceNumber('');
    setPaidAt('');
    setPaymentMethod('');
    setPaymentReference('');
    setGeneratedResult(null);
    setError(null);
  };

  // ============================================================================
  // Generate invoice
  // ============================================================================

  const handleGenerate = async () => {
    // Validate
    if (!organizationName.trim()) {
      setError('Organization name is required');
      return;
    }

    const validItems = lineItems.filter(
      (item) => item.description.trim() && item.unitPrice !== 0
    );
    if (validItems.length === 0) {
      setError('At least one line item with description and amount is required');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedResult(null);

    try {
      let endpoint: string;
      let payload: Record<string, any>;

      const isRendezvous = invoiceType === 'rendezvous' || invoiceType === 'rendezvous_paid';

      if (isRendezvous && isPaid) {
        // Rendezvous PAID invoice
        endpoint = '/api/admin/generate-paid-invoice';
        payload = {
          invoiceNumber: invoiceNumber || undefined,
          registrationId: registrationId || undefined,
          companyName: organizationName,
          billingEmail: email,
          address: [addressLine1, addressLine2, city, postcode].filter(Boolean).join(', '),
          country: country,
          attendees: [], // Not needed for invoice generation
          pricePerTicket: validItems[0]?.unitPrice || 0,
          numberOfTickets: validItems[0]?.quantity || 1,
          subtotal: subtotal,
          vatAmount: 0,
          vatRate: 21,
          totalPrice: total,
          discount: 0,
          isFaseMember,
          isAsaseMember,
          organizationType,
        };
      } else if (isRendezvous) {
        // Rendezvous unpaid invoice
        endpoint = '/api/admin/regenerate-rendezvous-invoice';
        payload = {
          invoiceNumber: invoiceNumber || undefined,
          registrationId: registrationId || undefined,
          companyName: organizationName,
          billingEmail: email,
          address: [addressLine1, addressLine2, city, postcode].filter(Boolean).join(', '),
          country: country,
          attendees: [],
          pricePerTicket: validItems[0]?.unitPrice || 0,
          numberOfTickets: validItems[0]?.quantity || 1,
          subtotal: subtotal,
          vatAmount: 0,
          vatRate: 21,
          totalPrice: total,
          discount: isFaseMember ? 50 : 0,
          isFaseMember,
          isAsaseMember,
          organizationType,
          forceCurrency: currency === 'auto' ? undefined : currency,
          vatNumber: vatNumber || undefined,
        };
      } else {
        // Membership or custom invoice (line-items based)
        endpoint = '/api/generate-invoice-pdf';
        payload = {
          email: email,
          organizationName: organizationName,
          fullName: contactName,
          address: {
            line1: addressLine1,
            line2: addressLine2,
            city: city,
            postcode: postcode,
            country: country,
          },
          lineItems: validItems.map((item) => ({
            description: item.description,
            amount: item.quantity * item.unitPrice,
            isDiscount: item.isDiscount || item.unitPrice < 0,
          })),
          paymentCurrency: currency === 'auto' ? 'EUR' : currency,
          locale: locale,
        };
      }

      const response = await authPost(endpoint, payload);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate invoice');
      }

      // Handle response
      if (data.pdfBase64) {
        // Download the PDF directly
        const pdfBlob = new Blob(
          [Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0))],
          { type: 'application/pdf' }
        );
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename || `${data.invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setGeneratedResult({
          invoiceNumber: data.invoiceNumber,
          filename: data.filename,
        });
      } else if (data.pdfUrl) {
        setGeneratedResult({
          pdfUrl: data.pdfUrl,
          invoiceNumber: data.invoiceNumber,
        });
      }

      showToast('success', `Invoice ${data.invoiceNumber} generated successfully`);
    } catch (err: any) {
      console.error('Failed to generate invoice:', err);
      setError(err.message || 'Failed to generate invoice');
      showToast('error', err.message || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const isRendezvousType = invoiceType === 'rendezvous' || invoiceType === 'rendezvous_paid';

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-fase-navy">Invoice Generator</h2>
        <Button variant="secondary" size="small" onClick={resetForm}>
          Reset Form
        </Button>
      </div>

      {/* Generator Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        {/* Invoice Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Type
            </label>
            <select
              value={invoiceType}
              onChange={(e) => {
                const type = e.target.value as InvoiceType;
                setInvoiceType(type);
                setIsPaid(type.endsWith('_paid'));
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {Object.entries(INVOICE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as typeof locale)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as typeof currency)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-fase-navy mb-3">Bill To</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Company Ltd"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="billing@company.com"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                VAT Number
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="NL123456789B01"
              />
            </div>
          </div>

          {/* Address */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Address Line 1"
              />
            </div>
            <div>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Address Line 2"
              />
            </div>
            <div>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="City"
              />
            </div>
            <div>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Postcode"
              />
            </div>
            <div>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Country"
              />
            </div>
          </div>
        </div>

        {/* Rendezvous-specific options */}
        {isRendezvousType && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-fase-navy mb-3">
              Rendezvous Options
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Organization Type
                </label>
                <select
                  value={organizationType}
                  onChange={(e) =>
                    setOrganizationType(e.target.value as typeof organizationType)
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  {ORG_TYPES.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Invoice Number (optional)
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                  placeholder="RDV-2026-XXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Registration ID (optional)
                </label>
                <input
                  type="text"
                  value={registrationId}
                  onChange={(e) => setRegistrationId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
                  placeholder="abc12345"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isFaseMember}
                  onChange={(e) => setIsFaseMember(e.target.checked)}
                  className="rounded border-gray-300"
                />
                FASE Member (50% discount)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isAsaseMember}
                  onChange={(e) => setIsAsaseMember(e.target.checked)}
                  className="rounded border-gray-300"
                />
                ASASE Member (Complimentary)
              </label>
            </div>
          </div>
        )}

        {/* PAID invoice options */}
        {isPaid && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-green-700 mb-3">
              Payment Confirmation Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  <option value="stripe">Stripe (Card)</option>
                  <option value="wise">Wise (Bank Transfer)</option>
                  <option value="bank_transfer">Other Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="Transaction ID"
                />
              </div>
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-fase-navy">Line Items</h3>
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

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">
                    Description
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700 w-20">
                    Qty
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 w-32">
                    Unit Price (€)
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 w-28">
                    Total
                  </th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineItems.map((item) => {
                  const itemTotal = item.quantity * item.unitPrice;
                  const isNegative = item.unitPrice < 0 || item.isDiscount;
                  return (
                    <tr
                      key={item.id}
                      className={isNegative ? 'bg-green-50' : ''}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(item.id, 'description', e.target.value)
                          }
                          placeholder="Enter description..."
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              'quantity',
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(
                              item.id,
                              'unitPrice',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right"
                        />
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          isNegative ? 'text-green-600' : ''
                        }`}
                      >
                        €
                        {itemTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2">
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(item.id)}
                            className="text-gray-400 hover:text-red-500"
                            title="Remove item"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Use negative unit prices for credits/discounts/refunds.
          </p>
        </div>

        {/* Total */}
        <div
          className={`p-4 rounded-lg ${
            isPaid ? 'bg-green-700' : 'bg-fase-navy'
          } text-white`}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm opacity-80">
                {lineItems.filter((i) => i.description.trim()).length} item
                {lineItems.filter((i) => i.description.trim()).length !== 1
                  ? 's'
                  : ''}
              </div>
              {isPaid && (
                <div className="text-fase-gold text-xs mt-1">
                  PAID Confirmation
                </div>
              )}
              {total < 0 && (
                <div className="text-fase-gold text-xs mt-1">Credit Note</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm opacity-80">Total</div>
              <div className="text-2xl font-bold">
                €
                {total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Success */}
        {generatedResult && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium text-green-800">
                  Invoice Generated: {generatedResult.invoiceNumber}
                </div>
                {generatedResult.filename && (
                  <div className="text-sm text-green-600">
                    Downloaded: {generatedResult.filename}
                  </div>
                )}
              </div>
              {generatedResult.pdfUrl && (
                <a
                  href={generatedResult.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Download PDF
                </a>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={resetForm}>
            Clear
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating
              ? 'Generating...'
              : isPaid
              ? 'Generate PAID Invoice'
              : 'Generate Invoice'}
          </Button>
        </div>
      </div>
    </div>
  );
}
