'use client';

import { useState, useEffect } from 'react';
import Button from './Button';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { getCompanyMembers } from '../lib/unified-member';
import { doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { usePortalTranslations } from '../app/member-portal/hooks/usePortalTranslations';


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
  const [showSettings, setShowSettings] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({
    email: '',
    personalName: '',
    jobTitle: ''
  });
  const [adding, setAdding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);


  // Helper function to check if member needs an invite (has generated ID and hasn't confirmed account)
  const memberNeedsInvite = (member: Member) => {
    return member.id.startsWith('member_') && !member.accountConfirmed;
  };

  // Fetch company members
  useEffect(() => {
    const fetchMembers = async () => {
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

    fetchMembers();
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
      const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !user || !company) return;
    
    const file = event.target.files[0];
    
    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert(t('logo_management.errors.invalid_file_type'));
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert(t('logo_management.errors.file_too_large'));
      return;
    }
    
    try {
      setUploadingLogo(true);
      
      // Check auth state
      const token = await user.getIdToken();
      const authClaims = await user.getIdTokenResult();
      
      console.log('Upload debug:', {
        userId: user.uid,
        companyId: company.id,
        fileName: file.name,
        storageAvailable: !!storage,
        hasToken: !!token,
        authClaims: authClaims.claims
      });
      
      // Create storage reference with standard filename
      const fileExtension = file.name.split('.').pop();
      const logoRef = ref(storage, `graphics/logos/${company.id}_logo.${fileExtension}`);
      
      // Upload file
      await uploadBytes(logoRef, file);
      
      // Get download URL
      const logoURL = await getDownloadURL(logoRef);
      
      // Update company document with logo URL
      const companyRef = doc(db, 'accounts', company.id);
      await updateDoc(companyRef, {
        logoURL: logoURL,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setCompany(prev => prev ? { ...prev, logoURL } : null);
      
      alert(t('logo_management.success.upload_successful'));
    } catch (err) {
      console.error('Error uploading logo:', err);
      console.error('Error details:', {
        code: (err as any).code,
        message: (err as any).message,
        serverResponse: (err as any).serverResponse,
        fullError: err
      });
      alert(t('logo_management.errors.upload_failed'));
    } finally {
      setUploadingLogo(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const downloadFASELogo = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Remove the corporate membership check since we're determining account type dynamically

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
                  {company.organizationType === 'MGA' ? t('manage_profile.organization_types.mga_full') : 
                   company.organizationType === 'carrier' ? t('manage_profile.organization_types.carrier_full') : 
                   company.organizationType === 'provider' ? t('manage_profile.organization_types.provider_full') : 
                   company.organizationType}
                </span>
                <span className="font-medium">
                  {company.status === 'approved' ? t('manage_profile.member_statuses.active_member') : 
                   company.status === 'pending' ? t('manage_profile.member_statuses.under_review') : 
                   company.status === 'pending_payment' ? t('manage_profile.member_statuses.payment_required') : 
                   company.status === 'pending_invoice' ? t('manage_profile.member_statuses.invoice_sent') : 
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
              <span>{t('manage_profile.settings')}</span>
              <svg className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Company Settings - Collapsible */}
          {showSettings && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">{t('manage_profile.company_settings')}</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{t('manage_profile.directory_inclusion')}</span>
                    <p className="text-xs text-gray-500">{t('manage_profile.directory_inclusion_desc')}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{t('manage_profile.public_contact')}</span>
                    <p className="text-xs text-gray-500">{t('manage_profile.public_contact_desc')}</p>
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

      {/* Logo Management */}
      <div className="bg-white border border-fase-light-gold rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-fase-light-gold">
          <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
            {t('logo_management.title')}
          </h3>
        </div>
        <div className="px-6 py-4 space-y-6">
          {/* Company Logo Upload */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">{t('logo_management.company_logo')}</h4>
            {company?.logoURL && (
              <div className="mb-4">
                <img 
                  src={company.logoURL} 
                  alt={t('logo_management.alt_text.company_logo')} 
                  className="h-16 w-auto object-contain border border-gray-200 rounded p-2"
                />
              </div>
            )}
            {(() => {
              const currentUserMember = members.find(m => m.id === user?.uid);
              const isAdmin = currentUserMember?.isAccountAdministrator;
              
              if (isAdmin) {
                return (
                  <div className="flex items-center space-x-4">
                    <label className="relative cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="sr-only"
                      />
                      <span className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        uploadingLogo 
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300 cursor-pointer'
                      }`}>
                        {uploadingLogo ? t('logo_management.uploading') : t('logo_management.upload_logo')}
                      </span>
                    </label>
                    <span className="text-xs text-gray-500">
                      {t('logo_management.file_requirements')}
                    </span>
                  </div>
                );
              } else {
                return (
                  <span className="text-sm text-gray-500">
                    {t('logo_management.admin_only')}
                  </span>
                );
              }
            })()}
          </div>

          {/* FASE Logo Downloads */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">{t('logo_management.fase_downloads')}</h4>
            <p className="text-xs text-gray-500 mb-4">
              {t('logo_management.fase_downloads_desc')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/fase-logo-rgb.png" 
                    alt={t('logo_management.alt_text.fase_logo_rgb')} 
                    className="h-8 w-auto object-contain"
                  />
                  <span className="text-sm">{t('logo_management.standard_rgb')}</span>
                </div>
                <Button
                  onClick={() => downloadFASELogo('fase-logo-rgb.png')}
                  variant="secondary"
                  size="small"
                >
                  {t('logo_management.download')}
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/fase-logo-mark.png" 
                    alt={t('logo_management.alt_text.fase_logo_mark')} 
                    className="h-8 w-auto object-contain"
                  />
                  <span className="text-sm">{t('logo_management.logo_mark')}</span>
                </div>
                <Button
                  onClick={() => downloadFASELogo('fase-logo-mark.png')}
                  variant="secondary"
                  size="small"
                >
                  {t('logo_management.download')}
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/fase-logo-stacked.png" 
                    alt={t('logo_management.alt_text.fase_logo_stacked')} 
                    className="h-8 w-auto object-contain"
                  />
                  <span className="text-sm">{t('logo_management.stacked')}</span>
                </div>
                <Button
                  onClick={() => downloadFASELogo('fase-logo-stacked.png')}
                  variant="secondary"
                  size="small"
                >
                  {t('logo_management.download')}
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/FASE-Logo-Lockup-RGB.png" 
                    alt={t('logo_management.alt_text.fase_logo_lockup')} 
                    className="h-8 w-auto object-contain"
                  />
                  <span className="text-sm">{t('logo_management.full_lockup')}</span>
                </div>
                <Button
                  onClick={() => downloadFASELogo('FASE-Logo-Lockup-RGB.png')}
                  variant="secondary"
                  size="small"
                >
                  {t('logo_management.download')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white border border-fase-light-gold rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-fase-light-gold">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
              {t('manage_profile.team_members')} ({members.length}/3)
            </h3>
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
          <div className="px-6 py-4 border-b border-fase-light-gold bg-gray-50">
            <h4 className="text-md font-medium text-fase-navy mb-4">{t('manage_profile.add_new_member')}</h4>
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