'use client';

/**
 * MemberInvoicePanel - Unified Invoice Generation Component
 *
 * Replaces complex MemberEmailActions invoice logic with a cleaner interface:
 * - Line item editor with add/remove/edit (supports negatives for credits)
 * - Recipient selector from company members
 * - Currency/locale selectors
 * - Stripe link toggle (auto-disabled if total <= 0)
 * - Preview and send functionality
 * - Invoice history list for this account
 *
 * Uses the unified /api/membership/send-invoice endpoint.
 */

import { useState, useEffect, useMemo } from 'react';
import Button from '../../../components/Button';
import { authFetch, authPost } from '@/lib/auth-fetch';
import { UnifiedMember } from '@/lib/unified-member';
import { calculateMembershipFee, calculateRendezvousTotal, getOrgTypeLabel } from '@/lib/pricing';
import { SUPPORTED_LANGUAGES, EMAIL_SENDERS } from '@/lib/email-constants';

interface MemberInvoicePanelProps {
  memberData: UnifiedMember;
  companyId: string;
  onInvoiceSent?: () => void;
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

interface SentInvoice {
  id: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  status: string;
  createdAt: any;
  recipientEmail: string;
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



export default function MemberInvoicePanel({
  memberData,
  companyId,
  onInvoiceSent,
}: MemberInvoicePanelProps) {
  // Line items state
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Form state - multiple recipient selection
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [currency, setCurrency] = useState<'auto' | 'EUR' | 'GBP' | 'USD'>('EUR');
  const [locale, setLocale] = useState('en');
  const [gender, setGender] = useState<'m' | 'f'>('m');
  const [sender, setSender] = useState('admin@fasemga.com');
  const [customMessage, setCustomMessage] = useState('');
  const [hasOtherAssociations, setHasOtherAssociations] = useState(false);
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

  // Invoice history
  const [sentInvoices, setSentInvoices] = useState<SentInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Rendezvous registration (pending payment)
  const [rendezvousRegistration, setRendezvousRegistration] = useState<RendezvousRegistration | null>(null);
  const [rendezvousIncluded, setRendezvousIncluded] = useState(true);

  // UI state
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // Initialize hasOtherAssociations and address from memberData
  useEffect(() => {
    if (memberData) {
      setHasOtherAssociations(memberData.hasOtherAssociations || false);
      // Initialize address from invoicingAddress, businessAddress, or registeredAddress
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

      // Add discount if member has other associations
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

  // Set default recipient selection after members load
  useEffect(() => {
    if (companyMembers.length > 0 && selectedRecipientIds.size === 0) {
      // Prefer account administrator, fall back to first member
      const admin = companyMembers.find(m => m.isAccountAdministrator);
      const defaultId = admin?.id || companyMembers[0]?.id;
      if (defaultId) {
        setSelectedRecipientIds(new Set([defaultId]));
      }
    }
  }, [companyMembers]);

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

  // Fetch invoice history
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!companyId) return;
      setLoadingInvoices(true);
      try {
        const response = await authFetch(`/api/admin/account-invoices?accountId=${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setSentInvoices(data.invoices || []);
        }
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
      } finally {
        setLoadingInvoices(false);
      }
    };
    fetchInvoices();
  }, [companyId]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [lineItems]);

  // Get all available recipients from members subcollection
  const allRecipients = useMemo(() => {
    return companyMembers.map(member => ({
      id: member.id,
      email: member.email,
      name: member.personalName,
      isAdmin: member.isAccountAdministrator || false,
    }));
  }, [companyMembers]);

  // Update recipient email/name when selection changes
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

  // Toggle recipient selection
  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all recipients
  const selectAllRecipients = () => {
    setSelectedRecipientIds(new Set(allRecipients.map(r => r.id)));
  };

  // Deselect all recipients
  const deselectAllRecipients = () => {
    setSelectedRecipientIds(new Set());
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
    // Name ALWAYS comes from selected pill - email field edits don't affect it
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
      currency,
      locale,
      sender,
      customMessage: customMessage || undefined,
      ccEmails: ccEmails ? ccEmails.split(',').map(e => e.trim()) : undefined,
      address,
      preview: isPreview,
      gender,
      hasOtherAssociations,
    };
  };

  // Preview invoice
  const handlePreview = async () => {
    setPreviewing(true);
    setPreview(null);
    setResult(null);

    try {
      const payload = buildPayload(true);
      const response = await authPost('/api/membership/send-invoice', payload);
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

  // Send invoice to selected recipients
  const handleSend = async () => {
    setSending(true);
    setResult(null);

    // Get list of recipients to send to
    const selectedRecipients = allRecipients.filter(r => selectedRecipientIds.has(r.id));

    // If user manually edited email field, parse that instead
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
    const errors: string[] = [];
    let lastInvoiceNumber = '';

    try {
      for (let i = 0; i < emailsToSend.length; i++) {
        const recipient = emailsToSend[i];
        const payload = buildPayload(false, recipient.email);

        try {
          const response = await authPost('/api/membership/send-invoice', payload);
          const data = await response.json();

          if (data.success) {
            successCount++;
            lastInvoiceNumber = data.invoiceNumber;
          } else {
            failCount++;
            errors.push(`${recipient.email}: ${data.error || 'Unknown error'}`);
          }

          // Rate limiting between sends
          if (i < emailsToSend.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err: any) {
          failCount++;
          errors.push(`${recipient.email}: ${err.message}`);
        }
      }

      // Set result summary
      if (failCount === 0) {
        setResult({
          success: true,
          message: emailsToSend.length === 1
            ? `Invoice ${lastInvoiceNumber} sent successfully to ${emailsToSend[0].email}`
            : `Successfully sent to ${successCount} recipient${successCount !== 1 ? 's' : ''}`,
        });
      } else if (successCount === 0) {
        setResult({ error: `Failed to send to all ${failCount} recipient${failCount !== 1 ? 's' : ''}` });
      } else {
        setResult({
          success: true,
          message: `Sent to ${successCount} recipient${successCount !== 1 ? 's' : ''}, ${failCount} failed`,
        });
      }

      // Log activity to timeline
      if (successCount > 0 && companyId) {
        try {
          await authPost('/api/admin/activities', {
            accountId: companyId,
            type: 'email_sent',
            title: 'Invoice Sent',
            description: `Invoice sent to ${successCount} recipient${successCount !== 1 ? 's' : ''} (${lastInvoiceNumber})`,
            performedBy: 'admin',
            performedByName: 'Admin'
          });
        } catch (activityError) {
          console.error('Failed to log activity:', activityError);
        }
      }

      setPreview(null);
      onInvoiceSent?.();

      // Refresh invoice history
      const invoicesResponse = await authFetch(`/api/admin/account-invoices?accountId=${companyId}`);
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        setSentInvoices(invoicesData.invoices || []);
      }
    } catch (error: any) {
      setResult({ error: error.message || 'Failed to send invoice' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recipient Selection */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-fase-navy mb-3">Recipient</h4>

        {/* Pills-based recipient selection */}
        {allRecipients.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Select Recipients</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllRecipients}
                  className="text-xs text-fase-navy hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={deselectAllRecipients}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
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
            {selectedRecipientIds.size > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                {selectedRecipientIds.size} recipient{selectedRecipientIds.size !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        )}

        {/* Email field (manual override) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email{selectedRecipientIds.size > 1 ? 's' : ''}</label>
            <input
              type={selectedRecipientIds.size > 1 ? 'text' : 'email'}
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CC Emails (comma-separated)</label>
            <input
              type="text"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              placeholder="e.g., finance@company.com"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Greeting and Gender */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Greeting name (after salutation)</label>
            <input
              type="text"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder={recipientName || 'e.g., Herr Schmidt, M. Dupont'}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank to use recipient name</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender (for salutation)</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as 'm' | 'f')}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="m">Masculine</option>
              <option value="f">Feminine</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Used for gendered languages</p>
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
            placeholder="Address Line 1 *"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            value={address.line2}
            onChange={(e) => setAddress(prev => ({ ...prev, line2: e.target.value }))}
            placeholder="Address Line 2"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            value={address.city}
            onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
            placeholder="City *"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            value={address.county}
            onChange={(e) => setAddress(prev => ({ ...prev, county: e.target.value }))}
            placeholder="County"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            value={address.postcode}
            onChange={(e) => setAddress(prev => ({ ...prev, postcode: e.target.value }))}
            placeholder="Postcode *"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="text"
            value={address.country}
            onChange={(e) => setAddress(prev => ({ ...prev, country: e.target.value }))}
            placeholder="Country *"
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Rendezvous Detection */}
      {rendezvousRegistration && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-amber-800">MGA Rendezvous Registration Detected</h4>
              <p className="text-sm text-amber-700 mt-1">
                {rendezvousRegistration.numberOfAttendees} pass{rendezvousRegistration.numberOfAttendees !== 1 ? 'es' : ''} reserved (
                {rendezvousRegistration.isAsaseMember ? 'ASASE member - complimentary' : `€${rendezvousRegistration.totalPrice?.toLocaleString() || '0'}`}
                )
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rendezvousIncluded}
                onChange={(e) => {
                  setRendezvousIncluded(e.target.checked);
                  if (!e.target.checked) {
                    // Remove rendezvous line item
                    setLineItems(prev => prev.filter(item => !item.description.includes('MGA Rendezvous')));
                  }
                }}
                className="rounded border-amber-300"
              />
              <span className="text-amber-800">Include in invoice</span>
            </label>
          </div>
        </div>
      )}

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
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                    No line items. Click &quot;+ Add Item&quot; to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Tip: Use negative unit prices for credits/discounts/refunds.
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'auto' | 'EUR' | 'GBP' | 'USD')}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="auto">Auto-detect from country</option>
            <option value="EUR">EUR - Wise Belgium</option>
            <option value="GBP">GBP - Wise UK</option>
            <option value="USD">USD - Wise US</option>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Send From</label>
          <select
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            {EMAIL_SENDERS.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-association discount toggle */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <input
          type="checkbox"
          id="hasOtherAssociations"
          checked={hasOtherAssociations}
          onChange={(e) => {
            setHasOtherAssociations(e.target.checked);
            // Update line items to add/remove discount
            const baseFee = lineItems.find(item => item.description === 'FASE Annual Membership')?.unitPrice || 0;
            const hasDiscountItem = lineItems.some(item => item.description.includes('Multi-Association'));

            if (e.target.checked && !hasDiscountItem && baseFee > 0) {
              // Add discount line item
              setLineItems(prev => [...prev, {
                id: generateId(),
                description: 'Multi-Association Member Discount (20%)',
                quantity: 1,
                unitPrice: -Math.round(baseFee * 0.2),
              }]);
            } else if (!e.target.checked && hasDiscountItem) {
              // Remove discount line item
              setLineItems(prev => prev.filter(item => !item.description.includes('Multi-Association')));
            }
          }}
          className="rounded border-gray-300"
        />
        <label htmlFor="hasOtherAssociations" className="text-sm text-gray-700 cursor-pointer">
          Has other association memberships (20% discount)
        </label>
        {memberData?.hasOtherAssociations && (
          <span className="text-xs text-gray-500 ml-auto">(from member record)</span>
        )}
      </div>

      {/* Custom Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Message (optional)
        </label>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          rows={3}
          placeholder="Add a personalized note to the email..."
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
      </div>

      {/* Total Summary */}
      <div className="bg-fase-navy text-white p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm opacity-80">
              {lineItems.length} item{lineItems.length !== 1 ? 's' : ''}
            </div>
            {subtotal < 0 && (
              <div className="text-fase-gold text-xs mt-1">Credit Note</div>
            )}
          </div>
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
            <button
              onClick={() => setPreview(null)}
              className="text-sm text-white/70 hover:text-white"
            >
              Edit
            </button>
          </div>
          <div className="p-4 bg-gray-50">
            <div className="text-sm space-y-1 mb-4">
              <div><span className="font-medium text-gray-600">To:</span> {preview.email?.to}</div>
              {preview.email?.cc && (
                <div><span className="font-medium text-gray-600">CC:</span> {preview.email.cc}</div>
              )}
              <div><span className="font-medium text-gray-600">Subject:</span> {preview.email?.subject}</div>
              <div><span className="font-medium text-gray-600">Invoice #:</span> {preview.invoiceNumber}</div>
              <div><span className="font-medium text-gray-600">Total:</span> €{preview.total?.toLocaleString()}</div>
              {preview.stripeError && (
                <div className="text-red-600"><span className="font-medium">Stripe Error:</span> {preview.stripeError}</div>
              )}
            </div>
            {preview.email?.html && (
              <div className="border border-gray-200 rounded bg-white p-3 max-h-64 overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: preview.email.html }} />
              </div>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Edit
              </Button>
              <Button variant="primary" onClick={handleSend} disabled={sending}>
                {sending ? 'Sending...' : 'Send Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {!preview && (
        <div className="flex justify-end gap-3">
          <Button
            variant="primary"
            onClick={handlePreview}
            disabled={previewing || lineItems.length === 0 || !recipientEmail}
          >
            {previewing ? 'Generating Preview...' : 'Preview Invoice'}
          </Button>
        </div>
      )}

      {/* Invoice History */}
      {sentInvoices.length > 0 && (
        <div className="border-t pt-6">
          <h4 className="font-semibold text-fase-navy mb-3">Previous Invoices</h4>
          <div className="space-y-2">
            {sentInvoices.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
              >
                <div>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                  <span className="text-gray-500 ml-2">
                    €{invoice.total?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">
                    {invoice.createdAt?.toDate?.()?.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }) || '—'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    invoice.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status?.toUpperCase() || 'SENT'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function to generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
