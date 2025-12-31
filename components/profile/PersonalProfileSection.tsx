'use client';

import { useState, useEffect } from 'react';
import { sendPasswordReset } from '../../lib/auth';
import Button from '../Button';
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
      showSuccess('Profile updated successfully');
    } catch (error) {
      showError('Failed to update profile. Please try again.');
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
      showSuccess('Password reset email sent to your inbox');
      
      // Hide the success indicator after 5 seconds
      setTimeout(() => setPasswordResetSent(false), 5000);
    } catch (error) {
      showError('Failed to send password reset email. Please try again.');
    } finally {
      setSendingPasswordReset(false);
    }
  };

  return (
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
                value={profileData.personalName}
                onChange={(e) => setProfileData(prev => ({ ...prev, personalName: e.target.value }))}
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
                {member?.personalName || 'Not set'}
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
  );
}