'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getCompanyMembers, CompanyMember } from '../../../lib/unified-member';
import { Activity, Note, NoteCategory } from '../../../lib/firestore';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';

interface CompanyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
}

interface CompanyData {
  website?: string;
}

interface MemberFormData {
  email: string;
  personalName: string;
  jobTitle: string;
  isAccountAdministrator: boolean;
  accountConfirmed: boolean;
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

type ModalTab = 'members' | 'timeline' | 'notes' | 'payments';

export default function CompanyMembersModal({
  isOpen,
  onClose,
  companyId,
  companyName
}: CompanyMembersModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>('members');
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData>({ website: '' });
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyFormData, setCompanyFormData] = useState<CompanyData>({ website: '' });
  const [formData, setFormData] = useState<MemberFormData>({
    email: '',
    personalName: '',
    jobTitle: '',
    isAccountAdministrator: false,
    accountConfirmed: false
  });

  // CRM State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);

  // New note form
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteCategory>('general');
  const [savingNote, setSavingNote] = useState(false);

  const resetForm = () => {
    setFormData({
      email: '',
      personalName: '',
      jobTitle: '',
      isAccountAdministrator: false,
      accountConfirmed: false
    });
    setEditingMember(null);
    setShowAddForm(false);
  };

  const updateAccountLevelInfo = useCallback(async (members: CompanyMember[]) => {
    if (!companyId || members.length === 0) return;

    const primaryContact = members.find(m => m.isAccountAdministrator) || members[0];

    try {
      const accountRef = doc(db, 'accounts', companyId);
      await updateDoc(accountRef, {
        email: primaryContact.email,
        personalName: primaryContact.personalName,
        jobTitle: primaryContact.jobTitle || null,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating account-level info:', error);
    }
  }, [companyId]);

  const loadMembers = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      const membersData = await getCompanyMembers(companyId);
      setMembers(membersData);

      const accountRef = doc(db, 'accounts', companyId);
      const accountSnap = await getDoc(accountRef);
      if (accountSnap.exists()) {
        const data = accountSnap.data();
        setCompanyData({ website: data.website || '' });
        setCompanyFormData({ website: data.website || '' });
      }

      if (membersData.length > 0) {
        await updateAccountLevelInfo(membersData);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, updateAccountLevelInfo]);

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

      // Load invoices for this account
      try {
        const invoicesRes = await fetch(`/api/admin/account-invoices?account_id=${companyId}`);
        const invoicesData = await invoicesRes.json();
        if (invoicesData.success) {
          setInvoices(invoicesData.invoices);
        }
      } catch {
        // Invoice endpoint may not exist yet, that's ok
      }
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    } finally {
      setCrmLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (isOpen && companyId) {
      loadMembers();
      loadCrmData();
    }
  }, [isOpen, companyId, loadMembers, loadCrmData]);

  // Reset tab when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('members');
    }
  }, [isOpen]);

  const handleAddMember = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleEditMember = (member: CompanyMember) => {
    setFormData({
      email: member.email,
      personalName: member.personalName,
      jobTitle: member.jobTitle || '',
      isAccountAdministrator: member.isAccountAdministrator || false,
      accountConfirmed: member.accountConfirmed || false
    });
    setEditingMember(member);
    setShowAddForm(true);
  };

  const handleSaveMember = async () => {
    if (!formData.email || !formData.personalName) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (editingMember) {
        const memberRef = doc(db, 'accounts', companyId, 'members', editingMember.id);
        await updateDoc(memberRef, {
          email: formData.email,
          personalName: formData.personalName,
          jobTitle: formData.jobTitle || null,
          isAccountAdministrator: formData.isAccountAdministrator,
          accountConfirmed: formData.accountConfirmed,
          updatedAt: serverTimestamp()
        });
      } else {
        const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const memberRef = doc(db, 'accounts', companyId, 'members', memberId);

        await setDoc(memberRef, {
          id: memberId,
          email: formData.email,
          personalName: formData.personalName,
          jobTitle: formData.jobTitle || null,
          isAccountAdministrator: formData.isAccountAdministrator,
          accountConfirmed: formData.accountConfirmed,
          isRegistrant: false,
          joinedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      const updatedMembers = await getCompanyMembers(companyId);
      setMembers(updatedMembers);

      if (updatedMembers.length > 0) {
        await updateAccountLevelInfo(updatedMembers);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving member:', error);
      alert('Error saving member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to delete ${memberName}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const memberRef = doc(db, 'accounts', companyId, 'members', memberId);
      await deleteDoc(memberRef);

      const updatedMembers = await getCompanyMembers(companyId);
      setMembers(updatedMembers);

      if (updatedMembers.length > 0) {
        await updateAccountLevelInfo(updatedMembers);
      } else {
        const accountRef = doc(db, 'accounts', companyId);
        await updateDoc(accountRef, {
          email: null,
          personalName: null,
          jobTitle: null,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Error deleting member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof MemberFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCompanyData = async () => {
    setLoading(true);
    try {
      let url = (companyFormData.website || '').trim();
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const accountRef = doc(db, 'accounts', companyId);
      await updateDoc(accountRef, {
        website: url || null,
        updatedAt: serverTimestamp()
      });
      setCompanyData({ website: url });
      setCompanyFormData({ website: url });
      setEditingCompany(false);
    } catch (error) {
      console.error('Error saving company data:', error);
      alert('Error saving company data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (dateValue: any) => {
    if (!dateValue) return '-';
    const date = dateValue?.toDate?.() || new Date(dateValue);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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

  const tabs: { id: ModalTab; label: string; count?: number }[] = [
    { id: 'members', label: 'Members', count: members.length },
    { id: 'timeline', label: 'Timeline', count: activities.length },
    { id: 'notes', label: 'Notes', count: notes.length },
    { id: 'payments', label: 'Payments', count: invoices.length },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={companyName}
      maxWidth="6xl"
    >
      <div className="h-[600px] flex flex-col">
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
                {tab.count !== undefined && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Company Details Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-medium text-fase-navy">Company Details</h4>
                  {!editingCompany && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setEditingCompany(true)}
                      disabled={loading}
                    >
                      Edit
                    </Button>
                  )}
                </div>

                {editingCompany ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={companyFormData.website || ''}
                        onChange={(e) => setCompanyFormData({ ...companyFormData, website: e.target.value })}
                        placeholder="www.example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => {
                          setCompanyFormData({ website: companyData.website || '' });
                          setEditingCompany(false);
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleSaveCompanyData}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-500 w-20">Website:</span>
                      {companyData.website ? (
                        <a
                          href={companyData.website.startsWith('http') ? companyData.website : `https://${companyData.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fase-navy hover:underline"
                        >
                          {companyData.website}
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">Not set</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Header with Add Button */}
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-fase-navy">
                  Company Members ({members.length})
                </h4>
                <Button
                  variant="primary"
                  onClick={handleAddMember}
                  disabled={loading}
                >
                  Add Member
                </Button>
              </div>

              {/* Add/Edit Form */}
              {showAddForm && (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h5 className="text-md font-medium text-fase-navy mb-4">
                    {editingMember ? 'Edit Member' : 'Add New Member'}
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.personalName}
                        onChange={(e) => handleFormChange('personalName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={formData.jobTitle}
                        onChange={(e) => handleFormChange('jobTitle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isAccountAdministrator}
                          onChange={(e) => handleFormChange('isAccountAdministrator', e.target.checked)}
                          className="rounded border-gray-300 text-fase-navy focus:ring-fase-navy"
                        />
                        <span className="ml-2 text-sm text-gray-700">Account Administrator</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.accountConfirmed}
                          onChange={(e) => handleFormChange('accountConfirmed', e.target.checked)}
                          className="rounded border-gray-300 text-fase-navy focus:ring-fase-navy"
                        />
                        <span className="ml-2 text-sm text-gray-700">Account Confirmed</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="secondary"
                      onClick={resetForm}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSaveMember}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : editingMember ? 'Update Member' : 'Add Member'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Members Table */}
              {loading && !showAddForm ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fase-navy mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading members...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No members found. Click &quot;Add Member&quot; to get started.
                          </td>
                        </tr>
                      ) : (
                        members.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.personalName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{member.email}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{member.jobTitle || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                member.accountConfirmed
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {member.accountConfirmed ? 'Confirmed' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                member.isAccountAdministrator
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {member.isAccountAdministrator ? 'Admin' : 'Member'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm space-x-2">
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={() => handleEditMember(member)}
                                disabled={loading}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={() => handleDeleteMember(member.id, member.personalName)}
                                disabled={loading}
                                className="text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
