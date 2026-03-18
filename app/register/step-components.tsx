'use client';

import { useTranslations } from 'next-intl';
import { ValidatedInput, validatePassword } from './form-components';
import { UseRegistrationForm } from './registration-hooks';

// Step 1: Account Information
export const AccountInformationStep = ({ reg }: { reg: UseRegistrationForm }) => {
  const t = useTranslations('register_form.account_info');
  const { form, ui, setField, touchField } = reg;

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
          value={form.firstName}
          onChange={(v) => setField('firstName', v)}
          placeholder={t('name_placeholder')}
          required
          touchedFields={ui.touchedFields}
          attemptedNext={ui.attemptedNext}
          markFieldTouched={touchField}
        />

        <ValidatedInput
          label={t('surname_label')}
          fieldKey="surname"
          value={form.surname}
          onChange={(v) => setField('surname', v)}
          placeholder={t('surname_placeholder')}
          required
          touchedFields={ui.touchedFields}
          attemptedNext={ui.attemptedNext}
          markFieldTouched={touchField}
        />
      </div>

      <ValidatedInput
        label={t('email_label')}
        fieldKey="email"
        type="email"
        value={form.email}
        onChange={(v) => setField('email', v)}
        required
        touchedFields={ui.touchedFields}
        attemptedNext={ui.attemptedNext}
        markFieldTouched={touchField}
      />

      <ValidatedInput
        label={t('password_label')}
        fieldKey="password"
        type="password"
        value={form.password}
        onChange={(v) => {
          setField('password', v);
          reg.dispatch({ type: 'SET_SHOW_PASSWORD_REQS', value: v.length > 0 });
        }}
        onFocus={() => reg.dispatch({ type: 'SET_SHOW_PASSWORD_REQS', value: true })}
        onBlur={() => reg.dispatch({ type: 'SET_SHOW_PASSWORD_REQS', value: form.password.length > 0 })}
        required
        touchedFields={ui.touchedFields}
        attemptedNext={ui.attemptedNext}
        markFieldTouched={touchField}
      />

      {ui.showPasswordReqs && (
        <div className="mt-2">
          <p className="text-xs font-medium text-fase-black mb-2">{t('password_requirements')}</p>
          {(() => {
            const { requirements } = validatePassword(form.password);
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
        value={form.confirmPassword}
        onChange={(v) => setField('confirmPassword', v)}
        required
        touchedFields={ui.touchedFields}
        attemptedNext={ui.attemptedNext}
        markFieldTouched={touchField}
      />
    </div>
  );
};

// Organization Type Selection Component
export const OrganizationTypeSelector = ({ reg }: { reg: UseRegistrationForm }) => {
  const t = useTranslations('register_form.organization_selection');
  const { form, setField } = reg;

  const setType = (type: 'MGA' | 'carrier' | 'provider') => setField('organizationType', type);

  return (
    <div>
      <label className="block text-sm font-medium text-fase-navy mb-4">
        {t('organization_type')} *
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => setType('MGA')}
          className={`p-6 border-2 rounded-lg transition-colors text-left ${
            form.organizationType === 'MGA'
              ? 'border-fase-navy bg-fase-cream'
              : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
          }`}
        >
          <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('mga_title')}</h4>
          <p className="text-fase-black text-sm">{t('mga_description')}</p>
        </button>
        <button
          onClick={() => setType('carrier')}
          className={`p-6 border-2 rounded-lg transition-colors text-left ${
            form.organizationType === 'carrier'
              ? 'border-fase-navy bg-fase-cream'
              : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
          }`}
        >
          <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('carrier_title')}</h4>
          <p className="text-fase-black text-sm">{t('carrier_description')}</p>
        </button>
        <button
          onClick={() => setType('provider')}
          className={`p-6 border-2 rounded-lg transition-colors text-left ${
            form.organizationType === 'provider'
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
