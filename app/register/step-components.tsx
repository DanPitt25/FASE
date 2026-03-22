'use client';

import { useTranslations } from 'next-intl';
import { ValidatedInput, validatePassword, validateEmail } from './form-components';
import { UseRegistrationForm } from './registration-hooks';
import { getRendezvousPassPrice, getRendezvousPassSubtotal, calculateMembershipFee, getDiscountedFee } from './registration-utils';

// Step 0: Organization Type + Data Consent (combined)
export const OrganizationAndConsentStep = ({ reg }: { reg: UseRegistrationForm }) => {
  const t = useTranslations('register_form');
  const { form, setField } = reg;

  const setType = (type: 'MGA' | 'carrier' | 'provider') => setField('organizationType', type);

  return (
    <div className="space-y-8">
      {/* Organization Type Selection */}
      <div>
        <div className="text-center mb-6">
          <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.organization_type.title')}</h3>
          <p className="text-fase-black text-sm">{t('steps.organization_type.subtitle')}</p>
        </div>

        <label className="block text-sm font-medium text-fase-navy mb-4">
          {t('organization_selection.organization_type')} *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            type="button"
            onClick={() => setType('MGA')}
            className={`p-6 border-2 rounded-lg transition-colors text-left ${
              form.organizationType === 'MGA'
                ? 'border-fase-navy bg-fase-cream'
                : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
            }`}
          >
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('organization_selection.mga_title')}</h4>
            <p className="text-fase-black text-sm">{t('organization_selection.mga_description')}</p>
          </button>
          <button
            type="button"
            onClick={() => setType('carrier')}
            className={`p-6 border-2 rounded-lg transition-colors text-left ${
              form.organizationType === 'carrier'
                ? 'border-fase-navy bg-fase-cream'
                : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
            }`}
          >
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('organization_selection.carrier_title')}</h4>
            <p className="text-fase-black text-sm">{t('organization_selection.carrier_description')}</p>
          </button>
          <button
            type="button"
            onClick={() => setType('provider')}
            className={`p-6 border-2 rounded-lg transition-colors text-left ${
              form.organizationType === 'provider'
                ? 'border-fase-navy bg-fase-cream'
                : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
            }`}
          >
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('organization_selection.provider_title')}</h4>
            <p className="text-fase-black text-sm">{t('organization_selection.provider_description')}</p>
          </button>
        </div>
      </div>

      {/* Data Notice Consent - only show when org type is selected */}
      {form.organizationType && (
        <div className="border-t border-fase-light-gold pt-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.data_notice.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.data_notice.subtitle')}</p>
          </div>
          <div className="bg-white border border-fase-light-gold rounded-lg p-6 max-h-96 overflow-y-auto shadow-sm">
            <div className="space-y-4 text-base text-fase-black">
              <h4 className="font-semibold text-fase-navy text-lg">{t('data_notice.title')}</h4>
              <p className="mb-3"><strong>{t('data_notice.controller')}</strong></p>
              <p className="mb-3">{t('data_notice.purpose')}</p>
              <p className="mb-2"><strong>{t('data_notice.legal_basis.title')}</strong></p>
              <ul className="list-disc list-inside ml-4 mb-3">
                <li><strong>{t('data_notice.legal_basis.contractual')}</strong></li>
                <li><strong>{t('data_notice.legal_basis.legitimate')}</strong></li>
                <li><strong>{t('data_notice.legal_basis.legal')}</strong></li>
                <li><strong>{t('data_notice.legal_basis.consent')}</strong></li>
              </ul>
              <p className="mb-3"><strong>{t('data_notice.sharing')}</strong></p>
              <p className="mb-3"><strong>{t('data_notice.retention')}</strong></p>
              <p className="mb-3"><strong>{t('data_notice.rights.title')}</strong></p>
              <ul className="list-disc list-inside ml-4 mb-3">
                <li>{t('data_notice.rights.access')}</li>
                <li>{t('data_notice.rights.rectify')}</li>
                <li>{t('data_notice.rights.erase')}</li>
                <li>{t('data_notice.rights.restrict')}</li>
                <li>{t('data_notice.rights.portability')}</li>
                <li>{t('data_notice.rights.withdraw')}</li>
                <li>{t('data_notice.rights.complain')}</li>
              </ul>
              <p className="mb-3"><strong>{t('data_notice.contact')}</strong></p>
            </div>
          </div>
          <div className="bg-white border border-fase-light-gold rounded-lg p-4 mt-4">
            <label className="flex items-start space-x-3">
              <input type="checkbox" checked={form.dataNoticeConsent} onChange={(e) => setField('dataNoticeConsent', e.target.checked)} className="mt-1 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded" />
              <span className="text-base text-fase-black">{t('data_notice.consent_text')}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

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

// Rendezvous Pass Reservation Section (for Step 3)
export const RendezvousSection = ({ reg, totalGWP }: { reg: UseRegistrationForm; totalGWP: number }) => {
  const t = useTranslations('register_form');
  const { form, setField, isAsaseMember } = reg;
  const orgType = form.organizationType as 'MGA' | 'carrier' | 'provider';
  const asase = isAsaseMember();
  const passPrice = getRendezvousPassPrice(orgType, asase);
  const passSubtotal = getRendezvousPassSubtotal(orgType, form.rendezvousPassCount, form.reserveRendezvousPasses, asase);

  return (
    <div className="bg-white rounded-lg border border-fase-light-gold p-6">
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">{t('rendezvous.title')}</h4>
      <p className="text-fase-black mb-4">{asase ? t('rendezvous.description_asase') : t('rendezvous.description')}</p>
      <p className="text-fase-black mb-6">
        <a href="https://mgarendezvous.com" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline transition-colors">{t('rendezvous.visit_website')}</a>
      </p>
      <div className="flex items-center space-x-3 mb-4">
        <input type="checkbox" checked={form.reserveRendezvousPasses} onChange={(e) => setField('reserveRendezvousPasses', e.target.checked)} className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded" id="reserve-passes" />
        <label htmlFor="reserve-passes" className="text-sm font-medium text-fase-black cursor-pointer">{asase ? t('rendezvous.checkbox_label_asase') : t('rendezvous.checkbox_label')}</label>
      </div>
      {form.reserveRendezvousPasses && (
        <div className="mt-4 space-y-6">
          <div>
            <label className="block text-sm font-medium text-fase-navy mb-2">{t('rendezvous.number_of_passes')}</label>
            <select value={form.rendezvousPassCount} onChange={(e) => setField('rendezvousPassCount', parseInt(e.target.value))} className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent bg-white">
              {(asase ? [1, 2, 3] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          <div className="space-y-4">
            <h5 className="text-md font-medium text-fase-navy">{t('rendezvous.attendee_details')}</h5>
            {form.rendezvousAttendees.map((attendee, index) => (
              <div key={attendee.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm font-medium text-fase-navy mb-3">{t('rendezvous.attendee_number', { number: index + 1 })}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('rendezvous.first_name')} *</label>
                    <input type="text" value={attendee.firstName} onChange={(e) => reg.updateRendezvousAttendee(attendee.id, 'firstName', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('rendezvous.last_name')} *</label>
                    <input type="text" value={attendee.lastName} onChange={(e) => reg.updateRendezvousAttendee(attendee.id, 'lastName', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('rendezvous.email')} *</label>
                    <input type="email" value={attendee.email} onChange={(e) => reg.updateRendezvousAttendee(attendee.id, 'email', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('rendezvous.job_title')} *</label>
                    <input type="text" value={attendee.jobTitle} onChange={(e) => reg.updateRendezvousAttendee(attendee.id, 'jobTitle', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-fase-cream rounded p-3 border border-fase-light-gold">
            {asase ? (
              <>
                <p className="text-sm font-medium text-green-700 mb-1">{t('rendezvous.pass_total')}: {t('rendezvous.complimentary')}</p>
                <p className="text-xs text-green-600">{t('rendezvous.asase_benefit', { count: form.rendezvousPassCount })}</p>
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-gray-600">{form.rendezvousPassCount} × €{passPrice.toLocaleString()} {t('rendezvous.member_rate')}</p>
                <p className="text-sm font-medium text-fase-navy pt-1 border-t border-fase-light-gold">{t('rendezvous.pass_total')}: €{passSubtotal.toLocaleString()}</p>
                <p className="text-xs text-gray-500 italic">VAT will be billed separately</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Step 4: Review & Submit
interface ReviewStepProps {
  reg: UseRegistrationForm;
  totalGWP: number;
  onSubmit: () => void;
}

export const ReviewStep = ({ reg, totalGWP, onSubmit }: ReviewStepProps) => {
  const t = useTranslations('register_form');
  const { form, ui, setField, isAsaseMember } = reg;
  const orgType = form.organizationType as 'MGA' | 'carrier' | 'provider';
  const asase = isAsaseMember();

  const membershipFee = calculateMembershipFee(orgType, totalGWP.toString(), form.portfolio.gwpCurrency);
  const discountedFee = getDiscountedFee(orgType, totalGWP.toString(), form.portfolio.gwpCurrency, form.hasOtherAssociations || false);
  const passSubtotal = getRendezvousPassSubtotal(orgType, form.rendezvousPassCount, form.reserveRendezvousPasses, asase);
  const passPrice = getRendezvousPassPrice(orgType, asase);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.submit_application.title')}</h3>
        <p className="text-fase-black text-sm">{t('steps.submit_application.subtitle')}</p>
      </div>

      {/* Code of Conduct */}
      <div className="bg-white rounded-lg border border-fase-light-gold p-6">
        <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">{t('code_of_conduct.review_header')}</h4>
        <div className="bg-white border border-fase-light-gold rounded-lg p-6 max-h-96 overflow-y-auto shadow-sm mb-4">
          <div className="text-base text-fase-black prose prose-base max-w-none">
            <h4 className="font-semibold text-fase-navy text-lg mb-4">{t('code_of_conduct.intro.title')}</h4>
            <p className="mb-3">{t('code_of_conduct.intro.content.paragraph1')}</p>
            <p className="mb-3">{t('code_of_conduct.intro.content.paragraph2')}</p>
            <p className="mb-4">{t('code_of_conduct.intro.content.paragraph3')}</p>
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.legal.title')}</h5>
            <div className="mb-4" style={{whiteSpace: 'pre-line'}}>{t('code_of_conduct.sections.legal.content')}</div>
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.financial.title')}</h5>
            <div className="mb-4" style={{whiteSpace: 'pre-line'}}>{t('code_of_conduct.sections.financial.content')}</div>
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.inter_org.title')}</h5>
            <div className="mb-4" style={{whiteSpace: 'pre-line'}}>{t('code_of_conduct.sections.inter_org.content')}</div>
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.community.title')}</h5>
            <div className="mb-4" style={{whiteSpace: 'pre-line'}}>{t('code_of_conduct.sections.community.content')}</div>
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.insurers.title')}</h5>
            <div className="mb-4" style={{whiteSpace: 'pre-line'}}>{t('code_of_conduct.sections.insurers.content')}</div>
            <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.brokers.title')}</h5>
            <div className="mb-6" style={{whiteSpace: 'pre-line'}}>{t('code_of_conduct.sections.brokers.content')}</div>
            <p className="mt-6 pt-4 border-t border-gray-200 font-medium">{t('code_of_conduct.reporting.content.paragraph1')}</p>
          </div>
        </div>
        <div className="bg-white border border-fase-light-gold rounded-lg p-4">
          <label className="flex items-start space-x-3">
            <input type="checkbox" checked={form.codeOfConductConsent} onChange={(e) => setField('codeOfConductConsent', e.target.checked)} className="mt-1 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded" />
            <span className="text-sm text-fase-black">{t('code_of_conduct.consent_text')}</span>
          </label>
        </div>
      </div>

      {/* Application Summary */}
      <div className="bg-white rounded-lg border border-fase-light-gold p-6 space-y-4">
        <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">{t('application_summary.title')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-fase-navy font-medium">{t('application_summary.organization')}:</span><p className="text-fase-black">{form.organizationName}</p></div>
          <div><span className="text-fase-navy font-medium">{t('application_summary.membership_type')}:</span><p className="text-fase-black">{`${form.organizationType.charAt(0).toUpperCase() + form.organizationType.slice(1)} Corporate`}</p></div>
          <div><span className="text-fase-navy font-medium">{t('application_summary.contact_email')}:</span><p className="text-fase-black">{form.members.find(m => m.isPrimaryContact)?.email || form.email}</p></div>
          <div><span className="text-fase-navy font-medium">{t('application_summary.country')}:</span><p className="text-fase-black">{form.address.country}</p></div>
          {form.organizationType === 'MGA' && totalGWP > 0 && (
            <div className="md:col-span-2"><span className="text-fase-navy font-medium">{t('application_summary.gwp')}:</span><p className="text-fase-black">{form.portfolio.gwpCurrency === 'EUR' ? '€' : form.portfolio.gwpCurrency === 'GBP' ? '£' : '$'}{totalGWP.toLocaleString('en-US')}</p></div>
          )}
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="bg-white rounded-lg border border-fase-light-gold p-6">
        <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">{t('pricing.title')}</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-fase-light-gold">
            <span className="text-fase-black font-medium">{t('pricing.membership_fee')}</span>
            <span className="text-fase-navy font-semibold">€{membershipFee.toLocaleString()}</span>
          </div>
          {form.hasOtherAssociations && (
            <div className="flex justify-between items-center py-2 border-b border-fase-light-gold">
              <span className="text-green-600 font-medium">{t('pricing.discount')}</span>
              <span className="text-green-600 font-semibold">-€{(membershipFee - discountedFee).toLocaleString()}</span>
            </div>
          )}
          {form.reserveRendezvousPasses && (
            <div className="py-2 border-b border-fase-light-gold">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-fase-black font-medium">{t('rendezvous.passes_label')}</span>
                  {asase ? (
                    <p className="text-xs text-green-600">{t('rendezvous.asase_benefit', { count: form.rendezvousPassCount })}</p>
                  ) : (
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p>{form.rendezvousPassCount} × €{passPrice.toLocaleString()} {t('rendezvous.member_rate')}</p>
                      <p className="text-gray-500 italic">VAT will be billed separately</p>
                    </div>
                  )}
                </div>
                {asase ? <span className="text-green-600 font-semibold">{t('rendezvous.complimentary')}</span> : <span className="text-fase-navy font-semibold">€{passSubtotal.toLocaleString()}</span>}
              </div>
            </div>
          )}
          <div className="flex justify-between items-center py-3 border-t-2 border-fase-navy">
            <span className="text-fase-navy text-lg font-bold">{t('pricing.total_annual')}</span>
            <span className="text-fase-navy text-xl font-bold">€{(discountedFee + passSubtotal).toLocaleString()}</span>
          </div>
          {form.hasOtherAssociations && <p className="text-sm text-green-600 italic">{t('pricing.discount_note')}</p>}
        </div>
      </div>

      {/* Submit Button */}
      <div className="text-center">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!form.codeOfConductConsent || ui.submitting}
          className="w-full px-6 py-3 bg-fase-navy text-white font-medium rounded-lg hover:bg-fase-navy/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {ui.submitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('buttons.submitting_application')}
            </span>
          ) : t('buttons.submit_application')}
        </button>
      </div>
    </div>
  );
};

// Legacy exports for backwards compatibility
export const OrganizationTypeSelector = OrganizationAndConsentStep;
