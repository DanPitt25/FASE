'use client';

/**
 * PaymentReminderPanel - Payment Reminder Email Component
 *
 * Sends follow-up emails to chase unpaid invoices:
 * - References original application date
 * - Notes that bank details have changed
 * - Attaches updated invoice with current bank details
 * - Mentions MGA Rendezvous member discount
 */

import { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/Button';
import { authFetch, authPost } from '@/lib/auth-fetch';
import { UnifiedMember } from '@/lib/unified-member';
import { calculateMembershipFee, calculateRendezvousTotal, getOrgTypeLabel } from '@/lib/pricing';
import { SUPPORTED_LANGUAGES } from '@/lib/email-constants';

interface PaymentReminderPanelProps {
  memberData: UnifiedMember;
  companyId: string;
  onEmailSent?: () => void;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CompanyMember {
  id: string;
  email: string;
  personalName: string;
  jobTitle?: string;
  isAccountAdministrator?: boolean;
}

interface RendezvousRegistration {
  registrationId: string;
  accountId: string;
  numberOfAttendees: number;
  billingInfo?: {
    organizationType?: string;
  };
  companyIsFaseMember?: boolean;
  isAsaseMember?: boolean;
  status: string;
  paymentStatus: string;
  totalPrice: number;
  attendees?: { firstName: string; lastName: string; email: string; jobTitle?: string }[];
}

export default function PaymentReminderPanel({
  memberData,
  companyId,
  onEmailSent,
}: PaymentReminderPanelProps) {
  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Form state
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [currency, setCurrency] = useState<'auto' | 'EUR' | 'GBP' | 'USD'>('EUR');
  const [locale, setLocale] = useState('en');
  const [gender, setGender] = useState<'m' | 'f'>('m');
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    county: '',
    postcode: '',
    country: '',
  });

  // Company members for recipient selection
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Rendezvous registration (pending payment)
  const [rendezvousRegistration, setRendezvousRegistration] = useState<RendezvousRegistration | null>(null);
  const [rendezvousIncluded, setRendezvousIncluded] = useState(false);

  // UI state
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // Get application date from memberData
  const applicationDate = useMemo(() => {
    const createdAt = memberData?.createdAt;
    if (!createdAt) return null;
    // Handle Firestore Timestamp or Date
    if (createdAt.toDate) return createdAt.toDate();
    if (createdAt instanceof Date) return createdAt;
    if (typeof createdAt === 'string') return new Date(createdAt);
    return null;
  }, [memberData?.createdAt]);

  // Initialize address from memberData
  useEffect(() => {
    if (memberData) {
      const addr = memberData.invoicingAddress || memberData.businessAddress || memberData.registeredAddress;
      if (addr) {
        setAddress({
          line1: addr.line1 || '',
          line2: addr.line2 || '',
          city: addr.city || '',
          county: addr.county || '',
          postcode: addr.postcode || '',
          country: addr.country || '',
        });
      }
    }
  }, [memberData]);

  // Initialize with default membership line item
  useEffect(() => {
    if (memberData && lineItems.length === 0) {
      const orgType = memberData.organizationType || 'MGA';
      const gwpBand = memberData.portfolio?.grossWrittenPremiums || '<10m';
      const baseFee = calculateMembershipFee(orgType, gwpBand, false);

      const defaultItems: LineItem[] = [
        {
          id: generateId(),
          description: 'FASE Annual Membership',
          quantity: 1,
          unitPrice: baseFee,
        },
      ];

      if (memberData.hasOtherAssociations) {
        defaultItems.push({
          id: generateId(),
          description: 'Multi-Association Member Discount (20%)',
          quantity: 1,
          unitPrice: -Math.round(baseFee * 0.2),
        });
      }

      setLineItems(defaultItems);
    }
  }, [memberData]);

  // Add Rendezvous line item when registration is found and included
  useEffect(() => {
    if (rendezvousRegistration && rendezvousIncluded) {
      // Check if we already have a rendezvous line item
      const hasRendezvousItem = lineItems.some(item => item.description.includes('MGA Rendezvous'));
      if (hasRendezvousItem) return;

      const passOrgType = rendezvousRegistration.billingInfo?.organizationType || memberData?.organizationType || 'MGA';
      const passCount = rendezvousRegistration.numberOfAttendees || 1;
      const isFaseMember = rendezvousRegistration.companyIsFaseMember !== false;
      const isAsaseMember = rendezvousRegistration.isAsaseMember || false;
      const rendezvousTotal = calculateRendezvousTotal(passOrgType, passCount, isFaseMember, isAsaseMember).subtotal;
      const passLabel = getOrgTypeLabel(passOrgType);

      if (rendezvousTotal > 0) {
        setLineItems(prev => [...prev, {
          id: generateId(),
          description: `MGA Rendezvous 2026 Pass${passCount > 1 ? 'es' : ''} (${passLabel} - ${passCount}x)`,
          quantity: 1,
          unitPrice: rendezvousTotal,
        }]);
      }
    }
  }, [rendezvousRegistration, rendezvousIncluded, memberData?.organizationType]);

  // Check for Rendezvous - both legacy account field and fetched registration
  useEffect(() => {
    // First check legacy account-level field (rendezvousPassReservation)
    const passData = memberData?.rendezvousPassReservation;
    if (passData?.reserved || passData?.passCount) {
      // Convert legacy format to RendezvousRegistration format
      setRendezvousRegistration({
        registrationId: 'legacy',
        accountId: companyId,
        numberOfAttendees: passData.passCount || 1,
        billingInfo: {
          organizationType: passData.organizationType || memberData?.organizationType || 'MGA',
        },
        companyIsFaseMember: passData.isFaseMember !== false,
        isAsaseMember: passData.isAsaseMember || false,
        status: 'pending',
        paymentStatus: 'pending',
        totalPrice: calculateRendezvousTotal(
          passData.organizationType || memberData?.organizationType || 'MGA',
          passData.passCount || 1,
          passData.isFaseMember !== false,
          passData.isAsaseMember || false
        ).subtotal,
        attendees: passData.attendees || [],
      });
      return; // Don't fetch if legacy data exists
    }

    // Then fetch from rendezvous-registrations collection
    const fetchRendezvousRegistration = async () => {
      if (!memberData?.email && !memberData?.organizationName) return;

      try {
        const response = await authFetch(
          `/api/admin/rendezvous-lookup?email=${encodeURIComponent(memberData.email || '')}&company=${encodeURIComponent(memberData.organizationName || '')}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.registration && data.registration.status !== 'confirmed' && data.registration.paymentStatus !== 'paid') {
            setRendezvousRegistration(data.registration);
          }
        }
      } catch (error) {
        console.error('Failed to fetch rendezvous registration:', error);
      }
    };

    fetchRendezvousRegistration();
  }, [memberData?.email, memberData?.organizationName, memberData?.rendezvousPassReservation, companyId]);

  // Fetch company members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!companyId) return;
      setLoadingMembers(true);
      try {
        const response = await authFetch(`/api/admin/company-members?companyId=${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setCompanyMembers(data.members || []);
        }
      } catch (error) {
        console.error('Failed to fetch company members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [companyId]);

  // Set default recipient selection
  useEffect(() => {
    if (companyMembers.length > 0 && selectedRecipientIds.size === 0) {
      const admin = companyMembers.find(m => m.isAccountAdministrator);
      const defaultId = admin?.id || companyMembers[0]?.id;
      if (defaultId) {
        setSelectedRecipientIds(new Set([defaultId]));
      }
    }
  }, [companyMembers]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [lineItems]);

  // Get all available recipients
  const allRecipients = useMemo(() => {
    return companyMembers.map(member => ({
      id: member.id,
      email: member.email,
      name: member.personalName,
      isAdmin: member.isAccountAdministrator || false,
    }));
  }, [companyMembers]);

  // Update recipient when selection changes
  useEffect(() => {
    const selectedRecipients = allRecipients.filter(r => selectedRecipientIds.has(r.id));
    if (selectedRecipients.length === 1) {
      setRecipientEmail(selectedRecipients[0].email);
      setRecipientName(selectedRecipients[0].name);
    } else if (selectedRecipients.length > 1) {
      setRecipientEmail(selectedRecipients.map(r => r.email).join(', '));
      setRecipientName(`${selectedRecipients.length} recipients`);
    } else {
      setRecipientEmail('');
      setRecipientName('');
    }
  }, [selectedRecipientIds, allRecipients]);

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Line item management
  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: generateId(),
      description: '',
      quantity: 1,
      unitPrice: 0,
    }]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  // Build payload for API
  const buildPayload = (isPreview: boolean, targetEmail?: string) => {
    const selectedRecipients = allRecipients.filter(r => selectedRecipientIds.has(r.id));
    const recipientNameFromPill = selectedRecipients.length > 0 ? selectedRecipients[0].name : '';

    return {
      accountId: companyId,
      recipientEmail: targetEmail || recipientEmail,
      recipientName: recipientNameFromPill,
      greeting: greeting || recipientNameFromPill,
      organizationName: memberData?.organizationName || '',
      lineItems: lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      applicationDate: applicationDate?.toISOString() || null,
      currency,
      locale,
      sender: 'daniel.pitt@fasemga.com',
      address,
      preview: isPreview,
      gender,
    };
  };

  // Preview
  const handlePreview = async () => {
    setPreviewing(true);
    setPreview(null);
    setResult(null);

    try {
      const payload = buildPayload(true);
      const response = await authPost('/api/membership/send-payment-reminder', payload);
      const data = await response.json();

      if (data.success) {
        setPreview(data);
      } else {
        setResult({ error: data.error || 'Failed to generate preview' });
      }
    } catch (error: any) {
      setResult({ error: error.message || 'Failed to generate preview' });
    } finally {
      setPreviewing(false);
    }
  };

  // Send
  const handleSend = async () => {
    setSending(true);
    setResult(null);

    const selectedRecipients = allRecipients.filter(r => selectedRecipientIds.has(r.id));
    const emailList = recipientEmail.split(',').map(e => e.trim()).filter(Boolean);
    const expectedFromPills = selectedRecipients.map(r => r.email).join(', ');
    const isManuallyEdited = recipientEmail !== expectedFromPills && recipientEmail.trim() !== '';

    let emailsToSend: { email: string; name: string }[];
    if (isManuallyEdited) {
      emailsToSend = emailList.map(email => ({ email, name: recipientName }));
    } else {
      emailsToSend = selectedRecipients.map(r => ({ email: r.email, name: r.name }));
    }

    if (emailsToSend.length === 0) {
      setResult({ error: 'No recipients selected' });
      setSending(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let lastInvoiceNumber = '';

    try {
      for (let i = 0; i < emailsToSend.length; i++) {
        const recipient = emailsToSend[i];
        const payload = buildPayload(false, recipient.email);

        try {
          const response = await authPost('/api/membership/send-payment-reminder', payload);
          const data = await response.json();

          if (data.success) {
            successCount++;
            lastInvoiceNumber = data.invoiceNumber;
          } else {
            failCount++;
          }

          if (i < emailsToSend.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch {
          failCount++;
        }
      }

      if (failCount === 0) {
        setResult({
          success: true,
          message: emailsToSend.length === 1
            ? `Payment reminder ${lastInvoiceNumber} sent to ${emailsToSend[0].email}`
            : `Successfully sent to ${successCount} recipients`,
        });
      } else if (successCount === 0) {
        setResult({ error: `Failed to send to all ${failCount} recipients` });
      } else {
        setResult({
          success: true,
          message: `Sent to ${successCount} recipients, ${failCount} failed`,
        });
      }

      setPreview(null);
      onEmailSent?.();
    } catch (error: any) {
      setResult({ error: error.message || 'Failed to send' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Application Date Notice */}
      {applicationDate && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Application Date:</strong> {applicationDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            This date will be referenced in the payment reminder email.
          </p>
        </div>
      )}

      {/* Rendezvous Registration Notice */}
      {rendezvousRegistration && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800">MGA Rendezvous Registration Found</p>
              <p className="text-xs text-amber-700 mt-1">
                {rendezvousRegistration.numberOfAttendees} pass{rendezvousRegistration.numberOfAttendees !== 1 ? 'es' : ''} reserved (
                {rendezvousRegistration.isAsaseMember ? 'ASASE member - complimentary' : `€${rendezvousRegistration.totalPrice?.toLocaleString() || '0'}`}
                )
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rendezvousIncluded}
                onChange={(e) => {
                  setRendezvousIncluded(e.target.checked);
                  if (!e.target.checked) {
                    // Remove rendezvous line item if unchecked
                    setLineItems(prev => prev.filter(item => !item.description.includes('MGA Rendezvous')));
                  }
                }}
                className="w-4 h-4 text-fase-navy border-gray-300 rounded focus:ring-fase-navy"
              />
              <span className="text-sm text-amber-800">Include in reminder</span>
            </label>
          </div>
        </div>
      )}

      {/* Recipient Selection */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-fase-navy mb-3">Recipient</h4>

        {allRecipients.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Recipients</label>
            {loadingMembers ? (
              <div className="text-sm text-gray-500">Loading members...</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allRecipients.map((recipient) => (
                  <button
                    key={recipient.id}
                    type="button"
                    onClick={() => toggleRecipient(recipient.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      selectedRecipientIds.has(recipient.id)
                        ? 'bg-fase-navy text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {recipient.name}
                    {recipient.isAdmin && <span className="ml-1 opacity-70">(Admin)</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="text"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Greeting name</label>
            <input
              type="text"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder={recipientName}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-fase-navy mb-3">Invoice Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={address.line1}
            onChange={(e) => setAddress(prev => ({ ...prev, line1: e.target.value }))}
            placeholder="Address Line 1"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            value={address.city}
            onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
            placeholder="City"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            value={address.country}
            onChange={(e) => setAddress(prev => ({ ...prev, country: e.target.value }))}
            placeholder="Country"
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-fase-navy">Line Items</h4>
          <Button variant="secondary" size="small" onClick={addLineItem}>
            + Add Item
          </Button>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 w-20">Qty</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 w-28">Unit Price</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 w-28">Total</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lineItems.map((item) => {
                const itemTotal = item.quantity * item.unitPrice;
                const isNegative = item.unitPrice < 0;
                return (
                  <tr key={item.id} className={isNegative ? 'bg-green-50' : ''}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Enter description..."
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">€</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right"
                        />
                      </div>
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${isNegative ? 'text-green-600' : ''}`}>
                      €{itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'auto' | 'EUR' | 'GBP' | 'USD')}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="auto">Auto-detect</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Salutation</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'm' | 'f')}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="m">Dear (M)</option>
            <option value="f">Dear (F)</option>
          </select>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>This email will include:</strong>
        </p>
        <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
          <li>Reference to original application date</li>
          <li>Notice that bank details have changed</li>
          <li>Updated invoice PDF with current bank details</li>
          <li>Online payment link (Stripe)</li>
          <li>Mention of 50% MGA Rendezvous discount for members</li>
        </ul>
      </div>

      {/* Total Summary */}
      <div className="bg-fase-navy text-white p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="text-sm opacity-80">{lineItems.length} item{lineItems.length !== 1 ? 's' : ''}</div>
          <div className="text-right">
            <div className="text-sm opacity-80">Total</div>
            <div className="text-2xl font-bold">
              €{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className={`p-4 rounded-lg ${result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {result.error || result.message}
        </div>
      )}

      {/* Preview Display */}
      {preview && !preview.error && (
        <div className="border-2 border-fase-navy rounded-lg overflow-hidden">
          <div className="bg-fase-navy px-4 py-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Email Preview</h4>
            <button onClick={() => setPreview(null)} className="text-sm text-white/70 hover:text-white">Edit</button>
          </div>
          <div className="p-4 bg-gray-50">
            <div className="text-sm space-y-1 mb-4">
              <div><span className="font-medium text-gray-600">To:</span> {preview.email?.to}</div>
              <div><span className="font-medium text-gray-600">Subject:</span> {preview.email?.subject}</div>
              <div><span className="font-medium text-gray-600">Invoice #:</span> {preview.invoiceNumber}</div>
            </div>
            {preview.email?.html && (
              <div className="border border-gray-200 rounded bg-white p-3 max-h-64 overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: preview.email.html }} />
              </div>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPreview(null)}>Edit</Button>
              <Button variant="primary" onClick={handleSend} disabled={sending}>
                {sending ? 'Sending...' : 'Send Payment Reminder'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {!preview && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handlePreview}
            disabled={previewing || lineItems.length === 0 || !recipientEmail}
          >
            {previewing ? 'Generating Preview...' : 'Preview Payment Reminder'}
          </Button>
        </div>
      )}
    </div>
  );
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
