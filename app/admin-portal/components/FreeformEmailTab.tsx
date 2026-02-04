'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '../../../components/Button';

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
    sender: 'admin@fasemga.com'
  });
  const [massEmailRecipients, setMassEmailRecipients] = useState<MassEmailRecipient[]>([]);
  const [manualRecipients, setManualRecipients] = useState<string>('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendingMassEmail, setSendingMassEmail] = useState(false);
  const [massEmailResult, setMassEmailResult] = useState<{ success?: boolean; sent?: number; failed?: number; error?: string } | null>(null);

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
      const response = await fetch('/api/admin/get-filtered-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationTypes: massEmailFilters.organizationTypes,
          accountStatuses: massEmailFilters.accountStatuses
        })
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
    if (!manualRecipients.trim()) return [];
    const emails = manualRecipients
      .split(/[,;\n]+/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));
    return emails.map(email => ({
      id: `manual-${email}`,
      email,
      organizationName: 'Manual Entry',
      organizationType: 'MGA' as OrganizationType,
      status: 'approved' as AccountStatus
    }));
  };

  const getAllRecipients = (): MassEmailRecipient[] => {
    const manual = parseManualRecipients();
    const combined = [...massEmailRecipients, ...manual];
    const seen = new Set<string>();
    return combined.filter(r => {
      if (seen.has(r.email.toLowerCase())) return false;
      seen.add(r.email.toLowerCase());
      return true;
    });
  };

  const handleSendMassEmail = async () => {
    setSendingMassEmail(true);
    setMassEmailResult(null);

    const allRecipients = getAllRecipients();

    try {
      const response = await fetch('/api/admin/send-mass-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: allRecipients.map(r => ({ email: r.email, organizationName: r.organizationName, contactName: r.contactName || '' })),
          subject: massEmailContent.subject,
          body: massEmailContent.body,
          sender: massEmailContent.sender
        })
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

      const response = await fetch('/api/send-freeform-email', {
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

          {/* Manual Recipients */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-gray-700">Additional Recipients</h4>
            <textarea
              value={manualRecipients}
              onChange={(e) => setManualRecipients(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              rows={3}
              placeholder="Enter additional email addresses (comma, semicolon, or newline separated)"
            />
            {parseManualRecipients().length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
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
                <option value="aline.sullivan@fasemga.com">Aline Sullivan &lt;aline.sullivan@fasemga.com&gt;</option>
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
              <textarea
                value={massEmailContent.body}
                onChange={(e) => setMassEmailContent(prev => ({ ...prev, body: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                rows={8}
                placeholder="Enter your email message... Use {{name}} for personalization"
              />
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="primary"
              disabled={getAllRecipients().length === 0 || !massEmailContent.subject || !massEmailContent.body}
              onClick={() => setShowConfirmModal(true)}
            >
              Review & Send ({getAllRecipients().length})
            </Button>
          </div>

          {/* Result Display */}
          {massEmailResult && (
            <div className={`p-4 rounded-lg ${massEmailResult.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
              {massEmailResult.error
                ? `Error: ${massEmailResult.error}`
                : `Successfully sent ${massEmailResult.sent} email${massEmailResult.sent !== 1 ? 's' : ''}${massEmailResult.failed ? `, ${massEmailResult.failed} failed` : ''}`}
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
              <option value="aline.sullivan@fasemga.com">Aline Sullivan &lt;aline.sullivan@fasemga.com&gt;</option>
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
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Confirm Mass Email</h3>
              <p className="text-sm text-gray-600 mt-1">Review the recipients before sending</p>
            </div>

            <div className="p-6 max-h-[50vh] overflow-y-auto">
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700">Subject: <span className="font-normal">{massEmailContent.subject}</span></p>
                <p className="text-sm font-medium text-gray-700 mt-2">From: <span className="font-normal">{massEmailContent.sender}</span></p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Recipients ({getAllRecipients().length}):</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getAllRecipients().map((recipient, index) => (
                    <div key={recipient.id || index} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                      <span className="font-medium">{recipient.email}</span>
                      <span className="text-gray-500 text-xs">{recipient.organizationName} ({recipient.organizationType})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={sendingMassEmail}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSendMassEmail}
                disabled={sendingMassEmail}
              >
                {sendingMassEmail ? 'Sending...' : `Send to ${getAllRecipients().length} recipient${getAllRecipients().length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
