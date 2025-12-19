'use client';

import { useState, useEffect } from 'react';
import Button from './Button';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { getCompanyMembers, OrganizationAccount } from '../lib/unified-member';
import { doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { usePortalTranslations } from '../app/member-portal/hooks/usePortalTranslations';
import { sendPasswordReset } from '../lib/auth';
import { updateProfile } from 'firebase/auth';
import OrganizationLogo from './OrganizationLogo';


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

export default function ManageProfile() {
  const { user, member } = useUnifiedAuth();
  const { t } = usePortalTranslations();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  
  // Account settings state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ displayName: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  
  // Company bio state
  const [organizationAccount, setOrganizationAccount] = useState<OrganizationAccount | null>(null);
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioMessage, setBioMessage] = useState<string | null>(null);
  
  // Directory settings state
  const [directoryInclusion, setDirectoryInclusion] = useState(true);
  const [publicContact, setPublicContact] = useState(true);


  // Helper function to check if member needs an invite (has generated ID and hasn't confirmed account)
  const memberNeedsInvite = (member: Member) => {
    return member.id.startsWith('member_') && !member.accountConfirmed;
  };

  // Fetch company data and members
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !member) {
        return;
      }

      try {
        setLoading(true);
        
        // Find which account this user belongs to
        const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        
        let userAccountId = null;
        let userAccountData = null;
        
        // First try using organizationId from member if available
        if (member.organizationId) {
          try {
            const accountRef = doc(db, 'accounts', member.organizationId);
            const accountSnap = await getDoc(accountRef);
            if (accountSnap.exists()) {
              userAccountId = member.organizationId;
              userAccountData = accountSnap.data();
            }
          } catch (error) {
            console.warn('Failed to load account via organizationId:', error);
          }
        }
        
        // Fallback: Search all accounts to find which one contains this user
        if (!userAccountId) {
          const accountsRef = collection(db, 'accounts');
          const accountsSnapshot = await getDocs(accountsRef);
          
          // Search all accounts to find which one contains this user
          for (const accountDoc of accountsSnapshot.docs) {
            const membersRef = collection(db, 'accounts', accountDoc.id, 'members');
            const membersSnapshot = await getDocs(membersRef);
            
            for (const memberDoc of membersSnapshot.docs) {
              const memberData = memberDoc.data();
              if (memberData.id === user.uid) {
                userAccountId = accountDoc.id;
                userAccountData = accountDoc.data();
                break;
              }
            }
            
            if (userAccountId) break;
          }
        }
        
        if (!userAccountId || !userAccountData) {
          throw new Error('Could not find account for user');
        }
        
        // Get company members directly
        const membersData = await getCompanyMembers(userAccountId);
        
        // Set company info from account data
        const companyInfo = {
          id: userAccountId,
          organizationName: userAccountData.organizationName || 'Unknown Company',
          organizationType: userAccountData.organizationType || 'Unknown',
          status: userAccountData.status,
          logoURL: userAccountData.logoURL
        };
        setCompany(companyInfo);
        
        // Set organization account for bio management
        const orgAccount: OrganizationAccount = {
          id: userAccountId,
          organizationName: userAccountData.organizationName || 'Unknown Company',
          organizationType: userAccountData.organizationType,
          status: userAccountData.status || 'pending',
          createdAt: userAccountData.createdAt,
          updatedAt: userAccountData.updatedAt,
          ...userAccountData
        };
        setOrganizationAccount(orgAccount);
        
        // Initialize bio text from company summary
        if (userAccountData.companySummary?.text) {
          setBioText(userAccountData.companySummary.text);
        }
        
        // Transform CompanyMember[] to Member[] by mapping isPrimaryContact to isAccountAdministrator
        // Handle both old data (with isPrimaryContact) and new data (with isAccountAdministrator already set)
        const transformedMembers: Member[] = membersData.map(member => ({
          ...member,
          isAccountAdministrator: member.isAccountAdministrator ?? member.isPrimaryContact ?? false
        }));
        setMembers(transformedMembers);
      } catch (err) {
        console.error('ManageProfile: Error loading company data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid, member?.id, member?.organizationId]);

  const handleEditMember = (memberToEdit: Member) => {
    setEditingMember({
      id: memberToEdit.id,
      personalName: memberToEdit.personalName,
      jobTitle: memberToEdit.jobTitle || '',
      isAccountAdministrator: memberToEdit.isAccountAdministrator
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
        isAccountAdministrator: editingMember.isAccountAdministrator,
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
      setError(err instanceof Error ? err.message : t('manage_profile.errors.update_member_failed'));
    } finally {
      setSaving(false);
    }
  };


  const handleRemoveMember = async (memberToRemove: Member) => {
    if (!user || !member) return;
    
    // This function should only be called by administrators (UI prevents non-admin access)
    const currentUserMember = members.find(m => m.id === user.uid);
    if (!currentUserMember?.isAccountAdministrator) {
      // Silently return - this should never happen due to UI restrictions
      return;
    }
    
    if (!confirm(t('manage_profile.confirm_remove', { name: memberToRemove.personalName }))) {
      return;
    }

    try {
      // Don't allow removing themselves
      if (user.uid === memberToRemove.id) {
        throw new Error(t('manage_profile.errors.cannot_remove_self'));
      }

      // Delete member document directly
      const memberRef = doc(db, 'accounts', member.organizationId!, 'members', memberToRemove.id);
      await deleteDoc(memberRef);

      // Remove from local state
      setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('manage_profile.errors.remove_member_failed'));
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
        companyName: member.organizationName,
        timestamp: Date.now()
      })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

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
          inviterName: user.displayName || user.email,
          locale: localStorage.getItem('fase-locale') || 'en'
        })
      });

      if (!response.ok) {
        throw new Error(t('manage_profile.errors.send_invitation_email_failed'));
      }

      alert(t('manage_profile.invitation_sent', { name: memberToInvite.personalName, email: memberToInvite.email }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('manage_profile.errors.send_invitation_failed'));
    } finally {
      setInviting(null);
    }
  };

  const handleAddMember = async () => {
    if (!user || !member || !newMember.email || !newMember.personalName) return;

    // This function should only be called by administrators (UI prevents non-admin access)
    const currentUserMember = members.find(m => m.id === user.uid);
    if (!currentUserMember?.isAccountAdministrator) {
      // Silently return - this should never happen due to UI restrictions
      return;
    }

    // Check member limit (maximum 3 members total) - show error for this since it's a business rule
    if (members.length >= 3) {
      setError(t('manage_profile.errors.member_limit_reached'));
      return;
    }

    try {
      setAdding(true);
      setError(null);

      // Generate a unique member ID
      const memberId = `member_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Create member document with all required fields
      const memberRef = doc(db, 'accounts', member.organizationId!, 'members', memberId);
      const memberData = {
        id: memberId,
        email: newMember.email.toLowerCase().trim(),
        personalName: newMember.personalName.trim(),
        jobTitle: newMember.jobTitle.trim() || '',
        isAccountAdministrator: false,
        isRegistrant: false,
        accountConfirmed: false,
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

      // Automatically send invitation email
      try {
        const inviteToken = btoa(JSON.stringify({
          memberId: memberId,
          companyId: member.organizationId,
          email: newMember.email,
          name: newMember.personalName,
          companyName: member.organizationName,
          timestamp: Date.now()
        })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        const inviteUrl = `${window.location.origin}/invite/${inviteToken}`;

        const response = await fetch('/api/send-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: newMember.email,
            name: newMember.personalName,
            companyName: member.organizationName,
            inviteUrl: inviteUrl,
            inviterName: user.displayName || user.email,
            locale: localStorage.getItem('fase-locale') || 'en'
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send invitation email');
        }

        console.log('Invitation email sent automatically');
      } catch (inviteError) {
        console.error('Failed to send automatic invitation:', inviteError);
        // Don't fail the whole process if email fails
      }

      // Reset form
      setNewMember({ email: '', personalName: '', jobTitle: '' });
      setShowAddForm(false);

      // Show success message
      alert(t('manage_profile.member_added_success', { name: newMember.personalName }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('manage_profile.errors.add_member_failed'));
    } finally {
      setAdding(false);
    }
  };

  // Initialize profile data when user and member load
  useEffect(() => {
    if (user || member) {
      setProfileData({
        displayName: member?.personalName || user?.displayName || ''
      });
    }
  }, [user, member]);

  // Account settings functions
  const handleEditProfile = () => {
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setSavingProfile(true);
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: profileData.displayName.trim() || null
      });
      
      // Force reload user data
      await user.reload();
      
      setEditingProfile(false);
      alert('Profile updated successfully');
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setProfileData({
      displayName: member?.personalName || user?.displayName || ''
    });
    setEditingProfile(false);
  };

  // Password reset handler
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    try {
      setSendingPasswordReset(true);
      await sendPasswordReset(user.email);
      setPasswordResetSent(true);
      setTimeout(() => setPasswordResetSent(false), 5000); // Hide success message after 5 seconds
    } catch (error) {
      alert(t('profile.password_reset_failed'));
    } finally {
      setSendingPasswordReset(false);
    }
  };

  // Bio submission handler
  const handleSubmitBio = async () => {
    if (!organizationAccount || !bioText.trim()) return;
    
    try {
      setSavingBio(true);
      setBioError(null);
      setBioMessage(null);
      
      const accountRef = doc(db, 'accounts', organizationAccount.id);
      await updateDoc(accountRef, {
        'companySummary.text': bioText.trim(),
        'companySummary.status': 'pending_review',
        'companySummary.submittedAt': serverTimestamp(),
        'companySummary.reviewedAt': null,
        'companySummary.reviewedBy': null,
        'companySummary.rejectionReason': null,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setOrganizationAccount(prev => prev ? {
        ...prev,
        companySummary: {
          text: bioText.trim(),
          status: 'pending_review',
          submittedAt: { toDate: () => new Date() }
        }
      } : null);
      
      setBioMessage('Profile submitted for review. You will be notified once approved.');
      setTimeout(() => setBioMessage(null), 5000);
    } catch (error) {
      setBioError('Failed to submit profile. Please try again.');
      console.error('Error submitting bio:', error);
    } finally {
      setSavingBio(false);
    }
  };

  // Bio draft save handler
  const handleSaveBioDraft = async () => {
    if (!organizationAccount) return;
    
    try {
      setSavingBio(true);
      setBioError(null);
      setBioMessage(null);
      
      const accountRef = doc(db, 'accounts', organizationAccount.id);
      await updateDoc(accountRef, {
        'companySummary.text': bioText.trim(),
        'companySummary.status': 'draft',
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setOrganizationAccount(prev => prev ? {
        ...prev,
        companySummary: {
          ...prev.companySummary,
          text: bioText.trim(),
          status: 'draft'
        }
      } : null);
      
      setBioMessage('Draft saved successfully.');
      setTimeout(() => setBioMessage(null), 3000);
    } catch (error) {
      setBioError('Failed to save draft. Please try again.');
      console.error('Error saving bio draft:', error);
    } finally {
      setSavingBio(false);
    }
  };

  // Helper function to get bio status badge
  const getBioStatusBadge = () => {
    const status = organizationAccount?.companySummary?.status;
    
    switch (status) {
      case 'pending_review':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending Review</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Draft</span>;
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
  return (
    <div className="space-y-8">
      {/* Your Profile Section */}
      <div className="bg-white border border-fase-light-gold rounded-lg p-6">
        <h2 className="text-xl font-noto-serif font-semibold text-fase-navy mb-6">Your Profile</h2>
        
        <div className="space-y-6">
          {/* Personal Name */}
          <div>
            <label className="block text-sm font-medium text-fase-navy mb-2">Personal Name</label>
            {editingProfile ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={profileData.displayName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  placeholder="Enter your name"
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    variant="primary"
                    size="small"
                  >
                    {savingProfile ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="secondary"
                    size="small"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-fase-black mr-3">
                  {member?.personalName || user?.displayName || 'Not set'}
                </div>
                <Button
                  onClick={handleEditProfile}
                  variant="secondary"
                  size="small"
                >
                  Edit
                </Button>
              </div>
            )}
          </div>

          {/* Password Security */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Security</h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Password</span>
                <p className="text-xs text-gray-500">Reset your account password</p>
              </div>
              <div className="flex items-center space-x-3">
                {passwordResetSent && (
                  <span className="text-sm text-green-600 font-medium">Reset email sent!</span>
                )}
                <Button
                  onClick={handlePasswordReset}
                  disabled={sendingPasswordReset}
                  variant="secondary"
                  size="small"
                >
                  {sendingPasswordReset ? 'Sending...' : 'Reset Password'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Information Section */}
      {company && organizationAccount && (
        <div className="bg-white border border-fase-light-gold rounded-lg p-6">
          <h2 className="text-xl font-noto-serif font-semibold text-fase-navy mb-4">Company Profile</h2>
          
          <div className="text-sm text-gray-600 mb-4">
            {company.organizationName} • {company.organizationType}
          </div>

            {/* Directory Profile */}
            <div className="flex gap-4 p-4 border border-gray-200 rounded-lg">
              {/* Logo */}
              <div className="flex-shrink-0">
                <OrganizationLogo 
                  organizationName={company.organizationName}
                  logoURL={company.logoURL}
                  onLogoChange={(logoURL) => {
                    if (logoURL) {
                      setCompany(prev => prev ? { ...prev, logoURL } : null);
                    }
                  }}
                />
              </div>
              
              {/* Bio */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Directory Profile</span>
                  {getBioStatusBadge()}
                </div>
                
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  placeholder="Describe your company for the directory (subject to translation)..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy resize-none text-sm mb-2"
                  disabled={organizationAccount.companySummary?.status === 'pending_review'}
                />
                
                <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                  <span>{bioText.length}/500</span>
                </div>
                
                {/* Error message */}
                {organizationAccount.companySummary?.status === 'rejected' && organizationAccount.companySummary.rejectionReason && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-3">
                    <strong>Rejected:</strong> {organizationAccount.companySummary.rejectionReason}
                  </div>
                )}
                
                {/* Success/Error messages */}
                {bioMessage && <div className="text-sm text-green-600 mb-2">{bioMessage}</div>}
                {bioError && <div className="text-sm text-red-600 mb-2">{bioError}</div>}
                
                {/* Actions */}
                {organizationAccount.companySummary?.status !== 'pending_review' && (
                  <div className="flex space-x-2">
                    <Button onClick={handleSubmitBio} disabled={savingBio || !bioText.trim()} variant="primary" size="small">
                      {savingBio ? 'Submitting...' : 'Submit'}
                    </Button>
                    <Button onClick={handleSaveBioDraft} disabled={savingBio} variant="secondary" size="small">
                      Draft
                    </Button>
                  </div>
                )}
              </div>
            </div>
        </div>
      )}

      {/* Directory Settings Section */}
      {company && (
        <div className="bg-white border border-fase-light-gold rounded-lg p-6">
          <h2 className="text-xl font-noto-serif font-semibold text-fase-navy mb-6">Directory Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Include in Directory</span>
                <p className="text-xs text-gray-500">Show your company in the public membership directory</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={directoryInclusion}
                  onChange={(e) => setDirectoryInclusion(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Public Contact Information</span>
                <p className="text-xs text-gray-500">Allow directory visitors to see your contact details</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={publicContact}
                  onChange={(e) => setPublicContact(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}


      {/* Team Management Section */}
      <div className="bg-white border border-fase-light-gold rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-fase-light-gold">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-noto-serif font-semibold text-fase-navy mb-1">
                Team Management
              </h2>
              <p className="text-sm text-gray-600">
                Manage your organization&apos;s team members ({members.length}/3)
              </p>
            </div>
            {(() => {
              const currentUserMember = members.find(m => m.id === user?.uid);
              const isAdmin = currentUserMember?.isAccountAdministrator;
              const atLimit = members.length >= 3;
              
              if (isAdmin && !atLimit) {
                return (
                  <Button
                    onClick={() => setShowAddForm(!showAddForm)}
                    variant="primary"
                    size="small"
                  >
                    {showAddForm ? t('manage_profile.cancel') : t('manage_profile.add_member')}
                  </Button>
                );
              } else if (!isAdmin) {
                return null;
              }
              // For atLimit case, show nothing
            })()}
          </div>
        </div>

        {/* Add Member Form */}
        {showAddForm && (
          <div className="px-6 py-6 border-b border-fase-light-gold bg-gray-50">
            <h3 className="text-lg font-medium text-fase-navy mb-4">Add New Team Member</h3>
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
                      id={`primary-${memberItem.id}`}
                      checked={editingMember.isAccountAdministrator}
                      onChange={(e) => setEditingMember(prev => 
                        prev ? { ...prev, isAccountAdministrator: e.target.checked } : null
                      )}
                      className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-fase-light-gold rounded"
                    />
                    <label htmlFor={`primary-${memberItem.id}`} className="ml-2 text-sm text-fase-black">
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
                            ({t('manage_profile.pending_invite_status')})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-fase-black">{memberItem.email}</p>
                      {memberItem.jobTitle && (
                        <p className="text-sm text-gray-600">{memberItem.jobTitle}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Joined {memberItem.joinedAt?.toDate?.()?.toLocaleDateString() || t('manage_profile.unknown')}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {(() => {
                      const currentUserMember = members.find(m => m.id === user?.uid);
                      const isAdmin = currentUserMember?.isAccountAdministrator;
                      
                      if (memberNeedsInvite(memberItem)) {
                        // For pending invites, show both resend and remove buttons
                        return isAdmin ? (
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
                              onClick={() => handleRemoveMember(memberItem)}
                              variant="secondary"
                              size="small"
                              className="text-red-600 hover:text-red-800"
                            >
                              {t('manage_profile.remove')}
                            </Button>
                          </>
                        ) : null;
                      } else {
                        return (
                          <>
                            {(isAdmin || memberItem.id === user?.uid) && (
                              <Button
                                onClick={() => handleEditMember(memberItem)}
                                variant="secondary"
                                size="small"
                              >
                                {t('manage_profile.edit')}
                              </Button>
                            )}
                            {isAdmin && memberItem.id !== user?.uid && (
                              <Button
                                onClick={() => handleRemoveMember(memberItem)}
                                variant="secondary"
                                size="small"
                                className="text-red-600 hover:text-red-800"
                              >
                                {t('manage_profile.remove')}
                              </Button>
                            )}
                          </>
                        );
                      }
                    })()}
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
          <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('manage_profile.no_members')}</h3>
          <p className="text-fase-black">{t('manage_profile.no_members_desc')}</p>
        </div>
      )}
    </div>
  );
}