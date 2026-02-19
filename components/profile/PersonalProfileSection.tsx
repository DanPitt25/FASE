'use client';

import { useState, useEffect } from 'react';
import { sendPasswordReset } from '../../lib/auth';
import Button from '../Button';
import { usePortalTranslations } from '../../app/member-portal/hooks/usePortalTranslations';
import type { User } from 'firebase/auth';
import type { UnifiedMember } from '../../lib/unified-member';

interface PersonalProfileSectionProps {
  user: User;
  member: UnifiedMember | null;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  onMemberDataRefresh?: () => Promise<void>;
}

export default function PersonalProfileSection({ user, member, showSuccess, showError, onMemberDataRefresh }: PersonalProfileSectionProps) {
  const { t } = usePortalTranslations();
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ 
    personalName: member?.personalName || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  // Sync state with member prop changes
  useEffect(() => {
    setProfileData({ 
      personalName: member?.personalName || ''
    });
  }, [member?.personalName]);

  const handleEditProfile = () => {
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!user || !member?.organizationId) return;
    
    try {
      setSavingProfile(true);
      
      // Update member record in Firestore
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      
      const memberRef = doc(db, 'accounts', member.organizationId, 'members', user.uid);
      await updateDoc(memberRef, {
        personalName: profileData.personalName.trim(),
        updatedAt: serverTimestamp()
      });
      
      // Refresh member data to show updated name immediately
      if (onMemberDataRefresh) {
        await onMemberDataRefresh();
      }
      
      setEditingProfile(false);
      showSuccess(t('manage_profile.profile_updated'));
    } catch (error) {
      showError(t('manage_profile.profile_update_failed'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData({
      personalName: member?.personalName || ''
    });
    setEditingProfile(false);
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    try {
      setSendingPasswordReset(true);
      await sendPasswordReset(user.email);
      setPasswordResetSent(true);
      showSuccess(t('manage_profile.password_reset_sent'));

      // Hide the success indicator after 5 seconds
      setTimeout(() => setPasswordResetSent(false), 5000);
    } catch (error) {
      showError(t('manage_profile.password_reset_failed'));
    } finally {
      setSendingPasswordReset(false);
    }
  };

  return (
    <div className="bg-white border border-fase-light-gold rounded-lg p-6">
      <h2 className="text-xl font-noto-serif font-semibold text-fase-navy mb-6">{t('manage_profile.your_profile')}</h2>

      <div className="space-y-6">
        {/* Personal Name */}
        <div>
          <label className="block text-sm font-medium text-fase-navy mb-2">{t('manage_profile.personal_name')}</label>
          {editingProfile ? (
            <div className="space-y-3">
              <input
                type="text"
                value={profileData.personalName}
                onChange={(e) => setProfileData(prev => ({ ...prev, personalName: e.target.value }))}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                placeholder={t('manage_profile.enter_name_placeholder')}
              />
              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  variant="primary"
                  size="small"
                >
                  {savingProfile ? t('manage_profile.saving') : t('manage_profile.save')}
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  variant="secondary"
                  size="small"
                >
                  {t('manage_profile.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-fase-black mr-3">
                {member?.personalName || t('manage_profile.not_set')}
              </div>
              <Button
                onClick={handleEditProfile}
                variant="secondary"
                size="small"
              >
                {t('manage_profile.edit')}
              </Button>
            </div>
          )}
        </div>

        {/* Password Security */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">{t('manage_profile.security')}</h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">{t('manage_profile.password')}</span>
              <p className="text-xs text-gray-500">{t('manage_profile.password_desc')}</p>
            </div>
            <div className="flex items-center space-x-3">
              {passwordResetSent && (
                <span className="text-sm text-green-600 font-medium">{t('manage_profile.reset_email_sent')}</span>
              )}
              <Button
                onClick={handlePasswordReset}
                disabled={sendingPasswordReset}
                variant="secondary"
                size="small"
              >
                {sendingPasswordReset ? t('manage_profile.sending') : t('manage_profile.reset_password')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}