'use client';

import { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import { createInvoiceRecord } from '../../../lib/firestore';
import { calculateRendezvousTotal, getOrgTypeLabel } from '../../../lib/pricing';

interface MemberEmailActionsProps {
  memberData: any;
  companyId: string;
  onEmailSent?: () => void;
}

interface SubcollectionMember {
  id: string;
  email: string;
  personalName: string;
  jobTitle?: string;
  isPrimaryContact?: boolean;
  isAccountAdministrator?: boolean;
}

type EmailAction = 'invoice' | 'standalone_invoice' | 'welcome' | 'reminder' | 'rendezvous' | 'bulletin' | null;

const actionConfig = {
  invoice: {
    title: 'Invoice Email',
    description: 'Stripe payment link + bank transfer option',
    icon: '💳',
    apiEndpoint: '/api/send-membership-invoice-stripe',
    requiresPricing: true
  },
  standalone_invoice: {
    title: 'PDF Invoice',
    description: 'Standalone invoice with PDF attachment',
    icon: '📄',
    apiEndpoint: '/api/send-invoice-only',
    requiresPricing: true
  },
  welcome: {
    title: 'Welcome Email',
    description: 'Portal access for approved members',
    icon: '👋',
    apiEndpoint: '/api/send-member-portal-welcome',
    requiresPricing: false
  },
  reminder: {
    title: 'Payment Reminder',
    description: 'Overdue payment notice',
    icon: '⏰',
    apiEndpoint: '/api/send-payment-reminder',
    requiresPricing: true
  },
  rendezvous: {
    title: 'Rendezvous Confirmation',
    description: 'MGA Rendezvous ticket confirmation',
    icon: '🎫',
    apiEndpoint: '/api/send-rendezvous-confirmation',
    requiresPricing: false
  },
  bulletin: {
    title: 'Bulletin Email',
    description: 'February 2026 Entrepreneurial Underwriter',
    icon: '📰',
    apiEndpoint: '/api/send-bulletin-email',
    requiresPricing: false
  }
};

export default function MemberEmailActions({ memberData, companyId, onEmailSent }: MemberEmailActionsProps) {
  const [selectedAction, setSelectedAction] = useState<EmailAction>(null);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [rendezvousRegistration, setRendezvousRegistration] = useState<any>(null);

  // Recipient selection state
  const [subcollectionMembers, setSubcollectionMembers] = useState<SubcollectionMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set(['account_admin']));

  // Form data - initialized from memberData
  const [formData, setFormData] = useState({
    email: '',
    cc: '',
    fullName: '',
    greeting: '',
    gender: 'm',
    organizationName: '',
    organizationType: 'MGA',
    hasOtherAssociations: false,
    userLocale: 'en',
    forceCurrency: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: ''
    },
    reminderAttachment: null as File | null,
    customLineItem: {
      description: '',
      amount: 0,
      enabled: false
    },
    testPayment: false,
    rendezvous: {
      registrationId: '',
      numberOfAttendees: 1,
      totalAmount: 0,
      attendeeNames: '',
      isFaseMember: true,
      isComplimentary: false,
      specialRequests: ''
    },
    freeformSender: 'admin@fasemga.com'
  });

  // Initialize form data from memberData
  useEffect(() => {
    if (memberData) {
      setFormData(prev => ({
        ...prev,
        email: memberData.email || '',
        fullName: memberData?.accountAdministrator?.name || memberData.personalName || memberData?.fullName || '',
        organizationName: memberData.organizationName || '',
        organizationType: memberData.organizationType || 'MGA',
        hasOtherAssociations: memberData.hasOtherAssociations || false,
        address: {
          line1: memberData.invoicingAddress?.line1 || memberData.businessAddress?.line1 || memberData.registeredAddress?.line1 || '',
          line2: memberData.invoicingAddress?.line2 || memberData.businessAddress?.line2 || memberData.registeredAddress?.line2 || '',
          city: memberData.invoicingAddress?.city || memberData.businessAddress?.city || memberData.registeredAddress?.city || '',
          county: memberData.invoicingAddress?.county || memberData.businessAddress?.county || memberData.registeredAddress?.county || '',
          postcode: memberData.invoicingAddress?.postcode || memberData.businessAddress?.postcode || memberData.registeredAddress?.postcode || '',
          country: memberData.invoicingAddress?.country || memberData.businessAddress?.country || memberData.registeredAddress?.country || ''
        }
      }));
    }
  }, [memberData]);

  // Fetch rendezvous registration by matching email/company
  useEffect(() => {
    const fetchRendezvousRegistration = async () => {
      if (!memberData?.email && !memberData?.organizationName) return;

      try {
        const response = await fetch(`/api/admin/rendezvous-lookup?email=${encodeURIComponent(memberData.email || '')}&company=${encodeURIComponent(memberData.organizationName || '')}`);
        if (response.ok) {
          const data = await response.json();
          if (data.registration) {
            setRendezvousRegistration(data.registration);
          }
        }
      } catch (error) {
        console.error('Failed to fetch rendezvous registration:', error);
      }
    };

    fetchRendezvousRegistration();
  }, [memberData?.email, memberData?.organizationName]);

  // Fetch subcollection members for recipient selection
  useEffect(() => {
    const fetchSubcollectionMembers = async () => {
      if (!companyId) return;

      setLoadingMembers(true);
      try {
        const response = await fetch(`/api/admin/company-members?companyId=${companyId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.members) {
            setSubcollectionMembers(data.members);
          }
        }
      } catch (error) {
        console.error('Failed to fetch subcollection members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchSubcollectionMembers();
  }, [companyId]);

  // Build list of all available recipients
  const getAllRecipients = () => {
    const recipients: { id: string; email: string; name: string; role?: string; isAdmin?: boolean }[] = [];

    // Account administrator
    if (memberData?.email) {
      recipients.push({
        id: 'account_admin',
        email: memberData.email,
        name: memberData.accountAdministrator?.name || memberData.personalName || memberData.fullName || 'Account Admin',
        role: memberData.accountAdministrator?.role || memberData.jobTitle,
        isAdmin: true
      });
    }

    // Subcollection members (exclude if same email as account admin)
    subcollectionMembers.forEach(member => {
      if (member.email !== memberData?.email) {
        recipients.push({
          id: member.id,
          email: member.email,
          name: member.personalName,
          role: member.jobTitle
        });
      }
    });

    return recipients;
  };

  const allRecipients = getAllRecipients();

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

  // Get selected emails for sending
  const getSelectedEmails = () => {
    return allRecipients
      .filter(r => selectedRecipientIds.has(r.id))
      .map(r => r.email);
  };

  // Update form email field based on selection (for preview/display)
  useEffect(() => {
    const selectedEmails = getSelectedEmails();
    if (selectedEmails.length === 1) {
      const selected = allRecipients.find(r => selectedRecipientIds.has(r.id));
      setFormData(prev => ({
        ...prev,
        email: selected?.email || '',
        fullName: selected?.name || ''
      }));
    } else if (selectedEmails.length > 1) {
      setFormData(prev => ({
        ...prev,
        email: selectedEmails.join(', '),
        fullName: `${selectedEmails.length} recipients`
      }));
    }
  }, [selectedRecipientIds, subcollectionMembers, memberData]);

  // Calculate pricing
  const calculateOriginalAmount = () => {
    if (formData.organizationType === 'MGA') {
      const gwp = memberData?.portfolio?.grossWrittenPremiums;
      switch (gwp) {
        case '<10m': return 900;
        case '10-20m': return 1500;
        case '20-50m': return 2200;
        case '50-100m': return 2800;
        case '100-500m': return 4200;
        case '500m+': return 7000;
        default: return 900;
      }
    } else if (formData.organizationType === 'carrier') {
      return 4000;
    } else if (formData.organizationType === 'provider') {
      return 5000;
    }
    return 900;
  };

  const originalAmount = calculateOriginalAmount();
  const baseAmount = formData.hasOtherAssociations ? Math.round(originalAmount * 0.8) : originalAmount;

  // Calculate rendezvous total - check both account field and fetched registration
  const getRendezvousTotal = () => {
    // First check account-level reservation (legacy)
    const passData = memberData?.rendezvousPassReservation;
    if (passData?.reserved || passData?.passCount) {
      const passOrgType = passData.organizationType || formData.organizationType;
      const passCount = passData.passCount || 1;
      const isFaseMember = passData.isFaseMember !== false;
      const isAsaseMember = passData.isAsaseMember || false;
      return calculateRendezvousTotal(passOrgType, passCount, isFaseMember, isAsaseMember).subtotal;
    }
    // Then check fetched registration from rendezvous-registrations collection
    if (rendezvousRegistration && rendezvousRegistration.status !== 'confirmed' && rendezvousRegistration.paymentStatus !== 'paid') {
      const passOrgType = rendezvousRegistration.billingInfo?.organizationType || formData.organizationType;
      const passCount = rendezvousRegistration.numberOfAttendees || 1;
      const isFaseMember = rendezvousRegistration.companyIsFaseMember !== false;
      const isAsaseMember = rendezvousRegistration.isAsaseMember || false;
      return calculateRendezvousTotal(passOrgType, passCount, isFaseMember, isAsaseMember).subtotal;
    }
    return 0;
  };

  // Get pass data for invoice line items (from either source)
  const getRendezvousPassData = () => {
    const passData = memberData?.rendezvousPassReservation;
    if (passData?.reserved || passData?.passCount) {
      return {
        reserved: true,
        passCount: passData.passCount || 1,
        organizationType: passData.organizationType || formData.organizationType,
        isFaseMember: passData.isFaseMember !== false,
        isAsaseMember: passData.isAsaseMember || false,
        attendees: passData.attendees || []
      };
    }
    if (rendezvousRegistration && rendezvousRegistration.status !== 'confirmed' && rendezvousRegistration.paymentStatus !== 'paid') {
      return {
        reserved: true,
        passCount: rendezvousRegistration.numberOfAttendees || 1,
        organizationType: rendezvousRegistration.billingInfo?.organizationType || formData.organizationType,
        isFaseMember: rendezvousRegistration.companyIsFaseMember !== false,
        isAsaseMember: rendezvousRegistration.isAsaseMember || false,
        attendees: rendezvousRegistration.attendees || []
      };
    }
    return null;
  };
  const rendezvousTotal = getRendezvousTotal();
  const customLineItemTotal = formData.customLineItem.enabled ? formData.customLineItem.amount : 0;
  const finalAmount = baseAmount + rendezvousTotal + customLineItemTotal;

  const buildPayload = (isPreview: boolean) => {
    if (!selectedAction) return null;
    const config = actionConfig[selectedAction];

    const rendezvousPassData = getRendezvousPassData();
    const payload: any = {
      preview: isPreview,
      ...formData,
      greeting: formData.greeting || formData.fullName,
      ...(rendezvousPassData && { rendezvousPassReservation: rendezvousPassData })
    };

    if (selectedAction === 'rendezvous') {
      return {
        preview: isPreview,
        email: formData.email,
        cc: formData.cc,
        companyName: formData.organizationName,
        organizationType: formData.organizationType,
        userLocale: formData.userLocale,
        registrationId: formData.rendezvous.registrationId,
        numberOfAttendees: formData.rendezvous.numberOfAttendees,
        totalAmount: formData.rendezvous.totalAmount,
        attendeeNames: formData.rendezvous.attendeeNames,
        isFaseMember: formData.rendezvous.isFaseMember,
        isComplimentary: formData.rendezvous.isComplimentary,
        specialRequests: formData.rendezvous.specialRequests
      };
    }

    if (selectedAction === 'bulletin') {
      return {
        preview: isPreview,
        email: formData.email,
        cc: formData.cc,
        userLocale: formData.userLocale
      };
    }

    if (selectedAction === 'standalone_invoice') {
      const lineItems: { description: string; amount: number; isDiscount?: boolean }[] = [];
      const membershipDescription = formData.userLocale === 'nl'
        ? 'FASE Jaarlijks Lidmaatschap'
        : 'FASE Annual Membership';
      lineItems.push({ description: membershipDescription, amount: originalAmount });

      if (formData.hasOtherAssociations) {
        const discountDescription = formData.userLocale === 'nl'
          ? 'Lidmaatschapskorting voor Meerdere Verenigingen (20%)'
          : 'Multi-Association Member Discount (20%)';
        lineItems.push({ description: discountDescription, amount: -(originalAmount * 0.2), isDiscount: true });
      }

      if (rendezvousPassData) {
        const passOrgType = rendezvousPassData.organizationType || formData.organizationType;
        const passCount = rendezvousPassData.passCount || 1;
        const isFaseMember = rendezvousPassData.isFaseMember !== false;
        const isAsaseMember = rendezvousPassData.isAsaseMember || false;
        const calculatedTotal = calculateRendezvousTotal(passOrgType, passCount, isFaseMember, isAsaseMember).subtotal;
        const passLabel = getOrgTypeLabel(passOrgType);

        if (calculatedTotal > 0) {
          lineItems.push({
            description: `MGA Rendezvous 2026 Pass${passCount > 1 ? 'es' : ''} (${passLabel} - ${passCount}x)`,
            amount: calculatedTotal
          });
        }
      }

      if (formData.customLineItem.enabled && formData.customLineItem.amount > 0) {
        lineItems.push({
          description: formData.customLineItem.description || 'Additional Item',
          amount: formData.customLineItem.amount
        });
      }

      payload.invoiceNumber = `FASE-${Math.floor(10000 + Math.random() * 90000)}`;
      payload.lineItems = lineItems;
      payload.paymentCurrency = formData.forceCurrency || 'EUR';
      payload.country = formData.address.country;
      payload.address = formData.address;
      payload.userLocale = formData.userLocale;
    } else if (config.requiresPricing) {
      payload.totalAmount = finalAmount;
      payload.exactTotalAmount = finalAmount;
      payload.originalAmount = originalAmount.toString();
      payload.discountAmount = formData.hasOtherAssociations ? (originalAmount - baseAmount) : 0;
      payload.discountReason = formData.hasOtherAssociations ? 'Multi-Association Member Discount (20%)' : '';
      payload.grossWrittenPremiums = memberData?.portfolio?.grossWrittenPremiums || '<10m';
      payload.forceCurrency = formData.forceCurrency;
      payload.customLineItem = formData.customLineItem.enabled ? formData.customLineItem : null;
    }

    if (selectedAction === 'reminder') {
      if (memberData?.createdAt) {
        payload.applicationDate = memberData.createdAt;
      }
      payload.address = formData.address;
      payload.country = formData.address.country;
      payload.userLocale = formData.userLocale;
    }

    return payload;
  };

  const handleReminderAttachment = async (payload: any) => {
    if (selectedAction !== 'reminder' || !formData.reminderAttachment) {
      return payload;
    }
    const fileReader = new FileReader();
    const pdfBase64 = await new Promise<string>((resolve, reject) => {
      fileReader.onload = () => {
        const result = fileReader.result as string;
        resolve(result.split(',')[1]);
      };
      fileReader.onerror = reject;
      fileReader.readAsDataURL(formData.reminderAttachment!);
    });
    return {
      ...payload,
      pdfAttachment: pdfBase64,
      pdfFilename: formData.reminderAttachment.name
    };
  };

  const sendOrPreview = async (isPreview: boolean) => {
    if (!selectedAction) return;

    if (isPreview) {
      setPreviewing(true);
      setPreview(null);
    } else {
      setSending(true);
      setResult(null);
    }

    try {
      const config = actionConfig[selectedAction];

      // For preview, just use the first selected recipient
      if (isPreview) {
        let payload = buildPayload(true);

        if (selectedAction === 'reminder' && formData.reminderAttachment) {
          payload = await handleReminderAttachment(payload);
        }

        const response = await fetch(config.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        setPreview(data);
      } else {
        // For sending, determine recipients
        // Check if user manually edited the email field
        const selectedFromPills = getSelectedEmails();
        const formEmailList = formData.email.split(',').map(e => e.trim()).filter(Boolean);

        // If formData.email differs from what would be auto-generated from pills, use form values
        const expectedFromPills = selectedFromPills.join(', ');
        const isManuallyEdited = formData.email !== expectedFromPills && formData.email.trim() !== '';

        let emailsToSend: string[];
        let namesToSend: string[];

        if (isManuallyEdited) {
          // User manually edited - use form values
          emailsToSend = formEmailList;
          namesToSend = formEmailList.map(() => formData.fullName);
        } else {
          // Use selected pills
          emailsToSend = selectedFromPills;
          namesToSend = allRecipients
            .filter(r => selectedRecipientIds.has(r.id))
            .map(r => r.name);
        }

        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < emailsToSend.length; i++) {
          const email = emailsToSend[i];
          const name = namesToSend[i];

          // Build payload for this specific recipient
          let payload = buildPayload(false);
          payload.email = email;
          payload.fullName = name;

          if (selectedAction === 'reminder' && formData.reminderAttachment) {
            payload = await handleReminderAttachment(payload);
          }

          try {
            const response = await fetch(config.apiEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.success || response.ok) {
              successCount++;

              // Track invoice in Firestore
              if (selectedAction === 'standalone_invoice' || selectedAction === 'invoice' || selectedAction === 'reminder') {
                try {
                  await createInvoiceRecord({
                    invoiceNumber: data.invoiceNumber || payload.invoiceNumber,
                    recipientEmail: email,
                    recipientName: name || 'Client',
                    organizationName: formData.organizationName,
                    amount: parseFloat(payload.totalAmount) || 0,
                    currency: payload.forceCurrency || 'EUR',
                    type: selectedAction === 'reminder' ? 'reminder' : (selectedAction === 'standalone_invoice' ? 'standalone' : 'regular'),
                    status: 'sent',
                    sentAt: new Date(),
                    pdfUrl: data.pdfUrl,
                    pdfGenerated: !!data.pdfUrl
                  });
                } catch (trackingError) {
                  console.error('Failed to track invoice:', trackingError);
                }
              }
            } else {
              failCount++;
              errors.push(`${email}: ${data.error || 'Unknown error'}`);
            }

            // Rate limiting - wait 500ms between sends
            if (i < emailsToSend.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (err: any) {
            failCount++;
            errors.push(`${email}: ${err.message}`);
          }
        }

        // Set result summary
        if (failCount === 0) {
          setResult({
            success: true,
            message: `Successfully sent to ${successCount} recipient${successCount !== 1 ? 's' : ''}`
          });
        } else if (successCount === 0) {
          setResult({
            error: `Failed to send to all ${failCount} recipient${failCount !== 1 ? 's' : ''}`,
            details: errors
          });
        } else {
          setResult({
            success: true,
            message: `Sent to ${successCount} recipient${successCount !== 1 ? 's' : ''}, ${failCount} failed`,
            details: errors
          });
        }

        // Log activity to timeline
        if (successCount > 0 && companyId) {
          try {
            await fetch('/api/admin/activities', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accountId: companyId,
                type: 'email_sent',
                title: `${config.title} Sent`,
                description: `${config.title} sent to ${successCount} recipient${successCount !== 1 ? 's' : ''}`,
                performedBy: 'admin',
                performedByName: 'Admin'
              })
            });
            onEmailSent?.();
          } catch (activityError) {
            console.error('Failed to log activity:', activityError);
          }
        }
      }
    } catch (error) {
      const errorResult = { error: isPreview ? 'Failed to generate preview' : 'Failed to send email' };
      if (isPreview) {
        setPreview(errorResult);
      } else {
        setResult(errorResult);
      }
    } finally {
      if (isPreview) {
        setPreviewing(false);
      } else {
        setSending(false);
      }
    }
  };

  const handleBack = () => {
    setSelectedAction(null);
    setPreview(null);
    setResult(null);
  };

  // Render action cards when no action selected
  if (!selectedAction) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.entries(actionConfig) as [EmailAction, typeof actionConfig.invoice][]).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setSelectedAction(key as EmailAction)}
            className="p-4 rounded-lg border-2 border-gray-200 hover:border-fase-navy hover:bg-fase-navy hover:bg-opacity-5 text-left transition-all group"
          >
            <div className="text-2xl mb-2">{config.icon}</div>
            <h4 className="font-semibold text-gray-900 group-hover:text-fase-navy">{config.title}</h4>
            <p className="text-sm text-gray-500 mt-1">{config.description}</p>
          </button>
        ))}
      </div>
    );
  }

  const config = actionConfig[selectedAction];

  // Render form for selected action
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <button
          onClick={handleBack}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-2xl">{config.icon}</div>
        <h3 className="text-lg font-semibold text-fase-navy">{config.title}</h3>
      </div>

      {/* Language and Sender */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
          <select
            value={formData.userLocale}
            onChange={(e) => setFormData(prev => ({ ...prev, userLocale: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="en">English</option>
            <option value="fr">Francais</option>
            <option value="de">Deutsch</option>
            <option value="es">Espanol</option>
            <option value="it">Italiano</option>
            <option value="nl">Nederlands</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Send From</label>
          <select
            value={formData.freeformSender}
            onChange={(e) => setFormData(prev => ({ ...prev, freeformSender: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            <option value="admin@fasemga.com">FASE Admin &lt;admin@fasemga.com&gt;</option>
            <option value="william.pitt@fasemga.com">William Pitt &lt;william.pitt@fasemga.com&gt;</option>
            <option value="info@fasemga.com">FASE Info &lt;info@fasemga.com&gt;</option>
            <option value="media@fasemga.com">FASE Media &lt;media@fasemga.com&gt;</option>
          </select>
        </div>
      </div>

      {/* Recipient Selection */}
      {allRecipients.length > 0 && (
        <div>
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
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {recipient.name}
                  {recipient.isAdmin && <span className="ml-1 opacity-70">(Admin)</span>}
                  {recipient.role && !recipient.isAdmin && (
                    <span className="ml-1 opacity-70">({recipient.role})</span>
                  )}
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

      {/* Email Recipients - Manual Override */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email{selectedRecipientIds.size > 1 ? 's' : ''} *</label>
          <input
            type={selectedRecipientIds.size > 1 ? 'text' : 'email'}
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CC Email</label>
          <input
            type="email"
            value={formData.cc}
            onChange={(e) => setFormData(prev => ({ ...prev, cc: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          />
        </div>
      </div>

      {/* Contact Details - not for rendezvous */}
      {selectedAction !== 'rendezvous' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Greeting</label>
            <input
              type="text"
              value={formData.greeting}
              onChange={(e) => setFormData(prev => ({ ...prev, greeting: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder="Mr., Ms., Dr., etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="m">Male</option>
              <option value="f">Female</option>
            </select>
          </div>
        </div>
      )}

      {/* Organization Details - for invoice types */}
      {(selectedAction === 'invoice' || selectedAction === 'standalone_invoice' || selectedAction === 'reminder') && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name *</label>
              <input
                type="text"
                value={formData.organizationName}
                onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organization Type</label>
              <select
                value={formData.organizationType}
                onChange={(e) => setFormData(prev => ({ ...prev, organizationType: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="MGA">MGA</option>
                <option value="carrier">Carrier</option>
                <option value="provider">Provider</option>
              </select>
            </div>
          </div>

          {/* Pricing options */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.hasOtherAssociations}
                onChange={(e) => setFormData(prev => ({ ...prev, hasOtherAssociations: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Has other association memberships (20% discount)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.testPayment}
                onChange={(e) => setFormData(prev => ({ ...prev, testPayment: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Test payment (50 cents)</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency Override</label>
              <select
                value={formData.forceCurrency}
                onChange={(e) => setFormData(prev => ({ ...prev, forceCurrency: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="">Auto-detect from country</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={formData.address.line1}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                placeholder="Address Line 1 *"
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
              <input
                type="text"
                value={formData.address.line2}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, line2: e.target.value } }))}
                placeholder="Address Line 2"
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                placeholder="City *"
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
              <input
                type="text"
                value={formData.address.county}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, county: e.target.value } }))}
                placeholder="County"
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
              <input
                type="text"
                value={formData.address.postcode}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, postcode: e.target.value } }))}
                placeholder="Postcode *"
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
              <input
                type="text"
                value={formData.address.country}
                onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address, country: e.target.value } }))}
                placeholder="Country *"
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Pricing Summary</h4>
            <div className="text-sm space-y-1">
              <div>Base Fee: EUR{originalAmount}</div>
              {formData.hasOtherAssociations && (
                <div>Multi-Association Discount (20%): -EUR{originalAmount - baseAmount}</div>
              )}
              {rendezvousTotal > 0 && (
                <div className="text-amber-700">MGA Rendezvous Passes: EUR{rendezvousTotal.toLocaleString()}</div>
              )}
              <div className="font-semibold pt-2 border-t border-gray-300">Total: EUR{finalAmount.toLocaleString()}</div>
            </div>
          </div>
        </>
      )}

      {/* Reminder PDF Upload */}
      {selectedAction === 'reminder' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">PDF Attachment (optional)</label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFormData(prev => ({ ...prev, reminderAttachment: e.target.files?.[0] || null }))}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          />
        </div>
      )}

      {/* Rendezvous Confirmation Fields */}
      {selectedAction === 'rendezvous' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Registration ID *</label>
              <input
                type="text"
                value={formData.rendezvous.registrationId}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rendezvous: { ...prev.rendezvous, registrationId: e.target.value }
                }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Attendees *</label>
              <input
                type="number"
                value={formData.rendezvous.numberOfAttendees}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rendezvous: { ...prev.rendezvous, numberOfAttendees: parseInt(e.target.value) || 1 }
                }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                min="1"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attendee Names * (comma-separated)</label>
            <input
              type="text"
              value={formData.rendezvous.attendeeNames}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                rendezvous: { ...prev.rendezvous, attendeeNames: e.target.value }
              }))}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (EUR)</label>
              <input
                type="number"
                value={formData.rendezvous.totalAmount}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rendezvous: { ...prev.rendezvous, totalAmount: parseFloat(e.target.value) || 0 }
                }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                disabled={formData.rendezvous.isComplimentary}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rendezvous.isComplimentary}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    rendezvous: { ...prev.rendezvous, isComplimentary: e.target.checked, totalAmount: e.target.checked ? 0 : prev.rendezvous.totalAmount }
                  }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Complimentary</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className={`p-4 rounded-lg ${result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {result.error ? `Error: ${result.error}` : (result.message || 'Email sent successfully!')}
        </div>
      )}

      {/* Preview Display - Shows after clicking Preview */}
      {preview && !preview.error && (
        <div className="border-2 border-fase-navy rounded-lg overflow-hidden">
          <div className="bg-fase-navy px-4 py-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Email Preview</h4>
            <button onClick={() => setPreview(null)} className="text-sm text-white/70 hover:text-white">Edit</button>
          </div>
          <div className="p-4 bg-gray-50">
            <div className="text-sm space-y-1 mb-4">
              <div><span className="font-medium text-gray-600">To:</span> {preview.to}</div>
              {preview.cc && <div><span className="font-medium text-gray-600">CC:</span> {preview.cc}</div>}
              <div><span className="font-medium text-gray-600">Subject:</span> {preview.subject}</div>
            </div>
            {preview.htmlContent && (
              <div className="border border-gray-200 rounded bg-white p-3 max-h-64 overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: preview.htmlContent }} />
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button variant="primary" onClick={() => sendOrPreview(false)} disabled={sending}>
                {sending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Action Button - Preview (only shown when no preview yet) */}
      {!preview && (
        <div className="pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="primary"
            onClick={() => sendOrPreview(true)}
            disabled={previewing || sending || !formData.email}
            className="w-full"
          >
            {previewing ? 'Generating Preview...' : 'Preview Email'}
          </Button>
        </div>
      )}
    </div>
  );
}
