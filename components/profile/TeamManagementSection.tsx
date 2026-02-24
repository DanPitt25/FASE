'use client';

import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import Button from '../Button';
import ConfirmModal from '../ConfirmModal';
import { usePortalTranslations } from '../../app/member-portal/hooks/usePortalTranslations';
import { useCurrentUser, useIsCurrentUserAdmin } from './useCurrentUser';
import type { User } from 'firebase/auth';
import type { UnifiedMember } from '../../lib/unified-member';

interface Member {
  id: string;
  email: string;
  personalName: string;
  jobTitle?: string;
  isAccountAdministrator: boolean;
  joinedAt: any;
  addedBy?: string;
  createdAt: any;
  updatedAt: any;
  accountConfirmed?: boolean;
}

interface EditingMember {
  id: string;
  personalName: string;
  jobTitle: string;
  isAccountAdministrator: boolean;
}

interface TeamManagementSectionProps {
  user: User;
  member: UnifiedMember;
  members: Member[];
  onMembersChange: (members: Member[]) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

// Extract invite token generation to avoid duplication
function generateInviteToken(memberId: string, companyId: string, email: string, name: string, companyName: string): string {
  return btoa(JSON.stringify({
    memberId,
    companyId,
    email,
    name,
    companyName,
    timestamp: Date.now()
  })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export default function TeamManagementSection({ 
  user, 
  member, 
  members, 
  onMembersChange,
  showSuccess,
  showError
}: TeamManagementSectionProps) {
  const { t } = usePortalTranslations();
  
  const currentUser = useCurrentUser(user, members);
  const isCurrentUserAdmin = useIsCurrentUserAdmin(user, members);
  
  const [editingMember, setEditingMember] = useState<EditingMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    personalName: '',
    jobTitle: ''
  });
  const [adding, setAdding] = useState(false);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Inline message state for showing within the section
  const [inlineMessage, setInlineMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Auto-dismiss inline messages after 5 seconds
  useEffect(() => {
    if (inlineMessage) {
      const timer = setTimeout(() => setInlineMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [inlineMessage]);

  // Helper function to check if member needs an invite
  // A member needs an invite if they haven't confirmed their account yet
  const memberNeedsInvite = (memberItem: Member) => {
    return !memberItem.accountConfirmed;
  };

  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  const hideConfirmation = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleEditMember = (memberToEdit: Member) => {
    setEditingMember({
      id: memberToEdit.id,
      personalName: memberToEdit.personalName,
      jobTitle: memberToEdit.jobTitle || '',
      isAccountAdministrator: memberToEdit.isAccountAdministrator
    });
  };

  const handleSaveMember = async () => {
    if (!editingMember || !member?.organizationId) return;

    try {
      setSaving(true);

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        showError(t('manage_profile.errors.update_member_failed'));
        return;
      }

      const response = await fetch('/api/team-members', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          organizationId: member.organizationId,
          memberId: editingMember.id,
          personalName: editingMember.personalName,
          jobTitle: editingMember.jobTitle,
          isAccountAdministrator: editingMember.isAccountAdministrator
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update member');
      }

      // Update local state
      onMembersChange(members.map(m =>
        m.id === editingMember.id
          ? { ...m, ...editingMember }
          : m
      ));

      setEditingMember(null);
      showSuccess(t('manage_profile.member_updated'));
    } catch (err) {
      showError(t('manage_profile.errors.update_member_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMemberConfirm = (memberToRemove: Member) => {
    if (!isCurrentUserAdmin) return;
    
    if (user.uid === memberToRemove.id) {
      showError(t('manage_profile.errors.cannot_remove_self'));
      return;
    }

    showConfirmation(
      t('manage_profile.remove_team_member'),
      t('manage_profile.confirm_remove', { name: memberToRemove.personalName }),
      () => handleRemoveMember(memberToRemove)
    );
  };

  const handleRemoveMember = async (memberToRemove: Member) => {
    if (!member?.organizationId) {
      showError(t('manage_profile.errors.remove_member_failed'));
      hideConfirmation();
      return;
    }

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        showError(t('manage_profile.errors.remove_member_failed'));
        hideConfirmation();
        return;
      }

      const response = await fetch(
        `/api/team-members?organizationId=${encodeURIComponent(member.organizationId)}&memberId=${encodeURIComponent(memberToRemove.id)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to remove member');
      }

      onMembersChange(members.filter(m => m.id !== memberToRemove.id));
      showSuccess(t('manage_profile.member_removed', { name: memberToRemove.personalName }));
    } catch (err) {
      showError(t('manage_profile.errors.remove_member_failed'));
    } finally {
      hideConfirmation();
    }
  };

  const sendInviteEmail = async (email: string, name: string, inviteUrl: string) => {
    const response = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        companyName: member.organizationName,
        inviteUrl,
        inviterName: currentUser?.personalName || user.email || 'Administrator',
        locale: localStorage.getItem('fase-locale') || 'en'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send invitation email');
    }
  };

  const handleInviteMember = async (memberToInvite: Member) => {
    if (!member?.organizationId) return;

    try {
      setInviting(memberToInvite.id);

      const inviteToken = generateInviteToken(
        memberToInvite.id,
        member.organizationId,
        memberToInvite.email,
        memberToInvite.personalName,
        member.organizationName || ''
      );

      const inviteUrl = `${window.location.origin}/invite/${inviteToken}`;
      await sendInviteEmail(memberToInvite.email, memberToInvite.personalName, inviteUrl);

      showSuccess(t('manage_profile.invitation_sent', { name: memberToInvite.personalName, email: memberToInvite.email }));
    } catch (err) {
      showError(t('manage_profile.errors.send_invitation_failed'));
    } finally {
      setInviting(null);
    }
  };

  const handleAddMember = async () => {
    if (!member?.organizationId || !newMember.email || !newMember.personalName) return;
    if (!isCurrentUserAdmin) return;

    if (members.length >= 3) {
      showError(t('manage_profile.errors.member_limit_reached'));
      return;
    }

    try {
      setAdding(true);

      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        showError(t('manage_profile.errors.add_member_failed'));
        return;
      }

      const response = await fetch('/api/team-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          organizationId: member.organizationId,
          email: newMember.email,
          personalName: newMember.personalName,
          jobTitle: newMember.jobTitle
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to add member');
      }

      const memberId = data.member.id;

      // Add to local state
      const newMemberForState: Member = {
        id: memberId,
        email: newMember.email.toLowerCase().trim(),
        personalName: newMember.personalName.trim(),
        jobTitle: newMember.jobTitle.trim() || '',
        isAccountAdministrator: false,
        accountConfirmed: false,
        addedBy: user.uid,
        joinedAt: { toDate: () => new Date() },
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() }
      };
      onMembersChange([...members, newMemberForState]);

      // Send invitation email automatically
      try {
        const inviteToken = generateInviteToken(
          memberId,
          member.organizationId,
          newMember.email,
          newMember.personalName,
          member.organizationName || ''
        );

        const inviteUrl = `${window.location.origin}/invite/${inviteToken}`;
        await sendInviteEmail(newMember.email, newMember.personalName, inviteUrl);
      } catch (inviteError) {
        // Don't fail the whole process if email fails
        showError(t('manage_profile.errors.send_invitation_email_failed'));
      }

      // Reset form
      setNewMember({ email: '', personalName: '', jobTitle: '' });
      setShowAddForm(false);
      setInlineMessage({
        type: 'success',
        text: t('manage_profile.member_added_success', { name: newMember.personalName })
      });
    } catch (err) {
      showError(t('manage_profile.errors.add_member_failed'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-white border border-fase-light-gold rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-fase-light-gold">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy mb-1">
              {t('manage_profile.team_members')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('manage_profile.team_management_desc', { count: String(members.length) })}
            </p>
          </div>
          {isCurrentUserAdmin && members.length < 3 && (
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant="primary"
              size="small"
            >
              {showAddForm ? t('manage_profile.cancel') : t('manage_profile.add_member')}
            </Button>
          )}
        </div>
      </div>

      {/* Inline Message */}
      {inlineMessage && (
        <div className={`px-6 py-4 border-b border-fase-light-gold ${
          inlineMessage.type === 'success' ? 'bg-green-50' :
          inlineMessage.type === 'error' ? 'bg-red-50' : 'bg-blue-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {inlineMessage.type === 'success' && (
                <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {inlineMessage.type === 'error' && (
                <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {inlineMessage.type === 'info' && (
                <svg className="w-5 h-5 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={`text-sm ${
                inlineMessage.type === 'success' ? 'text-green-800' :
                inlineMessage.type === 'error' ? 'text-red-800' : 'text-blue-800'
              }`}>{inlineMessage.text}</span>
            </div>
            <button
              onClick={() => setInlineMessage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Add Member Form */}
      {showAddForm && (
        <div className="px-6 py-6 border-b border-fase-light-gold bg-gray-50">
          <h3 className="text-lg font-medium text-fase-navy mb-4">{t('manage_profile.add_new_member')}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-1">
                  {t('manage_profile.email_address')} *
                </label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  placeholder={t('manage_profile.placeholders.email')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-1">
                  {t('manage_profile.full_name')} *
                </label>
                <input
                  type="text"
                  value={newMember.personalName}
                  onChange={(e) => setNewMember(prev => ({ ...prev, personalName: e.target.value }))}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  placeholder={t('manage_profile.placeholders.name')}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-1">
                {t('manage_profile.job_title')}
              </label>
              <input
                type="text"
                value={newMember.jobTitle}
                onChange={(e) => setNewMember(prev => ({ ...prev, jobTitle: e.target.value }))}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                placeholder={t('manage_profile.placeholders.job_title')}
              />
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={handleAddMember}
                disabled={adding || !newMember.email || !newMember.personalName}
                variant="primary"
                size="small"
              >
                {adding ? t('manage_profile.adding') : t('manage_profile.add_member')}
              </Button>
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  setNewMember({ email: '', personalName: '', jobTitle: '' });
                }}
                variant="secondary"
                size="small"
              >
                {t('manage_profile.cancel')}
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
                      {t('manage_profile.full_name')}
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
                      {t('manage_profile.job_title')}
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
                    id={`admin-${memberItem.id}`}
                    checked={editingMember.isAccountAdministrator}
                    onChange={(e) => setEditingMember(prev =>
                      prev ? { ...prev, isAccountAdministrator: e.target.checked } : null
                    )}
                    className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-fase-light-gold rounded"
                  />
                  <label htmlFor={`admin-${memberItem.id}`} className="ml-2 text-sm text-fase-black">
                    {t('manage_profile.account_administrator')}
                  </label>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={handleSaveMember}
                    disabled={saving}
                    variant="primary"
                    size="small"
                  >
                    {saving ? t('manage_profile.saving') : t('manage_profile.save')}
                  </Button>
                  <Button
                    onClick={() => setEditingMember(null)}
                    variant="secondary"
                    size="small"
                  >
                    {t('manage_profile.cancel')}
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
                      {memberItem.isAccountAdministrator && (
                        <span className="text-xs font-medium text-gray-600">
                          ({t('manage_profile.account_administrator')})
                        </span>
                      )}
                      {memberItem.id === user?.uid && (
                        <span className="text-xs font-medium text-gray-600">
                          ({t('manage_profile.you')})
                        </span>
                      )}
                      {memberNeedsInvite(memberItem) && (
                        <span className="text-xs font-medium text-amber-600">
                          ({t('manage_profile.pending_invite')})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-fase-black">{memberItem.email}</p>
                    {memberItem.jobTitle && (
                      <p className="text-sm text-gray-600">{memberItem.jobTitle}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {t('manage_profile.joined_on', { date: memberItem.joinedAt?.toDate?.()?.toLocaleDateString() || t('manage_profile.unknown') })}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {memberNeedsInvite(memberItem) ? (
                    // For pending invites, show both resend and remove buttons
                    isCurrentUserAdmin ? (
                      <>
                        <Button
                          onClick={() => handleInviteMember(memberItem)}
                          disabled={inviting === memberItem.id}
                          variant="primary"
                          size="small"
                        >
                          {inviting === memberItem.id ? t('manage_profile.sending') : t('manage_profile.resend_invite')}
                        </Button>
                        <Button
                          onClick={() => handleRemoveMemberConfirm(memberItem)}
                          variant="secondary"
                          size="small"
                          className="text-red-600 hover:text-red-800"
                        >
                          {t('manage_profile.remove')}
                        </Button>
                      </>
                    ) : null
                  ) : (
                    <>
                      {(isCurrentUserAdmin || memberItem.id === user?.uid) && (
                        <Button
                          onClick={() => handleEditMember(memberItem)}
                          variant="secondary"
                          size="small"
                        >
                          {t('manage_profile.edit')}
                        </Button>
                      )}
                      {isCurrentUserAdmin && memberItem.id !== user?.uid && (
                        <Button
                          onClick={() => handleRemoveMemberConfirm(memberItem)}
                          variant="secondary"
                          size="small"
                          className="text-red-600 hover:text-red-800"
                        >
                          {t('manage_profile.remove')}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('manage_profile.no_members')}</h3>
          <p className="text-fase-black">{t('manage_profile.no_members_desc')}</p>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={hideConfirmation}
        confirmLabel={t('manage_profile.remove')}
        cancelLabel={t('manage_profile.cancel')}
        variant="danger"
      />
    </div>
  );
}