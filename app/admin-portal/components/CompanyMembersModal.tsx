'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getCompanyMembers, CompanyMember } from '../../../lib/unified-member';
import Modal from '../../../components/Modal';
import Button from '../../../components/Button';

interface CompanyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
}

interface MemberFormData {
  email: string;
  personalName: string;
  jobTitle: string;
  isAccountAdministrator: boolean;
  accountConfirmed: boolean;
}

export default function CompanyMembersModal({ 
  isOpen, 
  onClose, 
  companyId, 
  companyName 
}: CompanyMembersModalProps) {
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
  const [formData, setFormData] = useState<MemberFormData>({
    email: '',
    personalName: '',
    jobTitle: '',
    isAccountAdministrator: false,
    accountConfirmed: false
  });

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
    
    // Find the primary contact (first admin or first member)
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
      
      // Update account-level info when members are loaded
      if (membersData.length > 0) {
        await updateAccountLevelInfo(membersData);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, updateAccountLevelInfo]);

  useEffect(() => {
    if (isOpen && companyId) {
      loadMembers();
    }
  }, [isOpen, companyId, loadMembers]);

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
        // Update existing member
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
        // Create new member
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
      
      // Update account-level info
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
      
      // Update account-level info (or clear it if no members left)
      if (updatedMembers.length > 0) {
        await updateAccountLevelInfo(updatedMembers);
      } else {
        // Clear account-level contact info if no members left
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={`Manage Members - ${companyName}`}
      maxWidth="xl"
    >
      <div className="space-y-6">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No members found. Click &quot;Add Member&quot; to get started.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{member.personalName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.jobTitle || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.accountConfirmed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {member.accountConfirmed ? 'Confirmed' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.isAccountAdministrator 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {member.isAccountAdministrator ? 'Administrator' : 'Member'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.joinedAt?.toDate?.()?.toLocaleDateString() || 
                         member.createdAt?.toDate?.()?.toLocaleDateString() || 
                         'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
    </Modal>
  );
}