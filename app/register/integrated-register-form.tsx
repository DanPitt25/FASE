'use client';

import { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';
import Button from "../../components/Button";
import { ValidatedInput, validatePassword, validateEmail } from './form-components';
import { useRegistrationForm, TOTAL_STEPS } from './registration-hooks';
import { OrganizationAndConsentStep, AccountInformationStep, RendezvousSection, ReviewStep } from './step-components';
import { TeamMembersSection } from './member-management';
import { AddressSection } from './address-components';
import { MGAPortfolioSection } from './mga-components';
import { CarrierInformationSection, ServiceProviderSection } from './carrier-provider-components';
import { EuropeanAssociationsSection } from './associations-components';
import { checkDomainExists, createAccountAndMembership } from './registration-handlers';
import { getDiscountedFee, getRendezvousPassSubtotal, convertToEUR, getGWPBand } from './registration-utils';

// Validation functions for each step
type StepValidator = (form: ReturnType<typeof useRegistrationForm>['form'], t: ReturnType<typeof useTranslations>) => string | null;

const validateStep0: StepValidator = (form, t) => {
  if (!form.organizationType) return t('errors.select_organization_type');
  if (!form.dataNoticeConsent) return t('errors.consent_required');
  return null;
};

const validateStep1: StepValidator = (form, t) => {
  if (!form.firstName || !form.surname || !form.email || !form.password || !form.confirmPassword) {
    return t('errors.fill_required_fields');
  }
  if (!validateEmail(form.email)) return t('errors.invalid_email_format');
  if (form.password !== form.confirmPassword) return t('errors.passwords_dont_match');
  const { isValid, requirements } = validatePassword(form.password);
  if (!isValid) {
    const missing = [];
    if (!requirements.length) missing.push(t('errors.eight_characters'));
    if (!requirements.capital) missing.push(t('errors.capital_letter'));
    if (!requirements.special) missing.push(t('errors.special_character'));
    return t('errors.password_requirements_prefix') + missing.join(", ");
  }
  return null;
};

const validateStep2: StepValidator = (form, t) => {
  if (!form.organizationName.trim()) return t('errors.organization_name_required');
  if (form.members.length === 0) return t('errors.team_member_required');
  if (!form.members.some(m => m.isPrimaryContact)) return t('errors.primary_contact_required');
  for (const member of form.members) {
    if (!member.firstName?.trim() || !member.lastName?.trim()) return t('errors.members_need_name');
    if (!member.email.trim()) return t('errors.members_need_email');
    if (!member.jobTitle.trim()) return t('errors.members_need_job_title');
  }
  if (!form.address.line1.trim() || !form.address.city.trim() || !form.address.country) {
    return t('errors.address_required');
  }
  return null;
};

const validateStep3 = (form: ReturnType<typeof useRegistrationForm>['form'], t: ReturnType<typeof useTranslations>, totalGWP: number): string | null => {
  // MGA-specific validation
  if (form.organizationType === 'MGA' && totalGWP <= 0) {
    return t('errors.gwp_must_be_greater_than_zero');
  }

  // Carrier-specific validation
  if (form.organizationType === 'carrier') {
    const ci = form.carrierInfo;
    if (ci.organizationType === 'insurance_company' || ci.organizationType === 'reinsurance_company' || ci.organizationType === 'lloyds_managing_agency') {
      if (!ci.isDelegatingInEurope) return t('errors.carrier_delegation_required');
      if (ci.isDelegatingInEurope === 'Yes') {
        if (!ci.numberOfMGAs) return t('errors.carrier_mga_count_required');
        if (!ci.delegatingCountries.length) return t('errors.carrier_countries_required');
      }
      if (!ci.frontingOptions) return t('errors.carrier_fronting_required');
      if (!ci.considerStartupMGAs) return t('errors.carrier_startup_required');
    }
  }

  // Provider-specific validation
  if (form.organizationType === 'provider' && !form.servicesProvided.length) {
    return t('errors.service_provider_services_required');
  }

  // Associations validation
  if (form.hasOtherAssociations === null) return t('errors.associations_specify_required');
  if (form.hasOtherAssociations && form.otherAssociations.length === 0) {
    return t('errors.associations_select_required');
  }

  // Rendezvous validation (if reserving)
  if (form.reserveRendezvousPasses) {
    const incomplete = form.rendezvousAttendees.find(a => !a.firstName.trim() || !a.lastName.trim() || !a.email.trim() || !a.jobTitle.trim());
    if (incomplete) return t('errors.rendezvous_attendee_required');
    const invalidEmail = form.rendezvousAttendees.find(a => !validateEmail(a.email));
    if (invalidEmail) return t('errors.rendezvous_invalid_email');
  }

  return null;
};

export default function IntegratedRegisterForm() {
  const t = useTranslations('register_form');
  const reg = useRegistrationForm();
  const { form, ui, setField, setStep, setError, setAttemptedNext, setSubmitting, addMember, updateMember, syncRendezvousAttendeesWithCount, getTotalGWP, isAsaseMember, isTestMode } = reg;

  // Test mode state
  const [showTestPreview, setShowTestPreview] = useState(false);
  const [testFirestoreDoc, setTestFirestoreDoc] = useState<object | null>(null);

  // Scroll to top helper
  const scrollToTop = () => {
    const formContainer = document.querySelector('.overflow-y-auto');
    if (formContainer) {
      formContainer.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  };

  // Initialize registrant as first member when personal info is filled
  useEffect(() => {
    if (form.members.length === 0 && form.firstName && form.surname && form.email) {
      addMember({
        id: 'registrant',
        firstName: form.firstName,
        lastName: form.surname,
        name: `${form.firstName} ${form.surname}`.trim(),
        email: form.email,
        phone: '',
        jobTitle: '',
        isPrimaryContact: true
      });
    }
  }, [form.firstName, form.surname, form.email, form.members.length, addMember]);

  // Sync registrant member when personal info changes
  useEffect(() => {
    const registrant = form.members.find(m => m.id === 'registrant');
    if (registrant && (registrant.firstName !== form.firstName || registrant.lastName !== form.surname || registrant.email !== form.email)) {
      updateMember('registrant', {
        firstName: form.firstName,
        lastName: form.surname,
        email: form.email
      });
    }
  }, [form.firstName, form.surname, form.email, form.members, updateMember]);

  // Sync rendezvous attendees with pass count
  useEffect(() => {
    syncRendezvousAttendeesWithCount(form.rendezvousPassCount);
  }, [form.rendezvousPassCount, syncRendezvousAttendeesWithCount]);

  // Clamp pass count to 3 when ASASE membership is selected
  useEffect(() => {
    if (isAsaseMember() && form.rendezvousPassCount > 3) {
      setField('rendezvousPassCount', 3);
    }
  }, [form.otherAssociations, form.rendezvousPassCount, isAsaseMember, setField]);

  // Computed values
  const totalGWP = getTotalGWP();
  const orgType = form.organizationType as 'MGA' | 'carrier' | 'provider';

  // Step validation and navigation
  const handleNext = async () => {
    setAttemptedNext(true);
    setError('');

    let error: string | null = null;

    switch (ui.step) {
      case 0:
        error = validateStep0(form, t);
        break;
      case 1:
        error = validateStep1(form, t);
        if (!error && !isTestMode) {
          try {
            const domainExists = await checkDomainExists(form.email);
            if (domainExists) {
              error = t('errors.domain_already_registered');
            }
          } catch (e: any) {
            error = e.message || t('errors.verification_failed');
          }
        }
        break;
      case 2:
        error = validateStep2(form, t);
        break;
      case 3:
        error = validateStep3(form, t, totalGWP);
        break;
    }

    if (error) {
      setError(error);
      return;
    }

    setStep(ui.step + 1);
    scrollToTop();
  };

  const handleBack = () => {
    if (ui.step > 0) {
      setStep(ui.step - 1);
      scrollToTop();
    }
  };

  // Build the Firestore document that would be created (for test mode)
  const buildFirestoreDocument = () => {
    const primaryContact = form.members.find(m => m.isPrimaryContact);
    const gwpEUR = form.organizationType === 'MGA' ? convertToEUR(totalGWP, form.portfolio.gwpCurrency) : 0;
    const gwpBand = form.organizationType === 'MGA' ? getGWPBand(gwpEUR) : undefined;
    const asase = isAsaseMember();
    const passSubtotal = getRendezvousPassSubtotal(orgType, form.rendezvousPassCount, form.reserveRendezvousPasses, asase);
    const passPrice = form.reserveRendezvousPasses ? (asase ? 0 : { MGA: 400, carrier: 550, provider: 700 }[orgType] || 400) : 0;

    const accountDoc = {
      email: form.email,
      displayName: form.organizationName,
      personalName: `${form.firstName} ${form.surname}`,
      isCompanyAccount: true,
      primaryContactMemberId: 'will-be-set-to-userId',
      paymentUserId: 'will-be-set-to-userId',
      membershipType: 'corporate',
      organizationName: form.organizationName,
      organizationType: form.organizationType,
      accountAdministrator: {
        name: primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : `${form.firstName} ${form.surname}`,
        email: primaryContact?.email || form.email,
        phone: primaryContact?.phone || '',
        role: primaryContact?.jobTitle || ''
      },
      businessAddress: {
        line1: form.address.line1,
        line2: form.address.line2,
        city: form.address.city,
        county: form.address.county,
        postcode: form.address.postcode,
        country: form.address.country
      },
      hasOtherAssociations: form.hasOtherAssociations || false,
      otherAssociations: form.otherAssociations,
      ...(form.organizationType === 'MGA' && {
        portfolio: {
          grossWrittenPremiums: gwpBand,
          grossWrittenPremiumsValue: totalGWP,
          grossWrittenPremiumsCurrency: form.portfolio.gwpCurrency,
          grossWrittenPremiumsEUR: gwpEUR,
          linesOfBusiness: form.portfolio.linesOfBusiness,
          otherLinesOfBusiness: form.portfolio.otherLinesOfBusiness,
          markets: form.portfolio.markets
        },
        markets: form.portfolio.markets,
        marketLinesOfBusiness: form.portfolio.markets.reduce((acc, market) => {
          acc[market] = form.portfolio.linesOfBusiness;
          return acc;
        }, {} as Record<string, string[]>)
      }),
      ...(form.organizationType === 'carrier' && {
        carrierInfo: {
          organizationType: form.carrierInfo.organizationType,
          isDelegatingInEurope: form.carrierInfo.isDelegatingInEurope,
          numberOfMGAs: form.carrierInfo.numberOfMGAs,
          delegatingCountries: form.carrierInfo.delegatingCountries,
          frontingOptions: form.carrierInfo.frontingOptions,
          considerStartupMGAs: form.carrierInfo.considerStartupMGAs,
          amBestRating: form.carrierInfo.amBestRating,
          otherRating: form.carrierInfo.otherRating
        }
      }),
      ...(form.organizationType === 'provider' && {
        servicesProvided: form.servicesProvided
      }),
      status: 'pending',
      createdAt: 'SERVER_TIMESTAMP',
      jobTitle: primaryContact?.jobTitle || '',
      website: ''
    };

    const memberDocs = form.members.map(member => ({
      _path: `/accounts/{userId}/members/${member.id === 'registrant' ? '{userId}' : member.id}`,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      name: member.name,
      phone: member.phone,
      jobTitle: member.jobTitle,
      isPrimaryContact: member.isPrimaryContact,
      accountId: '{userId}',
      createdAt: 'SERVER_TIMESTAMP'
    }));

    const rendezvousDoc = form.reserveRendezvousPasses ? {
      _path: '/rendezvousReservations/{reservationId}',
      accountId: '{userId}',
      organizationName: form.organizationName,
      passCount: form.rendezvousPassCount,
      isAsaseMember: asase,
      passPrice: passPrice,
      subtotal: passSubtotal,
      attendees: form.rendezvousAttendees,
      status: 'pending',
      createdAt: 'SERVER_TIMESTAMP'
    } : null;

    const discountedFee = getDiscountedFee(orgType, totalGWP.toString(), form.portfolio.gwpCurrency, form.hasOtherAssociations || false);
    const baseFee = getDiscountedFee(orgType, totalGWP.toString(), form.portfolio.gwpCurrency, false);

    return {
      'accounts/{userId}': accountDoc,
      'members': memberDocs,
      ...(rendezvousDoc && { 'rendezvousReservation': rendezvousDoc }),
      '_metadata': {
        membershipFee: discountedFee,
        baseFee: baseFee,
        hasDiscount: form.hasOtherAssociations,
        discountAmount: form.hasOtherAssociations ? baseFee - discountedFee : 0
      }
    };
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!form.codeOfConductConsent) {
      setError(t('errors.code_of_conduct_required'));
      return;
    }

    // In test mode, show preview instead of submitting
    if (isTestMode) {
      const firestoreDoc = buildFirestoreDocument();
      setTestFirestoreDoc(firestoreDoc);
      setShowTestPreview(true);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const asase = isAsaseMember();
      const passSubtotal = getRendezvousPassSubtotal(orgType, form.rendezvousPassCount, form.reserveRendezvousPasses, asase);

      const apiData = {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        surname: form.surname,
        organizationName: form.organizationName,
        organizationType: form.organizationType as 'MGA' | 'carrier' | 'provider',
        members: form.members,
        addressLine1: form.address.line1,
        addressLine2: form.address.line2,
        city: form.address.city,
        state: form.address.county,
        postalCode: form.address.postcode,
        country: form.address.country,
        grossWrittenPremiums: totalGWP.toString(),
        gwpCurrency: form.portfolio.gwpCurrency,
        selectedLinesOfBusiness: form.portfolio.linesOfBusiness,
        otherLineOfBusiness1: form.portfolio.otherLinesOfBusiness.other1,
        otherLineOfBusiness2: form.portfolio.otherLinesOfBusiness.other2,
        otherLineOfBusiness3: form.portfolio.otherLinesOfBusiness.other3,
        selectedMarkets: form.portfolio.markets,
        hasOtherAssociations: form.hasOtherAssociations,
        otherAssociations: form.otherAssociations,
        servicesProvided: form.servicesProvided,
        carrierOrganizationType: form.carrierInfo.organizationType,
        isDelegatingInEurope: form.carrierInfo.isDelegatingInEurope,
        numberOfMGAs: form.carrierInfo.numberOfMGAs,
        delegatingCountries: form.carrierInfo.delegatingCountries,
        frontingOptions: form.carrierInfo.frontingOptions,
        considerStartupMGAs: form.carrierInfo.considerStartupMGAs,
        amBestRating: form.carrierInfo.amBestRating,
        otherRating: form.carrierInfo.otherRating,
        reserveRendezvousPasses: form.reserveRendezvousPasses,
        rendezvousPassCount: form.rendezvousPassCount,
        rendezvousPassSubtotal: passSubtotal,
        rendezvousPassTotal: passSubtotal,
        rendezvousIsAsaseMember: asase,
        rendezvousAttendees: form.rendezvousAttendees
      };

      await createAccountAndMembership('pending', apiData);

      const applicationNumber = `FASE-APP-${Date.now()}-${Date.now().toString().slice(-6)}`;
      const membershipFee = getDiscountedFee(orgType, totalGWP.toString(), form.portfolio.gwpCurrency, form.hasOtherAssociations || false);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/submit-application', {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationNumber,
          membershipFee,
          email: form.email,
          firstName: form.firstName,
          surname: form.surname,
          organizationName: form.organizationName,
          organizationType: form.organizationType,
          hasOtherAssociations: form.hasOtherAssociations,
          addressLine1: form.address.line1,
          addressLine2: form.address.line2,
          city: form.address.city,
          state: form.address.county,
          postalCode: form.address.postcode,
          country: form.address.country,
          grossWrittenPremiums: totalGWP.toString(),
          gwpCurrency: form.portfolio.gwpCurrency,
          selectedLinesOfBusiness: form.portfolio.linesOfBusiness,
          selectedMarkets: form.portfolio.markets,
          members: form.members,
          reserveRendezvousPasses: form.reserveRendezvousPasses,
          rendezvousPassCount: form.rendezvousPassCount,
          rendezvousPassSubtotal: passSubtotal,
          rendezvousPassTotal: passSubtotal,
          rendezvousAttendees: form.rendezvousAttendees
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      sessionStorage.setItem('applicationSubmission', JSON.stringify({
        applicationNumber,
        applicantName: form.organizationName,
        paymentMethod: 'application'
      }));

      window.location.href = '/register/thank-you';
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError(t('errors.submission_timeout'));
      } else {
        setError(error.message || t('errors.failed_to_submit'));
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold text-yellow-800">TEST MODE</p>
              <p className="text-sm text-yellow-700">Domain check skipped. Submit will show Firestore preview instead of creating account.</p>
            </div>
          </div>
        </div>
      )}

      {/* Test Mode Preview Modal */}
      {showTestPreview && testFirestoreDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-fase-navy text-white p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Firestore Document Preview</h2>
              <button onClick={() => setShowTestPreview(false)} className="text-white hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-4">This is what would be written to Firestore. No data was actually created.</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs leading-relaxed">
                {JSON.stringify(testFirestoreDoc, null, 2)}
              </pre>
            </div>
            <div className="border-t p-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(testFirestoreDoc, null, 2));
              }}>
                Copy JSON
              </Button>
              <Button variant="primary" onClick={() => setShowTestPreview(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator - 5 steps (0-4) */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-2">
          {[0, 1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${ui.step >= n ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'}`}>
                {n + 1}
              </div>
              {n < 4 && <div className={`w-6 h-1 ${ui.step > n ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Step 0: Organization Type + Data Consent */}
      {ui.step === 0 && <OrganizationAndConsentStep reg={reg} />}

      {/* Step 1: Account Information */}
      {ui.step === 1 && <AccountInformationStep reg={reg} />}

      {/* Step 2: Organization Details (name, team, address) */}
      {ui.step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.membership_info.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.membership_info.subtitle')}</p>
          </div>
          <ValidatedInput label={t('fields.organization_name')} fieldKey="organizationName" value={form.organizationName} onChange={(v) => setField('organizationName', v)} placeholder={t('placeholders.organization_name')} required touchedFields={ui.touchedFields} attemptedNext={ui.attemptedNext} markFieldTouched={reg.touchField} />
          <TeamMembersSection reg={reg} />
          <AddressSection reg={reg} />
        </div>
      )}

      {/* Step 3: Type-specific info + associations + rendezvous */}
      {ui.step === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.additional_details.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.additional_details.subtitle')}</p>
          </div>
          {form.organizationType === 'MGA' && <MGAPortfolioSection reg={reg} />}
          {form.organizationType === 'carrier' && <CarrierInformationSection reg={reg} />}
          {form.organizationType === 'provider' && <ServiceProviderSection reg={reg} />}
          <EuropeanAssociationsSection reg={reg} />
          <RendezvousSection reg={reg} totalGWP={totalGWP} />
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {ui.step === 4 && <ReviewStep reg={reg} totalGWP={totalGWP} onSubmit={handleSubmit} />}

      {/* Error Display */}
      {ui.error && <div className="text-red-600 text-sm">{ui.error}</div>}

      {/* Help Contact */}
      <div className="text-center py-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          {t('help.contact_prefix')}{' '}
          <a href="mailto:help@fasemga.com" className="text-fase-navy hover:text-fase-gold transition-colors">help@fasemga.com</a>
        </p>
      </div>

      {/* Navigation Buttons */}
      {ui.step < 4 && (
        <div className="pt-6">
          <div className="flex justify-between">
            {ui.step > 0 ? <Button type="button" variant="secondary" onClick={handleBack}>{t('buttons.back')}</Button> : <div></div>}
            <Button type="button" variant="primary" onClick={handleNext}>
              {ui.step === 3 ? t('buttons.review_submit') : t('buttons.next')}
            </Button>
          </div>
        </div>
      )}

      {ui.step === 4 && (
        <div className="pt-6">
          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={handleBack}>{t('buttons.back')}</Button>
            <div></div>
          </div>
        </div>
      )}
    </div>
  );
}
