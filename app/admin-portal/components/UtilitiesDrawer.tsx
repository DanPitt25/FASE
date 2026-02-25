'use client';

import { useState } from 'react';
import TasksTab from './TasksTab';
import ReportsTab from './ReportsTab';

type UtilitySection = 'tasks' | 'reports' | 'mass-email' | 'freeform';

interface UtilitiesDrawerProps {
  defaultOpen?: boolean;
}

export default function UtilitiesDrawer({ defaultOpen = false }: UtilitiesDrawerProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeSection, setActiveSection] = useState<UtilitySection>('tasks');

  const sections = [
    { id: 'tasks' as const, label: 'Tasks', icon: '✓' },
    { id: 'reports' as const, label: 'Reports', icon: '📊' },
    { id: 'mass-email' as const, label: 'Mass Email', icon: '📧' },
    { id: 'freeform' as const, label: 'Custom Email', icon: '✉️' }
  ];

  return (
    <div className="mt-6">
      {/* Drawer Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="font-medium text-gray-700">Utilities</span>
        </div>
        <span className="text-xs text-gray-500">Tasks, Reports, Mass Email</span>
      </button>

      {/* Drawer Content */}
      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Section Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === section.id
                    ? 'bg-fase-navy text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          {/* Section Content */}
          <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
            {activeSection === 'tasks' && <TasksTab />}
            {activeSection === 'reports' && <ReportsTab />}
            {activeSection === 'mass-email' && <MassEmailSection />}
            {activeSection === 'freeform' && <FreeformEmailSection />}
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified Mass Email Section (extracted from EmailsTab)
function MassEmailSection() {
  const [filters, setFilters] = useState({
    organizationTypes: [] as string[],
    accountStatuses: [] as string[]
  });
  const [content, setContent] = useState({ subject: '', body: '', sender: 'admin@fasemga.com' });
  const [recipients, setRecipients] = useState<any[]>([]);
  const [manualRecipients, setManualRecipients] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const orgTypes = ['MGA', 'carrier', 'provider'];
  const statuses = ['pending', 'pending_invoice', 'invoice_sent', 'approved', 'flagged', 'admin'];

  const toggleFilter = (type: 'org' | 'status', value: string) => {
    if (type === 'org') {
      setFilters(prev => ({
        ...prev,
        organizationTypes: prev.organizationTypes.includes(value)
          ? prev.organizationTypes.filter(t => t !== value)
          : [...prev.organizationTypes, value]
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        accountStatuses: prev.accountStatuses.includes(value)
          ? prev.accountStatuses.filter(s => s !== value)
          : [...prev.accountStatuses, value]
      }));
    }
  };

  const fetchRecipients = async () => {
    if (filters.organizationTypes.length === 0 && filters.accountStatuses.length === 0) {
      setRecipients([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/get-filtered-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationTypes: filters.organizationTypes,
          accountStatuses: filters.accountStatuses
        })
      });
      const data = await response.json();
      setRecipients(data.accounts || []);
    } catch (error) {
      console.error('Error fetching recipients:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseManualRecipients = () => {
    if (!manualRecipients.trim()) return [];
    return manualRecipients
      .split(/[,;\n]+/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'))
      .map(email => ({ email, organizationName: 'Manual Entry' }));
  };

  const getAllRecipients = () => {
    const manual = parseManualRecipients();
    const combined = [...recipients, ...manual];
    const seen = new Set<string>();
    return combined.filter(r => {
      if (seen.has(r.email.toLowerCase())) return false;
      seen.add(r.email.toLowerCase());
      return true;
    });
  };

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/send-mass-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: getAllRecipients().map(r => ({ email: r.email, organizationName: r.organizationName })),
          subject: content.subject,
          body: content.body,
          sender: content.sender
        })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to send mass email' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-fase-navy">Send Mass Email</h3>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Organization Type</h4>
          <div className="space-y-2">
            {orgTypes.map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.organizationTypes.includes(type)}
                  onChange={() => toggleFilter('org', type)}
                  className="w-4 h-4 text-fase-navy rounded"
                />
                <span className="text-sm">{type === 'provider' ? 'Service Provider' : type === 'carrier' ? 'Carrier/Broker' : type}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Account Status</h4>
          <div className="grid grid-cols-2 gap-2">
            {statuses.map(status => (
              <label key={status} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.accountStatuses.includes(status)}
                  onChange={() => toggleFilter('status', status)}
                  className="w-4 h-4 text-fase-navy rounded"
                />
                <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={fetchRecipients}
        disabled={loading}
        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? 'Loading...' : 'Load Recipients'}
      </button>

      {/* Manual Recipients */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Recipients</label>
        <textarea
          value={manualRecipients}
          onChange={(e) => setManualRecipients(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          rows={2}
          placeholder="Enter emails (comma, semicolon, or newline separated)"
        />
      </div>

      {/* Recipient Count */}
      <div className="bg-gray-50 px-4 py-3 rounded-lg">
        <span className="text-sm font-medium">{getAllRecipients().length} total recipients</span>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
          <select
            value={content.sender}
            onChange={(e) => setContent(prev => ({ ...prev, sender: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="admin@fasemga.com">FASE Admin</option>
            <option value="william.pitt@fasemga.com">William Pitt</option>
            <option value="info@fasemga.com">FASE Info</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
          <input
            type="text"
            value={content.subject}
            onChange={(e) => setContent(prev => ({ ...prev, subject: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Email subject"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
          <textarea
            value={content.body}
            onChange={(e) => setContent(prev => ({ ...prev, body: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={8}
            placeholder="Email message... Use {{name}} for personalization"
          />
        </div>
      </div>

      {result && (
        <div className={`p-4 rounded-lg ${result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {result.error ? `Error: ${result.error}` : `Sent ${result.sent} emails`}
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || getAllRecipients().length === 0 || !content.subject || !content.body}
        className="w-full px-4 py-3 bg-fase-navy text-white rounded-lg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50"
      >
        {sending ? 'Sending...' : `Send to ${getAllRecipients().length} recipients`}
      </button>
    </div>
  );
}

// Simplified Freeform Email Section
function FreeformEmailSection() {
  const [formData, setFormData] = useState({
    email: '',
    cc: '',
    sender: 'admin@fasemga.com',
    subject: '',
    body: '',
    userLocale: 'en'
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const formDataObj = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataObj.append(key, value);
      });
      formDataObj.append('freeformSubject', formData.subject);
      formDataObj.append('freeformBody', formData.body);
      formDataObj.append('freeformSender', formData.sender);
      attachments.forEach((file) => {
        formDataObj.append('attachments', file);
      });

      const response = await fetch('/api/send-freeform-email', {
        method: 'POST',
        body: formDataObj
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setFormData({ email: '', cc: '', sender: 'admin@fasemga.com', subject: '', body: '', userLocale: 'en' });
        setAttachments([]);
      }
    } catch (error) {
      setResult({ error: 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="space-y-6">
      <h3 className="text-lg font-semibold text-fase-navy">Send Custom Email</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            required
            placeholder="recipient@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CC</label>
          <input
            type="email"
            value={formData.cc}
            onChange={(e) => setFormData(prev => ({ ...prev, cc: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="cc@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
          <select
            value={formData.sender}
            onChange={(e) => setFormData(prev => ({ ...prev, sender: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="admin@fasemga.com">FASE Admin</option>
            <option value="william.pitt@fasemga.com">William Pitt</option>
            <option value="info@fasemga.com">FASE Info</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Signature Language</label>
          <select
            value={formData.userLocale}
            onChange={(e) => setFormData(prev => ({ ...prev, userLocale: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="it">Italiano</option>
            <option value="nl">Nederlands</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
        <input
          type="text"
          value={formData.subject}
          onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          required
          placeholder="Email subject"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          rows={10}
          required
          placeholder="Your email message..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
        <input
          type="file"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setAttachments(prev => [...prev, ...files]);
            e.target.value = '';
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        {attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {attachments.map((file, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {result && (
        <div className={`p-4 rounded-lg ${result.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          {result.error ? `Error: ${result.error}` : 'Email sent successfully!'}
        </div>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full px-4 py-3 bg-fase-navy text-white rounded-lg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50"
      >
        {sending ? 'Sending...' : 'Send Email'}
      </button>
    </form>
  );
}
