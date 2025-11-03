'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('register_form.team_members');
  
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
        <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">{t('title')}</h4>
        <p className="text-sm text-fase-black mt-2 mb-4">
          {t('description')} <span className="text-fase-navy font-medium">{t('admin_requirement')}</span>
        </p>
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {members.map((member, index) => (
          <div key={member.id} className="p-4 border border-fase-light-gold rounded-lg bg-fase-cream">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-sm font-medium text-fase-navy">
                  {member.id === 'registrant' ? t('you_label') : `${t('member_label')} ${index + 1}`}
                  {member.isPrimaryContact && (
                    <span className="ml-2 text-xs bg-fase-navy text-white px-2 py-1 rounded">
                      {t('admin_badge')}
                    </span>
                  )}
                  {!member.isPrimaryContact && (
                    <button
                      type="button"
                      onClick={() => setPrimaryContact(member.id)}
                      className="ml-2 text-xs bg-fase-light-gold text-fase-navy px-2 py-1 rounded hover:bg-fase-gold transition-colors"
                    >
                      {t('make_admin_button')}
                    </button>
                  )}
                </span>
              </div>
              {member.id !== 'registrant' && (
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  {t('remove_button')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  {t('first_name_label')} *
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
                  {t('last_name_label')} *
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
                  {t('email_label')} *
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
                  {t('phone_label')}
                </label>
                <input
                  type="tel"
                  value={member.phone}
                  onChange={(e) => updateMember(member.id, { phone: e.target.value })}
                  placeholder="+44 20 1234 5678"
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-fase-navy mb-2">
                {t('job_title_label')} *
              </label>
              <input
                type="text"
                value={member.jobTitle}
                onChange={(e) => updateMember(member.id, { jobTitle: e.target.value })}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>

          </div>
        ))}

        {members.length < 3 && (
          <button
            type="button"
            onClick={addMember}
            className="w-full p-3 border-2 border-dashed border-fase-light-gold rounded-lg text-fase-navy hover:border-fase-navy hover:bg-fase-light-blue transition-colors"
          >
            {t('add_member_button')}
          </button>
        )}
      </div>
    </div>
  );
};