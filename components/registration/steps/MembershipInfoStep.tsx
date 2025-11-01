import { StepComponentProps, Member, MembershipType, OrganizationType } from '../../../lib/registration/types';

interface ValidatedInputProps {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (field: string) => void;
}

interface ValidatedSelectProps {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (field: string) => void;
}

// These components would normally be imported from a shared components directory
const ValidatedInput = ({ label, fieldKey, value, onChange, placeholder, required, touchedFields, attemptedNext, markFieldTouched }: ValidatedInputProps) => {
  const hasError = required && (touchedFields[fieldKey] || attemptedNext) && !value.trim();
  
  return (
    <div>
      <label className="block text-sm font-medium text-fase-navy mb-2">
        {label} {required && '*'}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          markFieldTouched(fieldKey);
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
          hasError ? 'border-red-300' : 'border-fase-light-gold'
        }`}
      />
    </div>
  );
};

const ValidatedSelect = ({ label, fieldKey, value, onChange, options, required, touchedFields, attemptedNext, markFieldTouched }: ValidatedSelectProps) => {
  const hasError = required && (touchedFields[fieldKey] || attemptedNext) && !value;
  
  return (
    <div>
      <label className="block text-sm font-medium text-fase-navy mb-2">
        {label} {required && '*'}
      </label>
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          markFieldTouched(fieldKey);
        }}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
          hasError ? 'border-red-300' : 'border-fase-light-gold'
        }`}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const organizationTypeOptions = [
  { value: 'MGA', label: 'Managing General Agent (MGA)' },
  { value: 'carrier', label: 'Insurance Carrier/Insurer' },
  { value: 'provider', label: 'Service Provider' }
];

export default function MembershipInfoStep({ state, actions }: StepComponentProps) {
  const { 
    membershipType, 
    organizationName, 
    organizationType, 
    members, 
    firstName, 
    surname,
    touchedFields,
    attemptedNext
  } = state;

  const addMember = () => {
    if (members.length >= 3) return;
    
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
    
    actions.updateField('members', [...members, newMember]);
  };

  const removeMember = (memberId: string) => {
    const newMembers = members.filter(m => m.id !== memberId);
    // If we removed the account administrator, make the first member administrator
    const removedMember = members.find(m => m.id === memberId);
    if (removedMember?.isPrimaryContact && newMembers.length > 0) {
      newMembers[0].isPrimaryContact = true;
    }
    actions.updateField('members', newMembers);
  };

  const updateMember = (memberId: string, field: keyof Member, value: string | boolean) => {
    const newMembers = members.map(member => {
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
    actions.updateField('members', newMembers);
  };

  const setPrimaryContact = (memberId: string) => {
    const newMembers = members.map(member => ({
      ...member,
      isPrimaryContact: member.id === memberId
    }));
    actions.updateField('members', newMembers);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Membership Information</h3>
        <p className="text-fase-black text-sm">Tell us about your organization</p>
      </div>

      {/* Organization Information */}
      <ValidatedInput
        label="Organization Name"
        fieldKey="organizationName"
        value={organizationName}
        onChange={(value) => actions.updateField('organizationName', value)}
        placeholder="Your company or organization name"
        required
        touchedFields={touchedFields}
        attemptedNext={attemptedNext}
        markFieldTouched={actions.markFieldTouched}
      />

      <ValidatedSelect
        label="Organization Type"
        fieldKey="organizationType"
        value={organizationType}
        onChange={(value) => actions.updateField('organizationType', value as OrganizationType)}
        options={organizationTypeOptions}
        required
        touchedFields={touchedFields}
        attemptedNext={attemptedNext}
        markFieldTouched={actions.markFieldTouched}
      />

      {/* Team Members Section - Only for corporate memberships */}
      {membershipType === 'corporate' && (
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
                      onChange={(e) => updateMember(member.id, 'firstName', e.target.value)}
                      placeholder="First name"
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
                      onChange={(e) => updateMember(member.id, 'lastName', e.target.value)}
                      placeholder="Last name"
                      className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={member.id === 'registrant'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fase-navy mb-2">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      value={member.jobTitle}
                      onChange={(e) => updateMember(member.id, 'jobTitle', e.target.value)}
                      placeholder="e.g. CEO, Manager"
                      className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fase-navy mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={member.email}
                      onChange={(e) => updateMember(member.id, 'email', e.target.value)}
                      placeholder="email@company.com"
                      className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      disabled={member.id === 'registrant'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fase-navy mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={member.phone}
                      onChange={(e) => updateMember(member.id, 'phone', e.target.value)}
                      placeholder="+44 20 1234 5678"
                      className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    />
                  </div>
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
          </div>

          {/* Add Member Button */}
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
      )}
    </div>
  );
}