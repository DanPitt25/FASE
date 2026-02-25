'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { UnifiedMember } from '../../../lib/unified-member';
import { Activity, Note, NoteCategory } from '../../../lib/firestore';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';
import CompanyDetailsTab from './CompanyDetailsTab';
import MemberEmailActions from './MemberEmailActions';

interface CompanyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  memberData?: any;
  onStatusUpdate?: (memberId: string, newStatus: UnifiedMember['status']) => void;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  sentAt: any;
  paidAt?: any;
  paymentMethod?: string;
}

type ModalTab = 'actions' | 'company' | 'timeline' | 'notes' | 'payments';

export default function CompanyMembersModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  memberData,
  onStatusUpdate
}: CompanyMembersModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('actions');

  // CRM State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);

  // New note form
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteCategory>('general');
  const [savingNote, setSavingNote] = useState(false);

  // Status change state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadCrmData = useCallback(async () => {
    if (!companyId) return;

    setCrmLoading(true);
    try {
      const [activitiesRes, notesRes] = await Promise.all([
        fetch(`/api/admin/activities?account_id=${companyId}&limit=50`),
        fetch(`/api/admin/notes?account_id=${companyId}`),
      ]);

      const [activitiesData, notesData] = await Promise.all([
        activitiesRes.json(),
        notesRes.json(),
      ]);

      if (activitiesData.success) setActivities(activitiesData.activities);
      if (notesData.success) setNotes(notesData.notes);

      try {
        const invoicesRes = await fetch(`/api/admin/account-invoices?account_id=${companyId}`);
        const invoicesData = await invoicesRes.json();
        if (invoicesData.success) {
          setInvoices(invoicesData.invoices);
        }
      } catch {
        // Invoice endpoint may not exist yet
      }
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    } finally {
      setCrmLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (isOpen && companyId) {
      loadCrmData();
    }
  }, [isOpen, companyId, loadCrmData]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('actions');
    }
  }, [isOpen]);

  // CRM Handlers
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSavingNote(true);
    try {
      const response = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: companyId,
          content: newNote,
          category: noteCategory,
          createdBy: 'admin',
          createdByName: 'Admin',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewNote('');
        await loadCrmData();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    try {
      await fetch('/api/admin/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: companyId,
          noteId,
          isPinned: !isPinned,
        }),
      });
      await loadCrmData();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      await fetch(`/api/admin/notes?account_id=${companyId}&note_id=${noteId}`, {
        method: 'DELETE',
      });
      await loadCrmData();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Status change handler
  const handleStatusChange = async (newStatus: UnifiedMember['status']) => {
    if (!memberData || !onStatusUpdate) return;

    setUpdatingStatus(true);

    try {
      onStatusUpdate(memberData.id, newStatus);

      // Log activity to timeline
      try {
        await fetch('/api/admin/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: companyId,
            type: 'status_change',
            title: 'Status Changed',
            description: `Status changed from "${memberData.status}" to "${newStatus}"`,
            performedBy: 'admin',
            performedByName: 'Admin'
          })
        });
        await loadCrmData();
      } catch (activityError) {
        console.error('Failed to log activity:', activityError);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return '-';
    const date = dateValue?.toDate?.() || new Date(dateValue);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      email_sent: '📧',
      status_change: '🔄',
      payment_received: '💰',
      invoice_sent: '📄',
      invoice_paid: '✅',
      note_added: '📝',
      member_added: '👤',
      member_removed: '👤',
      task_created: '📋',
      task_completed: '✓',
      wise_transfer: '🏦',
      stripe_payment: '💳',
      bio_updated: '📖',
      logo_updated: '🖼️',
      manual_entry: '✏️',
    };
    return icons[type] || '•';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pending_invoice': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'pending_payment': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'invoice_sent': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'internal': return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'admin': return 'bg-red-100 text-red-800 border-red-300';
      case 'flagged': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const statusOptions: { value: UnifiedMember['status']; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'pending_invoice', label: 'Pending Invoice' },
    { value: 'invoice_sent', label: 'Invoice Sent' },
    { value: 'approved', label: 'Approved' },
    { value: 'internal', label: 'Internal' },
    { value: 'flagged', label: 'Flagged' },
    { value: 'admin', label: 'Admin' },
  ];

  const tabs: { id: ModalTab; label: string; count?: number }[] = [
    { id: 'actions', label: 'Actions' },
    { id: 'company', label: 'Company' },
    { id: 'timeline', label: 'Timeline', count: activities.length },
    { id: 'notes', label: 'Notes', count: notes.length },
    { id: 'payments', label: 'Payments', count: invoices.length },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={companyName}
      maxWidth="6xl"
    >
      <div className="h-[700px] flex flex-col">
        {/* Summary Header */}
        {memberData && (
          <div className="bg-gradient-to-r from-fase-navy to-fase-navy/90 text-white p-4 rounded-lg mb-4 flex-shrink-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{memberData.organizationName}</h3>
                <div className="text-sm text-gray-200">
                  {memberData.personalName || memberData.accountAdministrator?.name}
                  {memberData.email && <span className="mx-2">•</span>}
                  {memberData.email}
                </div>
              </div>

              {/* Status Dropdown */}
              <div className="flex items-center gap-3">
                <select
                  value={memberData.status}
                  onChange={(e) => handleStatusChange(e.target.value as UnifiedMember['status'])}
                  disabled={updatingStatus}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border cursor-pointer ${getStatusColor(memberData.status)}`}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {updatingStatus && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <nav className="flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-fase-navy text-fase-navy'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* ACTIONS TAB - Email Actions */}
          {activeTab === 'actions' && (
            <MemberEmailActions
              memberData={memberData}
              companyId={companyId}
              onEmailSent={loadCrmData}
            />
          )}

          {/* COMPANY TAB */}
          {activeTab === 'company' && (
            <CompanyDetailsTab
              companyId={companyId}
              memberData={memberData}
              onDataChange={loadCrmData}
            />
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {crmLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fase-navy mx-auto"></div>
                </div>
              ) : activities.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No activity recorded yet</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  {activities.map((activity) => (
                    <div key={activity.id} className="relative pl-10 pb-4">
                      <div className="absolute left-2 w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-xs">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="font-medium text-gray-900">{activity.title}</div>
                          <div className="text-xs text-gray-500">{formatDateTime(activity.createdAt)}</div>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          by {activity.performedByName || 'System'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note Form */}
              <div className="bg-gray-50 rounded-lg p-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-fase-navy focus:border-transparent resize-none"
                  rows={3}
                />
                <div className="flex justify-between items-center mt-3">
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as NoteCategory)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm"
                  >
                    <option value="general">General</option>
                    <option value="payment">Payment</option>
                    <option value="support">Support</option>
                    <option value="sales">Sales</option>
                  </select>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || savingNote}
                  >
                    {savingNote ? 'Saving...' : 'Add Note'}
                  </Button>
                </div>
              </div>

              {/* Notes List */}
              {crmLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fase-navy mx-auto"></div>
                </div>
              ) : notes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={`bg-white border rounded-lg p-4 ${
                        note.isPinned ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>{note.createdByName}</span>
                            <span>•</span>
                            <span>{formatDateTime(note.createdAt)}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full ${
                                note.category === 'payment'
                                  ? 'bg-green-100 text-green-700'
                                  : note.category === 'support'
                                  ? 'bg-blue-100 text-blue-700'
                                  : note.category === 'sales'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {note.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleTogglePin(note.id, note.isPinned || false)}
                            className={`p-1 rounded hover:bg-gray-100 ${
                              note.isPinned ? 'text-yellow-500' : 'text-gray-400'
                            }`}
                          >
                            📌
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {crmLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fase-navy mx-auto"></div>
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No invoices found for this account</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {invoice.currency} {invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                invoice.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : invoice.status === 'overdue'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.sentAt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {invoice.paidAt ? formatDate(invoice.paidAt) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {invoice.paymentMethod ? (
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  invoice.paymentMethod === 'stripe'
                                    ? 'bg-purple-100 text-purple-700'
                                    : invoice.paymentMethod === 'wise'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {invoice.paymentMethod}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
