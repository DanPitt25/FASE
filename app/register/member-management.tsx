'use client';

import { Member } from './registration-hooks';

// Team Members Management Component
export const TeamMembersSection = ({
  members,
  setMembers,
  firstName,
  surname,
  email
}: {
  members: Member[];
  setMembers: (members: Member[]) => void;
  firstName: string;
  surname: string;
  email: string;
}) => {
  
  const addMember = () => {
    const newMember: Member = {
      id: Date.now().toString(),
      firstName: '',
      lastName: '',
      name: '',
      email: '',
      phone: '',
      jobTitle: '',
      isPrimaryContact: false
    };
    setMembers([...members, newMember]);
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    const updatedMembers = members.map(member => {
      if (member.id === id) {
        const updatedMember = { ...member, ...updates };
        // Update the name field when first/last name changes
        if (updates.firstName !== undefined || updates.lastName !== undefined) {
          updatedMember.name = `${updatedMember.firstName} ${updatedMember.lastName}`.trim();
        }
        return updatedMember;
      }
      return member;
    });
    setMembers(updatedMembers);
  };

  const removeMember = (id: string) => {
    const memberToRemove = members.find(m => m.id === id);
    const newMembers = members.filter(m => m.id !== id);
    
    // If we removed the account administrator, make the first member administrator
    if (memberToRemove?.isPrimaryContact && newMembers.length > 0) {
      newMembers[0].isPrimaryContact = true;
    }
    setMembers(newMembers);
  };

  const setPrimaryContact = (id: string) => {
    const updatedMembers = members.map(member => ({
      ...member,
      isPrimaryContact: member.id === id
    }));
    setMembers(updatedMembers);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Team Members & Account Administrator</h4>
        <p className="text-sm text-fase-black mt-2 mb-4">
          Add the people from your organization who will receive FASE membership benefits - including access to industry insights, networking opportunities, professional development resources, and member-only events. One person must be designated as the account administrator to manage billing and settings. <span className="text-fase-navy font-medium">You can add more seats after completing your registration.</span>
        </p>
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {members.map((member, index) => (
          <div key={member.id} className="p-4 border border-fase-light-gold rounded-lg bg-fase-cream">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-sm font-medium text-fase-navy">
                  {member.id === 'registrant' ? 'You' : `Member ${index + 1}`}
                  {member.isPrimaryContact && (
                    <span className="ml-2 text-xs bg-fase-navy text-white px-2 py-1 rounded">
                      Account Administrator
                    </span>
                  )}
                </span>
              </div>
              {member.id !== 'registrant' && (
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={member.firstName}
                  onChange={(e) => updateMember(member.id, { firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={member.id === 'registrant'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={member.lastName}
                  onChange={(e) => updateMember(member.id, { lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={member.id === 'registrant'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={member.email}
                  onChange={(e) => updateMember(member.id, { email: e.target.value })}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  disabled={member.id === 'registrant'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={member.phone}
                  onChange={(e) => updateMember(member.id, { phone: e.target.value })}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Job Title *
              </label>
              <input
                type="text"
                value={member.jobTitle}
                onChange={(e) => updateMember(member.id, { jobTitle: e.target.value })}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>

            {/* Account Administrator Toggle */}
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="accountAdministrator"
                  checked={member.isPrimaryContact}
                  onChange={() => setPrimaryContact(member.id)}
                  className="mr-2"
                />
                <span className="text-sm text-fase-navy">Make this person the account administrator</span>
              </label>
            </div>
          </div>
        ))}

        {members.length < 3 && (
          <button
            type="button"
            onClick={addMember}
            className="w-full p-3 border-2 border-dashed border-fase-light-gold rounded-lg text-fase-navy hover:border-fase-navy hover:bg-fase-light-blue transition-colors"
          >
            + Add Another Member (max 3)
          </button>
        )}
      </div>
    </div>
  );
};