'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('register_form.account_info');
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('title')}</h3>
        <p className="text-fase-black text-sm">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ValidatedInput
          label={t('name_label')}
          fieldKey="firstName"
          value={firstName}
          onChange={setFirstName}
          placeholder={t('name_placeholder')}
          required
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
        
        <ValidatedInput
          label={t('surname_label')}
          fieldKey="surname"
          value={surname}
          onChange={setSurname}
          placeholder={t('surname_placeholder')}
          required
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
      </div>
      
      <ValidatedInput
        label={t('email_label')}
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
        label={t('password_label')}
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
          <p className="text-xs font-medium text-fase-black mb-2">{t('password_requirements')}</p>
          {(() => {
            const { requirements } = validatePassword(password);
            return (
              <div className="space-y-1">
                <div className={`text-xs flex items-center ${requirements.length ? "text-green-600" : "text-fase-black"}`}>
                  <span className="mr-2">{requirements.length ? "✓" : "○"}</span>
                  {t('req_length')}
                </div>
                <div className={`text-xs flex items-center ${requirements.capital ? "text-green-600" : "text-fase-black"}`}>
                  <span className="mr-2">{requirements.capital ? "✓" : "○"}</span>
                  {t('req_uppercase')}
                </div>
                <div className={`text-xs flex items-center ${requirements.special ? "text-green-600" : "text-fase-black"}`}>
                  <span className="mr-2">{requirements.special ? "✓" : "○"}</span>
                  {t('req_special')}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <ValidatedInput
        label={t('confirm_password_label')}
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
  const t = useTranslations('register_form.organization_selection');
  
  return (
    <div>
      <label className="block text-sm font-medium text-fase-navy mb-4">
        {t('organization_type')} *
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
          <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('mga_title')}</h4>
          <p className="text-fase-black text-sm">{t('mga_description')}</p>
        </button>
        <button
          onClick={() => setOrganizationType('carrier')}
          className={`p-6 border-2 rounded-lg transition-colors text-left ${
            organizationType === 'carrier' 
              ? 'border-fase-navy bg-fase-cream' 
              : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
          }`}
        >
          <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('carrier_title')}</h4>
          <p className="text-fase-black text-sm">{t('carrier_description')}</p>
        </button>
        <button
          onClick={() => setOrganizationType('provider')}
          className={`p-6 border-2 rounded-lg transition-colors text-left ${
            organizationType === 'provider' 
              ? 'border-fase-navy bg-fase-cream' 
              : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
          }`}
        >
          <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('provider_title')}</h4>
          <p className="text-fase-black text-sm">{t('provider_description')}</p>
        </button>
      </div>
    </div>
  );
};