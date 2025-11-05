'use client';

import { useState, useEffect } from 'react';
import Button from './Button';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { getCompanyMembers } from '../lib/unified-member';
import { doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';


interface CompanyInfo {
  id: string;
  organizationName: string;
  organizationType: string;
  status: string;
  logoURL?: string;
}

interface Member {
  id: string;
  email: string;
  personalName: string;
  jobTitle?: string;
  isPrimaryContact: boolean; // Note: This is actually accountAdministrator in the data
  joinedAt: any;
  addedBy?: string;
  createdAt: any;
  updatedAt: any;
}

interface EditingMember {
  id: string;
  personalName: string;
  jobTitle: string;
  isPrimaryContact: boolean; // Note: This is actually accountAdministrator in the data
}

export default function ManageProfile() {
  const { user, member } = useUnifiedAuth();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<EditingMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    personalName: '',
    jobTitle: ''
  });
  const [adding, setAdding] = useState(false);

  // Helper function to check if member needs an invite (has generated ID)
  const memberNeedsInvite = (member: Member) => {
    return member.id.startsWith('member_');
  };

  // Fetch company members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!user || !member || member.membershipType !== 'corporate') return;

      try {
        setLoading(true);
        
        // Get company members directly
        const membersData = await getCompanyMembers(member.organizationId!);
        
        // Set company info from member data
        setCompany({
          id: member.organizationId!,
          organizationName: member.organizationName || 'Unknown Company',
          organizationType: member.organizationType || 'Unknown',
          status: member.status,
          logoURL: member.logoURL
        });
        
        setMembers(membersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [user, member]);

  const handleEditMember = (memberToEdit: Member) => {
    setEditingMember({
      id: memberToEdit.id,
      personalName: memberToEdit.personalName,
      jobTitle: memberToEdit.jobTitle || '',
      isPrimaryContact: memberToEdit.isPrimaryContact
    });
  };

  const handleSaveMember = async () => {
    if (!editingMember || !user || !member) return;

    try {
      setSaving(true);

      // Update member document directly
      const memberRef = doc(db, 'accounts', member.organizationId!, 'members', editingMember.id);
      await updateDoc(memberRef, {
        personalName: editingMember.personalName,
        jobTitle: editingMember.jobTitle,
        isPrimaryContact: editingMember.isPrimaryContact,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setMembers(prev => prev.map(m => 
        m.id === editingMember.id 
          ? { ...m, ...editingMember } 
          : m
      ));

      setEditingMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };


  const handleRemoveMember = async (memberToRemove: Member) => {
    if (!user || !member) return;
    
    if (!confirm(`Are you sure you want to remove ${memberToRemove.personalName} from the company?`)) {
      return;
    }

    try {
      // Don't allow removing themselves
      if (user.uid === memberToRemove.id) {
        throw new Error('Cannot remove yourself from the company');
      }

      // Delete member document directly
      const memberRef = doc(db, 'accounts', member.organizationId!, 'members', memberToRemove.id);
      await deleteDoc(memberRef);

      // Remove from local state
      setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleInviteMember = async (memberToInvite: Member) => {
    if (!user || !member) return;

    try {
      setInviting(memberToInvite.id);

      // Create invite link with member data
      const inviteToken = btoa(JSON.stringify({
        memberId: memberToInvite.id,
        companyId: member.organizationId,
        email: memberToInvite.email,
        name: memberToInvite.personalName,
        timestamp: Date.now()
      }));

      const inviteUrl = `${window.location.origin}/invite/${inviteToken}`;

      // Send invitation email via API
      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: memberToInvite.email,
          name: memberToInvite.personalName,
          companyName: member.organizationName,
          inviteUrl: inviteUrl,
          inviterName: user.displayName || user.email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation email');
      }

      alert(`Invitation sent to ${memberToInvite.personalName} at ${memberToInvite.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(null);
    }
  };

  const handleAddMember = async () => {
    if (!user || !member || !newMember.email || !newMember.personalName) return;

    try {
      setAdding(true);
      setError(null);

      // Generate a unique member ID
      const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create member document
      const memberRef = doc(db, 'accounts', member.organizationId!, 'members', memberId);
      const memberData = {
        id: memberId,
        email: newMember.email.toLowerCase().trim(),
        personalName: newMember.personalName.trim(),
        jobTitle: newMember.jobTitle.trim() || '',
        isPrimaryContact: false,
        addedBy: user.uid,
        joinedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add to Firestore using setDoc since we're creating a new document
      await setDoc(memberRef, memberData);

      // Add to local state
      const newMemberForState: Member = {
        ...memberData,
        joinedAt: { toDate: () => new Date() },
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() }
      };
      setMembers(prev => [...prev, newMemberForState]);

      // Reset form
      setNewMember({ email: '', personalName: '', jobTitle: '' });
      setShowAddForm(false);

      // Show success message
      alert(`${newMember.personalName} has been added to the team. They will receive an invitation email.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };



  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-fase-cream rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-fase-cream rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (!member || member.membershipType !== 'corporate') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-blue-800">Member management is only available for corporate accounts.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Info */}
      {company && (
        <div className="bg-white border border-fase-light-gold rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">
                {company.organizationName}
              </h3>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <span className="font-medium">
                  {company.organizationType === 'MGA' ? 'Managing General Agent' : 
                   company.organizationType === 'carrier' ? 'Insurance Carrier' : 
                   company.organizationType === 'provider' ? 'Service Provider' : 
                   company.organizationType}
                </span>
                <span className="font-medium">
                  {company.status === 'approved' ? 'Active Member' : 
                   company.status === 'pending' ? 'Under Review' : 
                   company.status === 'pending_payment' ? 'Payment Required' : 
                   company.status === 'pending_invoice' ? 'Invoice Sent' : 
                   company.status}
                </span>
              </div>
            </div>
          </div>
          
          {/* Settings button on separate line, left-aligned */}
          <div className="mb-4">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
            >
              <span>Settings</span>
              <svg className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Company Settings - Collapsible */}
          {showSettings && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Company Settings</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Include in Member Directory</span>
                    <p className="text-xs text-gray-500">Show your company in the public member directory</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Public Contact Information</span>
                    <p className="text-xs text-gray-500">Allow other members to see your contact details</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="bg-white border border-fase-light-gold rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-fase-light-gold">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
              Team Members ({members.length})
            </h3>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant="primary"
              size="small"
            >
              {showAddForm ? 'Cancel' : 'Add Member'}
            </Button>
          </div>
        </div>

        {/* Add Member Form */}
        {showAddForm && (
          <div className="px-6 py-4 border-b border-fase-light-gold bg-gray-50">
            <h4 className="text-md font-medium text-fase-navy mb-4">Add New Member</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                    placeholder="member@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={newMember.personalName}
                    onChange={(e) => setNewMember(prev => ({ ...prev, personalName: e.target.value }))}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={newMember.jobTitle}
                  onChange={(e) => setNewMember(prev => ({ ...prev, jobTitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  placeholder="e.g. Operations Manager"
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  onClick={handleAddMember}
                  disabled={adding || !newMember.email || !newMember.personalName}
                  variant="primary"
                  size="small"
                >
                  {adding ? 'Adding...' : 'Add Member'}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMember({ email: '', personalName: '', jobTitle: '' });
                  }}
                  variant="secondary"
                  size="small"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="divide-y divide-fase-light-gold">
          {members.map((memberItem) => (
            <div key={memberItem.id} className="p-6">
              {editingMember?.id === memberItem.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-fase-navy mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editingMember.personalName}
                        onChange={(e) => setEditingMember(prev => 
                          prev ? { ...prev, personalName: e.target.value } : null
                        )}
                        className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-fase-navy mb-1">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={editingMember.jobTitle}
                        onChange={(e) => setEditingMember(prev => 
                          prev ? { ...prev, jobTitle: e.target.value } : null
                        )}
                        className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`primary-${memberItem.id}`}
                      checked={editingMember.isPrimaryContact}
                      onChange={(e) => setEditingMember(prev => 
                        prev ? { ...prev, isPrimaryContact: e.target.checked } : null
                      )}
                      className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-fase-light-gold rounded"
                    />
                    <label htmlFor={`primary-${memberItem.id}`} className="ml-2 text-sm text-fase-black">
                      Account Administrator
                    </label>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={handleSaveMember}
                      disabled={saving}
                      variant="primary"
                      size="small"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      onClick={() => setEditingMember(null)}
                      variant="secondary"
                      size="small"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-fase-navy rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium text-sm">
                        {memberItem.personalName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-fase-navy">
                          {memberItem.personalName}
                        </h4>
                        {memberItem.isPrimaryContact && (
                          <span className="text-xs font-medium text-gray-600">
                            (Account Administrator)
                          </span>
                        )}
                        {memberItem.id === user?.uid && (
                          <span className="text-xs font-medium text-gray-600">
                            (You)
                          </span>
                        )}
                        {memberNeedsInvite(memberItem) && (
                          <span className="text-xs font-medium text-amber-600">
                            (Pending Invite)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-fase-black">{memberItem.email}</p>
                      {memberItem.jobTitle && (
                        <p className="text-sm text-gray-600">{memberItem.jobTitle}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Joined {memberItem.joinedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {memberNeedsInvite(memberItem) ? (
                      <Button
                        onClick={() => handleInviteMember(memberItem)}
                        disabled={inviting === memberItem.id}
                        variant="primary"
                        size="small"
                      >
                        {inviting === memberItem.id ? 'Sending...' : 'Send Invite'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleEditMember(memberItem)}
                        variant="secondary"
                        size="small"
                      >
                        Edit
                      </Button>
                    )}
                    {memberItem.id !== user?.uid && (
                      <Button
                        onClick={() => handleRemoveMember(memberItem)}
                        variant="secondary"
                        size="small"
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {members.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">No Members Found</h3>
          <p className="text-fase-black">No team members found for this company.</p>
        </div>
      )}
    </div>
  );
}