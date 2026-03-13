'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Button from '../../../components/Button';
import { authFetch, authPost } from '@/lib/auth-fetch';

// Dynamic import to avoid SSR issues with TipTap
const RichTextEditor = dynamic(() => import('../../../components/RichTextEditor'), {
  ssr: false,
  loading: () => <div className="border border-gray-300 rounded-md bg-gray-50 min-h-[250px] flex items-center justify-center text-gray-500">Loading editor...</div>
});

type OrganizationType = 'MGA' | 'carrier' | 'provider';
type AccountStatus = 'pending' | 'pending_invoice' | 'invoice_sent' | 'approved' | 'flagged' | 'admin' | 'guest';

interface MassEmailRecipient {
  id: string;
  email: string;
  organizationName: string;
  organizationType: OrganizationType;
  status: AccountStatus;
  contactName?: string;
}

export default function FreeformEmailTab() {
  // Mass email state
  const [massEmailFilters, setMassEmailFilters] = useState({
    organizationTypes: [] as OrganizationType[],
    accountStatuses: [] as AccountStatus[]
  });
  const [massEmailContent, setMassEmailContent] = useState({
    subject: '',
    body: '',
    htmlBody: '',
    sender: 'admin@fasemga.com'
  });
  const [massEmailRecipients, setMassEmailRecipients] = useState<MassEmailRecipient[]>([]);
  const [manualRecipients, setManualRecipients] = useState<Array<{ name: string; email: string }>>([{ name: '', email: '' }]);
  const [csvRecipients, setCsvRecipients] = useState<MassEmailRecipient[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvError, setCsvError] = useState<string>('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendingMassEmail, setSendingMassEmail] = useState(false);
  const [massEmailResult, setMassEmailResult] = useState<{ success?: boolean; sent?: number; failed?: number; excluded?: number; error?: string } | null>(null);
  const [unsubscribedEmails, setUnsubscribedEmails] = useState<Set<string>>(new Set());

  // Step-through mode state
  const [stepThroughMode, setStepThroughMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepResults, setStepResults] = useState<Array<{ email: string; success: boolean; error?: string }>>([]);
  const [sendingCurrentStep, setSendingCurrentStep] = useState(false);

  // Single freeform email state
  const [singleEmail, setSingleEmail] = useState({
    to: '',
    cc: '',
    subject: '',
    body: '',
    sender: 'admin@fasemga.com',
    attachments: [] as File[]
  });
  const [sendingSingle, setSendingSingle] = useState(false);
  const [singleResult, setSingleResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [singleLocale, setSingleLocale] = useState('en');

  // Fetch recipients when filters change
  const fetchRecipients = useCallback(async () => {
    if (massEmailFilters.organizationTypes.length === 0 && massEmailFilters.accountStatuses.length === 0) {
      setMassEmailRecipients([]);
      return;
    }

    setLoadingRecipients(true);
    try {
      const response = await authPost('/api/admin/get-filtered-accounts', {
        organizationTypes: massEmailFilters.organizationTypes,
        accountStatuses: massEmailFilters.accountStatuses
      });

      if (!response.ok) throw new Error('Failed to fetch recipients');

      const data = await response.json();
      setMassEmailRecipients(data.accounts || []);
    } catch (error) {
      console.error('Error fetching recipients:', error);
      setMassEmailRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, [massEmailFilters]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  // Fetch unsubscribed emails on mount
  useEffect(() => {
    const fetchUnsubscribed = async () => {
      try {
        const response = await authFetch('/api/admin/get-unsubscribed');
        if (response.ok) {
          const data = await response.json();
          const emails = new Set<string>(
            (data.unsubscribed || []).map((u: { email: string }) => u.email.toLowerCase())
          );
          setUnsubscribedEmails(emails);
        }
      } catch (error) {
        console.error('Error fetching unsubscribed emails:', error);
      }
    };
    fetchUnsubscribed();
  }, []);

  const toggleOrganizationType = (type: OrganizationType) => {
    setMassEmailFilters(prev => ({
      ...prev,
      organizationTypes: prev.organizationTypes.includes(type)
        ? prev.organizationTypes.filter(t => t !== type)
        : [...prev.organizationTypes, type]
    }));
  };

  const toggleAccountStatus = (status: AccountStatus) => {
    setMassEmailFilters(prev => ({
      ...prev,
      accountStatuses: prev.accountStatuses.includes(status)
        ? prev.accountStatuses.filter(s => s !== status)
        : [...prev.accountStatuses, status]
    }));
  };

  const formatStatusLabel = (status: AccountStatus) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const parseManualRecipients = (): MassEmailRecipient[] => {
    return manualRecipients
      .filter(r => r.email.trim() && r.email.includes('@'))
      .map(r => ({
        id: `manual-${r.email}`,
        email: r.email.trim(),
        organizationName: 'Manual Entry',
        organizationType: 'MGA' as OrganizationType,
        status: 'approved' as AccountStatus,
        contactName: r.name.trim() || undefined
      }));
  };

  const updateManualRecipient = (index: number, field: 'name' | 'email', value: string) => {
    setManualRecipients(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addManualRecipientRow = () => {
    setManualRecipients(prev => [...prev, { name: '', email: '' }]);
  };

  const removeManualRecipientRow = (index: number) => {
    setManualRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvError('');
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length === 0) {
          setCsvError('CSV file is empty');
          setCsvRecipients([]);
          return;
        }

        // Parse header to find column indices
        const headerLine = lines[0].toLowerCase();
        const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));

        const emailIndex = headers.findIndex(h => h === 'email' || h === 'e-mail' || h === 'email address');
        const nameIndex = headers.findIndex(h => h === 'name' || h === 'contact' || h === 'contact name' || h === 'contactname');
        const orgIndex = headers.findIndex(h => h === 'organization' || h === 'organisation' || h === 'company' || h === 'org');

        if (emailIndex === -1) {
          setCsvError('CSV must have an "email" column');
          setCsvRecipients([]);
          return;
        }

        const parsed: MassEmailRecipient[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          // Simple CSV parsing (handles quoted fields)
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const char of line) {
            if (char === '"' && !inQuotes) {
              inQuotes = true;
            } else if (char === '"' && inQuotes) {
              inQuotes = false;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          const email = values[emailIndex]?.replace(/^["']|["']$/g, '').trim();
          if (!email || !email.includes('@')) continue;

          const name = nameIndex >= 0 ? values[nameIndex]?.replace(/^["']|["']$/g, '').trim() : '';
          const org = orgIndex >= 0 ? values[orgIndex]?.replace(/^["']|["']$/g, '').trim() : 'CSV Import';

          parsed.push({
            id: `csv-${email}`,
            email,
            organizationName: org || 'CSV Import',
            organizationType: 'MGA' as OrganizationType,
            status: 'approved' as AccountStatus,
            contactName: name || undefined
          });
        }

        if (parsed.length === 0) {
          setCsvError('No valid email addresses found in CSV');
          setCsvRecipients([]);
          return;
        }

        setCsvRecipients(parsed);
      } catch (err) {
        setCsvError('Failed to parse CSV file');
        setCsvRecipients([]);
      }
    };

    reader.onerror = () => {
      setCsvError('Failed to read file');
      setCsvRecipients([]);
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const clearCsv = () => {
    setCsvRecipients([]);
    setCsvFileName('');
    setCsvError('');
  };

  const getAllRecipients = (): MassEmailRecipient[] => {
    const manual = parseManualRecipients();
    const combined = [...massEmailRecipients, ...csvRecipients, ...manual];
    const seen = new Set<string>();
    return combined.filter(r => {
      if (seen.has(r.email.toLowerCase())) return false;
      seen.add(r.email.toLowerCase());
      return true;
    });
  };

  const getExcludedRecipients = (): MassEmailRecipient[] => {
    return getAllRecipients().filter(r => unsubscribedEmails.has(r.email.toLowerCase()));
  };

  const getActiveRecipients = (): MassEmailRecipient[] => {
    return getAllRecipients().filter(r => !unsubscribedEmails.has(r.email.toLowerCase()));
  };

  const handleSendMassEmail = async () => {
    setSendingMassEmail(true);
    setMassEmailResult(null);

    const allRecipients = getAllRecipients();

    try {
      const response = await authPost('/api/admin/send-mass-email', {
        recipients: allRecipients.map(r => ({ email: r.email, organizationName: r.organizationName, contactName: r.contactName || '' })),
        subject: massEmailContent.subject,
        body: massEmailContent.body,
        htmlBody: massEmailContent.htmlBody,
        sender: massEmailContent.sender
      });

      const data = await response.json();
      setMassEmailResult(data);

      if (data.success) {
        setShowConfirmModal(false);
      }
    } catch (error) {
      setMassEmailResult({ error: 'Failed to send mass email' });
    } finally {
      setSendingMassEmail(false);
    }
  };

  // Step-through mode: send one email at a time
  const startStepThroughMode = () => {
    setStepThroughMode(true);
    setCurrentStepIndex(0);
    setStepResults([]);
  };

  const exitStepThroughMode = () => {
    setStepThroughMode(false);
    setCurrentStepIndex(0);
    setShowConfirmModal(false);
  };

  const handleSendCurrentStep = async () => {
    const activeRecipients = getActiveRecipients();
    const recipient = activeRecipients[currentStepIndex];
    if (!recipient) return;

    setSendingCurrentStep(true);

    try {
      const response = await authPost('/api/admin/send-mass-email', {
        recipients: [{ email: recipient.email, organizationName: recipient.organizationName, contactName: recipient.contactName || '' }],
        subject: massEmailContent.subject,
        body: massEmailContent.body,
        htmlBody: massEmailContent.htmlBody,
        sender: massEmailContent.sender
      });

      const data = await response.json();

      if (data.success) {
        setStepResults(prev => [...prev, { email: recipient.email, success: true }]);
        // Auto-advance to next
        if (currentStepIndex < activeRecipients.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        }
      } else {
        setStepResults(prev => [...prev, { email: recipient.email, success: false, error: data.error || 'Failed' }]);
      }
    } catch (error) {
      setStepResults(prev => [...prev, { email: recipient.email, success: false, error: 'Network error' }]);
    } finally {
      setSendingCurrentStep(false);
    }
  };

  const handleSkipCurrentStep = () => {
    const activeRecipients = getActiveRecipients();
    const recipient = activeRecipients[currentStepIndex];
    if (recipient) {
      setStepResults(prev => [...prev, { email: recipient.email, success: false, error: 'Skipped' }]);
    }
    if (currentStepIndex < activeRecipients.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const getPersonalizedHtml = (html: string, name: string | undefined) => {
    const displayName = name || '{{name}}';
    return html.replace(/\{\{name\}\}/g, displayName);
  };

  const handleSendSingleEmail = async () => {
    setSendingSingle(true);
    setSingleResult(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append('email', singleEmail.to);
      formDataObj.append('cc', singleEmail.cc);
      formDataObj.append('freeformSubject', singleEmail.subject);
      formDataObj.append('freeformBody', singleEmail.body);
      formDataObj.append('freeformSender', singleEmail.sender);
      formDataObj.append('userLocale', singleLocale);
      formDataObj.append('preview', 'false');

      singleEmail.attachments.forEach((file) => {
        formDataObj.append('attachments', file);
      });

      const response = await authFetch('/api/send-freeform-email', {
        method: 'POST',
        body: formDataObj,
      });

      const data = await response.json();
      setSingleResult(data);

      if (data.success) {
        // Clear form on success
        setSingleEmail({
          to: '',
          cc: '',
          subject: '',
          body: '',
          sender: 'admin@fasemga.com',
          attachments: []
        });
      }
    } catch (error) {
      setSingleResult({ error: 'Failed to send email' });
    } finally {
      setSendingSingle(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Mass Email Section */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-6">Mass Email</h3>
        <p className="text-sm text-gray-600 mb-6">Send a freeform email to multiple recipients filtered by organization type and account status.</p>

        <div className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organization Type Filter */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-gray-700">Organization Type</h4>
              <div className="space-y-2">
                {(['MGA', 'carrier', 'provider'] as OrganizationType[]).map(type => (
                  <label key={type} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={massEmailFilters.organizationTypes.includes(type)}
                      onChange={() => toggleOrganizationType(type)}
                      className="w-4 h-4 text-fase-navy border-gray-300 rounded focus:ring-fase-navy"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {type === 'provider' ? 'Service Provider' : type === 'carrier' ? 'Carrier/Broker' : type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Account Status Filter */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-gray-700">Account Status</h4>
              <div className="grid grid-cols-2 gap-2">
                {(['pending', 'pending_invoice', 'invoice_sent', 'approved', 'flagged', 'admin', 'guest'] as AccountStatus[]).map(status => (
                  <label key={status} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={massEmailFilters.accountStatuses.includes(status)}
                      onChange={() => toggleAccountStatus(status)}
                      className="w-4 h-4 text-fase-navy border-gray-300 rounded focus:ring-fase-navy"
                    />
                    <span className="ml-2 text-sm text-gray-700">{formatStatusLabel(status)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* CSV Upload */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-gray-700">CSV Upload</h4>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {csvRecipients.length === 0 ? (
                <div className="text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer inline-flex items-center gap-2 text-fase-navy hover:text-fase-gold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium">Upload CSV file</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    CSV must have an &quot;email&quot; column. Optional: &quot;name&quot;, &quot;organization&quot;
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{csvFileName}</p>
                    <p className="text-xs text-green-600">
                      {csvRecipients.length} recipient{csvRecipients.length !== 1 ? 's' : ''} loaded
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearCsv}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              )}
              {csvError && (
                <p className="text-xs text-red-600 mt-2">{csvError}</p>
              )}
            </div>
          </div>

          {/* Manual Recipients */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-gray-700">Additional Recipients</h4>
            <div className="space-y-2">
              {manualRecipients.map((recipient, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={recipient.name}
                    onChange={(e) => updateManualRecipient(index, 'name', e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    placeholder="Name"
                  />
                  <input
                    type="email"
                    value={recipient.email}
                    onChange={(e) => updateManualRecipient(index, 'email', e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    placeholder="Email"
                  />
                  {manualRecipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeManualRecipientRow(index)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addManualRecipientRow}
                className="text-sm text-fase-navy hover:text-fase-gold"
              >
                + Add another
              </button>
            </div>
            {parseManualRecipients().length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {parseManualRecipients().length} manual recipient{parseManualRecipients().length !== 1 ? 's' : ''} added
              </p>
            )}
          </div>

          {/* Recipients Count */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {loadingRecipients ? 'Loading recipients...' : `${getAllRecipients().length} total recipient${getAllRecipients().length !== 1 ? 's' : ''}`}
              </span>
              {getAllRecipients().length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  className="text-sm text-fase-navy hover:text-fase-gold underline"
                >
                  View all recipients
                </button>
              )}
            </div>
          </div>

          {/* Email Content */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Send From *</label>
              <select
                value={massEmailContent.sender}
                onChange={(e) => setMassEmailContent(prev => ({ ...prev, sender: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="admin@fasemga.com">FASE Admin &lt;admin@fasemga.com&gt;</option>
                <option value="william.pitt@fasemga.com">William Pitt &lt;william.pitt@fasemga.com&gt;</option>
                <option value="info@fasemga.com">FASE Info &lt;info@fasemga.com&gt;</option>
                <option value="media@fasemga.com">FASE Media &lt;media@fasemga.com&gt;</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
              <input
                type="text"
                value={massEmailContent.subject}
                onChange={(e) => setMassEmailContent(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="Enter email subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message Body *</label>
              <p className="text-xs text-gray-500 mb-2">Use {"{{name}}"} for personalization</p>
              <RichTextEditor
                content={massEmailContent.htmlBody}
                onChange={(html) => {
                  // Extract plain text for fallback
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = html;
                  const plainText = tempDiv.textContent || tempDiv.innerText || '';
                  setMassEmailContent(prev => ({ ...prev, htmlBody: html, body: plainText }));
                }}
                placeholder="Enter your email message..."
              />
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              disabled={getAllRecipients().length === 0 || !massEmailContent.subject || (!massEmailContent.body && !massEmailContent.htmlBody)}
              onClick={() => setShowConfirmModal(true)}
            >
              Review & Send
            </Button>
          </div>

          {/* Result Display */}
          {massEmailResult && (
            <div className={`p-4 rounded-lg ${massEmailResult.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
              {massEmailResult.error
                ? `Error: ${massEmailResult.error}`
                : `Successfully sent ${massEmailResult.sent} email${massEmailResult.sent !== 1 ? 's' : ''}${massEmailResult.failed ? `, ${massEmailResult.failed} failed` : ''}${massEmailResult.excluded ? ` (${massEmailResult.excluded} excluded - unsubscribed)` : ''}`}
            </div>
          )}
        </div>
      </div>

      {/* Single Freeform Email Section */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-6">Single Email</h3>
        <p className="text-sm text-gray-600 mb-6">Send a one-off email to any address with optional attachments.</p>

        <div className="space-y-4">
          {/* Language for signature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Signature Language</label>
            <select
              value={singleLocale}
              onChange={(e) => setSingleLocale(e.target.value)}
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

          {/* Recipients */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To *</label>
              <input
                type="email"
                value={singleEmail.to}
                onChange={(e) => setSingleEmail(prev => ({ ...prev, to: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="recipient@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CC</label>
              <input
                type="email"
                value={singleEmail.cc}
                onChange={(e) => setSingleEmail(prev => ({ ...prev, cc: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="cc@example.com"
              />
            </div>
          </div>

          {/* Sender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Send From *</label>
            <select
              value={singleEmail.sender}
              onChange={(e) => setSingleEmail(prev => ({ ...prev, sender: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="admin@fasemga.com">FASE Admin &lt;admin@fasemga.com&gt;</option>
              <option value="william.pitt@fasemga.com">William Pitt &lt;william.pitt@fasemga.com&gt;</option>
              <option value="info@fasemga.com">FASE Info &lt;info@fasemga.com&gt;</option>
              <option value="media@fasemga.com">FASE Media &lt;media@fasemga.com&gt;</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
            <input
              type="text"
              value={singleEmail.subject}
              onChange={(e) => setSingleEmail(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder="Enter email subject"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Body *</label>
            <textarea
              value={singleEmail.body}
              onChange={(e) => setSingleEmail(prev => ({ ...prev, body: e.target.value }))}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              rows={8}
              placeholder="Enter your email message..."
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
            <input
              type="file"
              multiple
              onChange={(e) => {
                const newFiles = Array.from(e.target.files || []);
                setSingleEmail(prev => ({ ...prev, attachments: [...prev.attachments, ...newFiles] }));
                e.target.value = '';
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            />
            {singleEmail.attachments.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-gray-600">Selected files ({singleEmail.attachments.length}):</span>
                  <button
                    type="button"
                    onClick={() => setSingleEmail(prev => ({ ...prev, attachments: [] }))}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-1">
                  {singleEmail.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                      <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button
                        type="button"
                        onClick={() => setSingleEmail(prev => ({
                          ...prev,
                          attachments: prev.attachments.filter((_, i) => i !== index)
                        }))}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              disabled={sendingSingle || !singleEmail.to || !singleEmail.subject || !singleEmail.body}
              onClick={handleSendSingleEmail}
            >
              {sendingSingle ? 'Sending...' : 'Send Email'}
            </Button>
          </div>

          {/* Result Display */}
          {singleResult && (
            <div className={`p-4 rounded-lg ${singleResult.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
              {singleResult.error ? `Error: ${singleResult.error}` : 'Email sent successfully!'}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Mass Email */}
      {showConfirmModal && !stepThroughMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Review & Send Mass Email</h3>
            </div>

            <div className="p-6 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Email Preview */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Email Preview</p>
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 p-2">
                    <div
                      className="bg-white"
                      dangerouslySetInnerHTML={{
                        __html: `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                            <div style="border: 1px solid #e5e7eb; padding: 30px; border-radius: 6px;">
                              <div style="text-align: center; margin-bottom: 30px;">
                                <img src="https://fasemga.com/FASE-Logo-Lockup-RGB.png" alt="FASE Logo" style="max-width: 200px; height: auto;">
                              </div>
                              <div style="font-size: 14px; line-height: 1.6; color: #333;" class="email-preview-content">
                                <style>
                                  .email-preview-content p { margin: 0 0 1em 0; }
                                  .email-preview-content p:last-child { margin-bottom: 0; }
                                  .email-preview-content ul, .email-preview-content ol { margin: 0 0 1em 0; padding-left: 1.5em; }
                                  .email-preview-content h2 { margin: 1em 0 0.5em 0; font-size: 1.25em; font-weight: bold; }
                                </style>
                                ${(massEmailContent.htmlBody || '<p style="color: #999; font-style: italic;">No content</p>').replace(
                                  /\{\{name\}\}/g,
                                  '<span style="background-color: #dbeafe; color: #1d4ed8; padding: 1px 4px; border-radius: 3px; font-family: monospace;">{{name}}</span>'
                                )}
                              </div>
                            </div>
                          </div>
                        `
                      }}
                    />
                  </div>
                  <div className="mt-3 text-xs text-gray-500 space-y-1">
                    <p><strong>Subject:</strong> {massEmailContent.subject}</p>
                    <p><strong>From:</strong> {massEmailContent.sender}</p>
                  </div>
                </div>

                {/* Recipients List */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Will receive ({getActiveRecipients().length})
                  </p>
                  <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                    {getActiveRecipients().map((recipient, index) => (
                      <div key={recipient.id || index} className="text-sm px-3 py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{recipient.email}</span>
                          <span className="text-gray-500 text-xs ml-2 shrink-0">{recipient.organizationType}</span>
                        </div>
                        <div className="text-xs mt-0.5 flex items-center gap-1">
                          <span className="text-gray-400">{"{{name}}"}:</span>
                          {recipient.contactName ? (
                            <span className="text-gray-600">{recipient.contactName}</span>
                          ) : (
                            <span className="text-red-600 font-medium">NO NAME</span>
                          )}
                          {recipient.organizationName && recipient.organizationName !== 'Manual Entry' && recipient.organizationName !== 'CSV Import' && (
                            <span className="text-gray-400 ml-1">· {recipient.organizationName}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Excluded (Unsubscribed) Recipients */}
                  {getExcludedRecipients().length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-red-600 mb-2">
                        Excluded - Unsubscribed ({getExcludedRecipients().length})
                      </p>
                      <div className="border border-red-200 bg-red-50 rounded-lg max-h-32 overflow-y-auto">
                        {getExcludedRecipients().map((recipient, index) => (
                          <div key={recipient.id || index} className="text-sm px-3 py-2 border-b border-red-100 last:border-b-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate text-red-700">{recipient.email}</span>
                            </div>
                            {recipient.organizationName && recipient.organizationName !== 'Manual Entry' && recipient.organizationName !== 'CSV Import' && (
                              <div className="text-xs text-red-500 mt-0.5">{recipient.organizationName}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={sendingMassEmail}
              >
                Cancel
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={startStepThroughMode}
                  disabled={sendingMassEmail}
                >
                  Send One-by-One
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSendMassEmail}
                  disabled={sendingMassEmail}
                >
                  {sendingMassEmail ? 'Sending...' : `Send All (${getActiveRecipients().length})`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step-Through Modal */}
      {showConfirmModal && stepThroughMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {(() => {
              const activeRecipients = getActiveRecipients();
              const currentRecipient = activeRecipients[currentStepIndex];
              const isComplete = currentStepIndex >= activeRecipients.length || !currentRecipient;
              const alreadySent = stepResults.some(r => r.email === currentRecipient?.email);

              return (
                <>
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
                        {isComplete ? 'Sending Complete' : `Sending Email ${currentStepIndex + 1} of ${activeRecipients.length}`}
                      </h3>
                      <div className="text-sm text-gray-500">
                        {stepResults.filter(r => r.success).length} sent · {stepResults.filter(r => !r.success && r.error !== 'Skipped').length} failed · {stepResults.filter(r => r.error === 'Skipped').length} skipped
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-fase-navy transition-all duration-300"
                        style={{ width: `${(stepResults.length / activeRecipients.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {isComplete ? (
                      <div className="space-y-4">
                        <div className="text-center py-8">
                          <div className="text-5xl mb-4">✓</div>
                          <p className="text-lg font-medium text-gray-800">All emails processed</p>
                          <p className="text-sm text-gray-600 mt-2">
                            {stepResults.filter(r => r.success).length} sent successfully
                            {stepResults.filter(r => !r.success).length > 0 && `, ${stepResults.filter(r => !r.success).length} not sent`}
                          </p>
                        </div>
                        {/* Results summary */}
                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                          {stepResults.map((result, idx) => (
                            <div key={idx} className={`text-sm px-3 py-2 border-b border-gray-100 last:border-b-0 flex items-center justify-between ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                              <span className="truncate">{result.email}</span>
                              <span className={`text-xs font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                                {result.success ? 'Sent' : result.error || 'Failed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Current recipient info */}
                        <div>
                          <div className="mb-4 p-4 bg-fase-navy/5 rounded-lg border border-fase-navy/20">
                            <p className="text-sm font-medium text-fase-navy mb-1">Sending to:</p>
                            <p className="text-lg font-semibold text-gray-900">{currentRecipient?.email}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Name: <span className={currentRecipient?.contactName ? 'font-medium' : 'text-red-600'}>{currentRecipient?.contactName || 'NO NAME'}</span>
                            </p>
                            {currentRecipient?.organizationName && currentRecipient.organizationName !== 'Manual Entry' && currentRecipient.organizationName !== 'CSV Import' && (
                              <p className="text-sm text-gray-500">{currentRecipient.organizationName}</p>
                            )}
                          </div>

                          {/* Recent results */}
                          {stepResults.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Recent:</p>
                              <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                                {stepResults.slice(-5).reverse().map((result, idx) => (
                                  <div key={idx} className={`text-sm px-3 py-1.5 border-b border-gray-100 last:border-b-0 flex items-center justify-between ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                    <span className="truncate text-xs">{result.email}</span>
                                    <span className="text-xs">{result.success ? '✓' : '✗'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Personalized preview */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-3">Preview for this recipient:</p>
                          <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 p-2 max-h-80 overflow-y-auto">
                            <div
                              className="bg-white text-sm"
                              dangerouslySetInnerHTML={{
                                __html: `
                                  <div style="font-family: Arial, sans-serif; padding: 15px; background-color: #ffffff;">
                                    <div style="font-size: 13px; line-height: 1.5; color: #333;" class="email-preview-content">
                                      <style>
                                        .email-preview-content p { margin: 0 0 0.8em 0; }
                                        .email-preview-content p:last-child { margin-bottom: 0; }
                                      </style>
                                      ${getPersonalizedHtml(
                                        massEmailContent.htmlBody || '<p style="color: #999;">No content</p>',
                                        currentRecipient?.contactName
                                      )}
                                    </div>
                                  </div>
                                `
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t border-gray-200 flex justify-between">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={exitStepThroughMode}
                    >
                      {isComplete ? 'Close' : 'Stop & Exit'}
                    </Button>
                    {!isComplete && !alreadySent && (
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleSkipCurrentStep}
                          disabled={sendingCurrentStep}
                        >
                          Skip
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleSendCurrentStep}
                          disabled={sendingCurrentStep}
                        >
                          {sendingCurrentStep ? 'Sending...' : 'Send This Email'}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
