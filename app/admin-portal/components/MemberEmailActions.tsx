'use client';

import { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import { authFetch, authPost } from '@/lib/auth-fetch';
import { UnifiedMember } from '@/lib/unified-member';
import MemberInvoicePanel from './MemberInvoicePanel';
import { SUPPORTED_LANGUAGES, EMAIL_SENDERS } from '@/lib/email-constants';

interface MemberEmailActionsProps {
  memberData: UnifiedMember;
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

type EmailAction = 'invoice' | 'welcome' | 'rendezvous' | null;

const actionConfig = {
  invoice: {
    title: 'Send Invoice',
    description: 'Generate and send membership invoice',
    icon: '📄',
    apiEndpoint: '' // Handled by MemberInvoicePanel
  },
  welcome: {
    title: 'Welcome Email',
    description: 'Portal access for approved members',
    icon: '👋',
    apiEndpoint: '/api/send-member-portal-welcome'
  },
  rendezvous: {
    title: 'Rendezvous Confirmation',
    description: 'MGA Rendezvous ticket confirmation',
    icon: '🎫',
    apiEndpoint: '/api/send-rendezvous-confirmation'
  }
};

export default function MemberEmailActions({ memberData, companyId, onEmailSent }: MemberEmailActionsProps) {
  const [selectedAction, setSelectedAction] = useState<EmailAction>(null);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  // Recipient selection state
  const [subcollectionMembers, setSubcollectionMembers] = useState<SubcollectionMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set(['account_admin']));

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    cc: '',
    fullName: '',
    greeting: '',
    gender: 'm',
    organizationName: '',
    organizationType: 'MGA',
    userLocale: 'en',
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
        fullName: memberData?.primaryContact?.name || memberData.personalName || memberData?.fullName || '',
        organizationName: memberData.organizationName || '',
        organizationType: memberData.organizationType || 'MGA'
      }));
    }
  }, [memberData]);

  // Fetch subcollection members for recipient selection
  useEffect(() => {
    const fetchSubcollectionMembers = async () => {
      if (!companyId) return;

      setLoadingMembers(true);
      try {
        const response = await authFetch(`/api/admin/company-members?companyId=${companyId}`);
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
        name: memberData.primaryContact?.name || memberData.personalName || memberData.fullName || 'Account Admin',
        role: memberData.primaryContact?.role || memberData.jobTitle,
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

  // Update form email field based on selection
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

  const buildPayload = (isPreview: boolean) => {
    if (!selectedAction) return null;

    if (selectedAction === 'rendezvous') {
      return {
        preview: isPreview,
        email: formData.email,
        cc: formData.cc,
        companyName: formData.organizationName,
        organizationType: formData.organizationType,
        userLocale: formData.userLocale,
        freeformSender: formData.freeformSender,
        registrationId: formData.rendezvous.registrationId,
        numberOfAttendees: formData.rendezvous.numberOfAttendees,
        totalAmount: formData.rendezvous.totalAmount,
        attendeeNames: formData.rendezvous.attendeeNames,
        isFaseMember: formData.rendezvous.isFaseMember,
        isComplimentary: formData.rendezvous.isComplimentary,
        specialRequests: formData.rendezvous.specialRequests
      };
    }

    // welcome email
    return {
      preview: isPreview,
      email: formData.email,
      cc: formData.cc,
      fullName: formData.fullName,
      greeting: formData.greeting || formData.fullName,
      gender: formData.gender,
      organizationName: formData.organizationName,
      userLocale: formData.userLocale,
      freeformSender: formData.freeformSender
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

      if (isPreview) {
        const payload = buildPayload(true);
        const response = await authPost(config.apiEndpoint, payload);
        const data = await response.json();
        setPreview(data);
      } else {
        // For sending, determine recipients
        const selectedFromPills = getSelectedEmails();
        const formEmailList = formData.email.split(',').map(e => e.trim()).filter(Boolean);

        const expectedFromPills = selectedFromPills.join(', ');
        const isManuallyEdited = formData.email !== expectedFromPills && formData.email.trim() !== '';

        let emailsToSend: string[];
        let namesToSend: string[];

        if (isManuallyEdited) {
          emailsToSend = formEmailList;
          namesToSend = formEmailList.map(() => formData.fullName);
        } else {
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

          const payload = buildPayload(false);
          if (payload) {
            payload.email = email;
            payload.fullName = name;
          }

          try {
            const response = await authPost(config.apiEndpoint, payload);
            const data = await response.json();

            if (data.success || response.ok) {
              successCount++;
            } else {
              failCount++;
              errors.push(`${email}: ${data.error || 'Unknown error'}`);
            }

            // Rate limiting
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
            await authPost('/api/admin/activities', {
              accountId: companyId,
              type: 'email_sent',
              title: `${config.title} Sent`,
              description: `${config.title} sent to ${successCount} recipient${successCount !== 1 ? 's' : ''}`,
              performedBy: 'admin',
              performedByName: 'Admin'
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.entries(actionConfig) as [EmailAction, typeof actionConfig.welcome][]).map(([key, config]) => (
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

  // Invoice action renders MemberInvoicePanel
  if (selectedAction === 'invoice') {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-fase-navy transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to actions
        </button>
        <MemberInvoicePanel
          memberData={memberData}
          companyId={companyId}
          onInvoiceSent={onEmailSent}
        />
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
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Send From</label>
          <select
            value={formData.freeformSender}
            onChange={(e) => setFormData(prev => ({ ...prev, freeformSender: e.target.value }))}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
          >
            {EMAIL_SENDERS.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
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

      {/* Contact Details - for welcome email */}
      {selectedAction === 'welcome' && (
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

      {/* Preview Display */}
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

      {/* Primary Action Button - Preview */}
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
