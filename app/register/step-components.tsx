'use client';

import { ValidatedInput, validatePassword } from './form-components';

// Step 1: Account Information
export const AccountInformationStep = ({
  firstName,
  setFirstName,
  surname,
  setSurname,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPasswordReqs,
  setShowPasswordReqs,
  touchedFields,
  attemptedNext,
  markFieldTouched
}: {
  firstName: string;
  setFirstName: (value: string) => void;
  surname: string;
  setSurname: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPasswordReqs: boolean;
  setShowPasswordReqs: (value: boolean) => void;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (fieldKey: string) => void;
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Create Your Account</h3>
        <p className="text-fase-black text-sm">We&apos;ll create your account and membership application together</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ValidatedInput
          label="Name"
          fieldKey="firstName"
          value={firstName}
          onChange={setFirstName}
          placeholder="Your first name"
          required
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
        
        <ValidatedInput
          label="Surname"
          fieldKey="surname"
          value={surname}
          onChange={setSurname}
          placeholder="Your surname"
          required
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
      </div>
      
      <ValidatedInput
        label="Email"
        fieldKey="email"
        type="email"
        value={email}
        onChange={setEmail}
        required
        touchedFields={touchedFields}
        attemptedNext={attemptedNext}
        markFieldTouched={markFieldTouched}
      />
      
      <ValidatedInput
        label="Password"
        fieldKey="password"
        type="password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          setShowPasswordReqs(value.length > 0);
        }}
        onFocus={() => setShowPasswordReqs(true)}
        onBlur={() => setShowPasswordReqs(password.length > 0)}
        required
        touchedFields={touchedFields}
        attemptedNext={attemptedNext}
        markFieldTouched={markFieldTouched}
      />
      
      {/* Password Requirements */}
      {showPasswordReqs && (
        <div className="mt-2">
          <p className="text-xs font-medium text-fase-black mb-2">Password must include:</p>
          {(() => {
            const { requirements } = validatePassword(password);
            return (
              <div className="space-y-1">
                <div className={`text-xs flex items-center ${requirements.length ? "text-green-600" : "text-fase-black"}`}>
                  <span className="mr-2">{requirements.length ? "✓" : "○"}</span>
                  At least 8 characters
                </div>
                <div className={`text-xs flex items-center ${requirements.capital ? "text-green-600" : "text-fase-black"}`}>
                  <span className="mr-2">{requirements.capital ? "✓" : "○"}</span>
                  One capital letter (A-Z)
                </div>
                <div className={`text-xs flex items-center ${requirements.special ? "text-green-600" : "text-fase-black"}`}>
                  <span className="mr-2">{requirements.special ? "✓" : "○"}</span>
                  One special character (!@#$%^&*...)
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <ValidatedInput
        label="Confirm Password"
        fieldKey="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        required
        touchedFields={touchedFields}
        attemptedNext={attemptedNext}
        markFieldTouched={markFieldTouched}
      />
    </div>
  );
};

// Organization Type Selection Component
export const OrganizationTypeSelector = ({
  organizationType,
  setOrganizationType
}: {
  organizationType: 'MGA' | 'carrier' | 'provider';
  setOrganizationType: (type: 'MGA' | 'carrier' | 'provider') => void;
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-fase-navy mb-4">
        Organization Type *
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setOrganizationType('MGA')}
          className={`p-6 border-2 rounded-lg transition-colors text-left ${
            organizationType === 'MGA' 
              ? 'border-fase-navy bg-fase-cream' 
              : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
          }`}
        >
          <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">MGA</h4>
          <p className="text-fase-black text-sm">Managing General Agents transacting business in Europe</p>
        </button>
        <button
          onClick={() => setOrganizationType('carrier')}
          className={`p-6 border-2 rounded-lg transition-colors text-left ${
            organizationType === 'carrier' 
              ? 'border-fase-navy bg-fase-cream' 
              : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
          }`}
        >
          <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Carrier</h4>
          <p className="text-fase-black text-sm">Insurance companies and reinsurers working with MGAs</p>
        </button>
        <button
          onClick={() => setOrganizationType('provider')}
          className={`p-6 border-2 rounded-lg transition-colors text-left ${
            organizationType === 'provider' 
              ? 'border-fase-navy bg-fase-cream' 
              : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
          }`}
        >
          <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Service Provider</h4>
          <p className="text-fase-black text-sm">Technology, legal, financial and other service providers to MGAs</p>
        </button>
      </div>
    </div>
  );
};