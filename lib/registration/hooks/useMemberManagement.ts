import { useState } from 'react';
import { Member, RegistrationState } from '../types';

export function useMemberManagement(state: RegistrationState, updateField: Function) {
  const addMember = () => {
    if (state.members.length >= 3) return;
    
    const newMember: Member = {
      id: `member_${Date.now()}`,
      firstName: '',
      lastName: '',
      name: '',
      email: '',
      phone: '',
      jobTitle: '',
      isPrimaryContact: false
    };
    
    updateField('members', [...state.members, newMember]);
  };

  const removeMember = (memberId: string) => {
    const newMembers = state.members.filter(m => m.id !== memberId);
    
    // If we removed the account administrator, make the first member administrator
    const removedMember = state.members.find(m => m.id === memberId);
    if (removedMember?.isPrimaryContact && newMembers.length > 0) {
      newMembers[0].isPrimaryContact = true;
    }
    
    updateField('members', newMembers);
  };

  const updateMember = (memberId: string, field: keyof Member, value: string | boolean) => {
    const newMembers = state.members.map(member => {
      if (member.id === memberId) {
        const updatedMember = { ...member, [field]: value };
        
        // Update name when firstName or lastName changes
        if (field === 'firstName' || field === 'lastName') {
          updatedMember.name = `${field === 'firstName' ? value : member.firstName} ${field === 'lastName' ? value : member.lastName}`.trim();
        }
        
        return updatedMember;
      }
      return member;
    });
    
    updateField('members', newMembers);
  };

  const setPrimaryContact = (memberId: string) => {
    const newMembers = state.members.map(member => ({
      ...member,
      isPrimaryContact: member.id === memberId
    }));
    
    updateField('members', newMembers);
  };

  const validateMembers = (): string[] => {
    const errors: string[] = [];
    
    if (state.membershipType === 'corporate') {
      if (state.members.length === 0) {
        errors.push('At least one team member is required');
      }
      
      const hasPrimaryContact = state.members.some(m => m.isPrimaryContact);
      if (!hasPrimaryContact) {
        errors.push('You must designate one person as the account administrator');
      }
      
      // Validate all members have required fields
      for (const member of state.members) {
        if (!member.firstName?.trim() || !member.lastName?.trim()) {
          errors.push(`${member.firstName || 'Member'} must have a first and last name`);
          break;
        }
        if (!member.email.trim()) {
          errors.push(`${member.firstName || 'Member'} must have an email`);
          break;
        }
        if (member.id !== 'registrant' && !member.phone.trim()) {
          errors.push(`${member.firstName || 'Member'} must have a phone number`);
          break;
        }
        if (!member.jobTitle.trim()) {
          errors.push(`${member.firstName || 'Member'} must have a job title`);
          break;
        }
      }
    }
    
    return errors;
  };

  const getPrimaryContact = (): Member | undefined => {
    return state.members.find(m => m.isPrimaryContact);
  };

  const getRegistrant = (): Member | undefined => {
    return state.members.find(m => m.id === 'registrant');
  };

  return {
    addMember,
    removeMember,
    updateMember,
    setPrimaryContact,
    validateMembers,
    getPrimaryContact,
    getRegistrant
  };
}