'use client';

import { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Button from "../../components/Button";
import { ValidatedInput, validatePassword, validateEmail } from './form-components';
import { useRegistrationForm } from './registration-hooks';
import { AccountInformationStep, OrganizationTypeSelector } from './step-components';
import { TeamMembersSection } from './member-management';
import { AddressSection } from './address-components';
import { MGAPortfolioSection } from './mga-components';
import { CarrierInformationSection, ServiceProviderSection } from './carrier-provider-components';
import { EuropeanAssociationsSection } from './associations-components';
import { checkDomainExists, createAccountAndMembership } from './registration-handlers';
import { calculateMembershipFee, getDiscountedFee, convertToEUR, getGWPBand } from './registration-utils';

export default function IntegratedRegisterForm() {
  const t = useTranslations('register_form');
  const locale = useLocale();
  const reg = useRegistrationForm();
  const { form, ui, setField, setStep, setError, setAttemptedNext, setSubmitting, setMembers, addMember, updateMember, syncRendezvousAttendeesWithCount, getTotalGWP, isAsaseMember, typeFromUrl, isTestMode } = reg;

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

  // Pricing calculations
  const totalGWP = getTotalGWP();
  const orgType = form.organizationType as 'MGA' | 'carrier' | 'provider';
  const getMembershipFee = () => calculateMembershipFee(orgType, totalGWP.toString(), form.portfolio.gwpCurrency);
  const getDiscounted = () => getDiscountedFee(orgType, totalGWP.toString(), form.portfolio.gwpCurrency, form.hasOtherAssociations || false);

  const getRendezvousPassPrice = () => {
    if (isAsaseMember()) return 0;
    const pricing = { MGA: 400, carrier: 550, provider: 700 };
    return pricing[orgType] || 400;
  };

  const getRendezvousPassSubtotal = () => {
    if (!form.reserveRendezvousPasses) return 0;
    return getRendezvousPassPrice() * form.rendezvousPassCount;
  };

  // Step validation and navigation
  const handleNext = async () => {
    setAttemptedNext(true);

    if (ui.step === -1) {
      if (!form.organizationType) {
        setError(t('errors.select_organization_type'));
        return;
      }
      setStep(0);
      scrollToTop();
    } else if (ui.step === 0) {
      if (!form.dataNoticeConsent) {
        setError(t('errors.consent_required'));
        return;
      }
      setStep(1);
      scrollToTop();
    } else if (ui.step === 1) {
      if (!form.firstName || !form.surname || !form.email || !form.password || !form.confirmPassword) {
        setError(t('errors.fill_required_fields'));
        return;
      }
      if (!validateEmail(form.email)) {
        setError(t('errors.invalid_email_format'));
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError(t('errors.passwords_dont_match'));
        return;
      }
      const { isValid, requirements } = validatePassword(form.password);
      if (!isValid) {
        const missing = [];
        if (!requirements.length) missing.push(t('errors.eight_characters'));
        if (!requirements.capital) missing.push(t('errors.capital_letter'));
        if (!requirements.special) missing.push(t('errors.special_character'));
        setError(t('errors.password_requirements_prefix') + missing.join(", "));
        return;
      }
      try {
        // Skip domain check in test mode
        if (!isTestMode) {
          const domainExists = await checkDomainExists(form.email);
          if (domainExists) {
            throw new Error(t('errors.domain_already_registered'));
          }
        }
        setStep(2);
        scrollToTop();
      } catch (error: any) {
        setError(error.message || t('errors.verification_failed'));
      }
    } else if (ui.step === 2) {
      if (!form.organizationName.trim()) {
        setError(t('errors.organization_name_required'));
        return;
      }
      if (form.members.length === 0) {
        setError(t('errors.team_member_required'));
        return;
      }
      if (!form.members.some(m => m.isPrimaryContact)) {
        setError(t('errors.primary_contact_required'));
        return;
      }
      for (const member of form.members) {
        if (!member.firstName?.trim() || !member.lastName?.trim()) {
          setError(t('errors.members_need_name'));
          return;
        }
        if (!member.email.trim()) {
          setError(t('errors.members_need_email'));
          return;
        }
        if (!member.jobTitle.trim()) {
          setError(t('errors.members_need_job_title'));
          return;
        }
      }
      setStep(3);
      scrollToTop();
    } else if (ui.step === 3) {
      if (!form.address.line1.trim() || !form.address.city.trim() || !form.address.country) {
        setError(t('errors.address_required'));
        return;
      }
      if (form.organizationType === 'MGA' && totalGWP <= 0) {
        setError(t('errors.gwp_must_be_greater_than_zero'));
        return;
      }
      if (form.hasOtherAssociations === null) {
        setError(t('errors.associations_specify_required'));
        return;
      }
      if (form.hasOtherAssociations && form.otherAssociations.length === 0) {
        setError(t('errors.associations_select_required'));
        return;
      }
      // Carrier validation
      if (form.organizationType === 'carrier') {
        const ci = form.carrierInfo;
        if (ci.organizationType === 'insurance_company' || ci.organizationType === 'reinsurance_company' || ci.organizationType === 'lloyds_managing_agency') {
          if (!ci.isDelegatingInEurope) {
            setError(t('errors.carrier_delegation_required'));
            return;
          }
          if (ci.isDelegatingInEurope === 'Yes') {
            if (!ci.numberOfMGAs) {
              setError(t('errors.carrier_mga_count_required'));
              return;
            }
            if (!ci.delegatingCountries.length) {
              setError(t('errors.carrier_countries_required'));
              return;
            }
          }
          if (!ci.frontingOptions) {
            setError(t('errors.carrier_fronting_required'));
            return;
          }
          if (!ci.considerStartupMGAs) {
            setError(t('errors.carrier_startup_required'));
            return;
          }
        }
      }
      if (form.organizationType === 'provider' && !form.servicesProvided.length) {
        setError(t('errors.service_provider_services_required'));
        return;
      }
      setStep(4);
      scrollToTop();
    } else if (ui.step === 4) {
      if (form.reserveRendezvousPasses) {
        const incomplete = form.rendezvousAttendees.find(a => !a.firstName.trim() || !a.lastName.trim() || !a.email.trim() || !a.jobTitle.trim());
        if (incomplete) {
          setError(t('errors.rendezvous_attendee_required'));
          return;
        }
        const invalidEmail = form.rendezvousAttendees.find(a => !validateEmail(a.email));
        if (invalidEmail) {
          setError(t('errors.rendezvous_invalid_email'));
          return;
        }
      }
      setStep(5);
      scrollToTop();
    }
  };

  const handleBack = () => {
    if (ui.step > (typeFromUrl ? 0 : -1)) {
      setStep(ui.step - 1);
      scrollToTop();
    }
  };

  // Build the Firestore document that would be created
  const buildFirestoreDocument = () => {
    const primaryContact = form.members.find(m => m.isPrimaryContact);
    const gwpEUR = form.organizationType === 'MGA' ? convertToEUR(totalGWP, form.portfolio.gwpCurrency) : 0;
    const gwpBand = form.organizationType === 'MGA' ? getGWPBand(gwpEUR) : undefined;

    // Account document (what goes in /accounts/{userId})
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

    // Members subcollection documents
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

    // Rendezvous reservation (if applicable)
    const rendezvousDoc = form.reserveRendezvousPasses ? {
      _path: '/rendezvousReservations/{reservationId}',
      accountId: '{userId}',
      organizationName: form.organizationName,
      passCount: form.rendezvousPassCount,
      isAsaseMember: isAsaseMember(),
      passPrice: getRendezvousPassPrice(),
      subtotal: getRendezvousPassSubtotal(),
      attendees: form.rendezvousAttendees,
      status: 'pending',
      createdAt: 'SERVER_TIMESTAMP'
    } : null;

    return {
      'accounts/{userId}': accountDoc,
      'members': memberDocs,
      ...(rendezvousDoc && { 'rendezvousReservation': rendezvousDoc }),
      '_metadata': {
        membershipFee: getDiscounted(),
        baseFee: getMembershipFee(),
        hasDiscount: form.hasOtherAssociations,
        discountAmount: form.hasOtherAssociations ? getMembershipFee() - getDiscounted() : 0
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
      // Build form data for API (mapping from new structure to existing API)
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
        rendezvousPassSubtotal: getRendezvousPassSubtotal(),
        rendezvousPassTotal: getRendezvousPassSubtotal(),
        rendezvousIsAsaseMember: isAsaseMember(),
        rendezvousAttendees: form.rendezvousAttendees
      };

      await createAccountAndMembership('pending', apiData);

      const applicationNumber = `FASE-APP-${Date.now()}-${Date.now().toString().slice(-6)}`;
      const membershipFee = getDiscounted();

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
          rendezvousPassSubtotal: getRendezvousPassSubtotal(),
          rendezvousPassTotal: getRendezvousPassSubtotal(),
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

  // Registration complete screen
  const [registrationComplete, setRegistrationComplete] = [false, () => {}]; // Placeholder - redirect handles this

  if (registrationComplete) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">{t('registration_complete.title')}</h2>
        <p className="text-fase-black mb-6">{t('registration_complete.message')}</p>
        <Button variant="primary" size="large" className="w-full" onClick={async () => {
          try { await signOut(auth); } catch (e) {}
          window.location.href = '/login';
        }}>
          {t('registration_complete.continue_button')}
        </Button>
      </div>
    );
  }

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

      {/* Progress indicator */}
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

      {/* Step -1: Organization Type Selection */}
      {ui.step === -1 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.organization_type.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.organization_type.subtitle')}</p>
          </div>
          <OrganizationTypeSelector reg={reg} />
        </div>
      )}

      {/* Step 0: Data Notice Consent */}
      {ui.step === 0 && (
        <div className="space-y-6">
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
          <div className="bg-white border border-fase-light-gold rounded-lg p-4">
            <label className="flex items-start space-x-3">
              <input type="checkbox" checked={form.dataNoticeConsent} onChange={(e) => setField('dataNoticeConsent', e.target.checked)} className="mt-1 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded" />
              <span className="text-base text-fase-black">{t('data_notice.consent_text')}</span>
            </label>
          </div>
        </div>
      )}

      {/* Step 1: Account Information */}
      {ui.step === 1 && <AccountInformationStep reg={reg} />}

      {/* Step 2: Membership Information */}
      {ui.step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.membership_info.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.membership_info.subtitle')}</p>
          </div>
          <ValidatedInput label={t('fields.organization_name')} fieldKey="organizationName" value={form.organizationName} onChange={(v) => setField('organizationName', v)} placeholder={t('placeholders.organization_name')} required touchedFields={ui.touchedFields} attemptedNext={ui.attemptedNext} markFieldTouched={reg.touchField} />
          <TeamMembersSection reg={reg} />
        </div>
      )}

      {/* Step 3: Additional Details */}
      {ui.step === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.additional_details.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.additional_details.subtitle')}</p>
          </div>
          <AddressSection reg={reg} />
          {form.organizationType === 'MGA' && <MGAPortfolioSection reg={reg} />}
          {form.organizationType === 'carrier' && <CarrierInformationSection reg={reg} />}
          {form.organizationType === 'provider' && <ServiceProviderSection reg={reg} />}
          <EuropeanAssociationsSection reg={reg} />
        </div>
      )}

      {/* Step 4: MGA Rendezvous Pass Reservation */}
      {ui.step === 4 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.rendezvous.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.rendezvous.subtitle')}</p>
          </div>
          <div className="bg-white rounded-lg border border-fase-light-gold p-6">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">{t('rendezvous.title')}</h4>
            <p className="text-fase-black mb-4">{isAsaseMember() ? t('rendezvous.description_asase') : t('rendezvous.description')}</p>
            <p className="text-fase-black mb-6">
              <a href="https://mgarendezvous.com" target="_blank" rel="noopener noreferrer" className="text-fase-navy hover:text-fase-gold underline transition-colors">{t('rendezvous.visit_website')}</a>
            </p>
            <div className="flex items-center space-x-3 mb-4">
              <input type="checkbox" checked={form.reserveRendezvousPasses} onChange={(e) => setField('reserveRendezvousPasses', e.target.checked)} className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded" id="reserve-passes" />
              <label htmlFor="reserve-passes" className="text-sm font-medium text-fase-black cursor-pointer">{isAsaseMember() ? t('rendezvous.checkbox_label_asase') : t('rendezvous.checkbox_label')}</label>
            </div>
            {form.reserveRendezvousPasses && (
              <div className="mt-4 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">{t('rendezvous.number_of_passes')}</label>
                  <select value={form.rendezvousPassCount} onChange={(e) => setField('rendezvousPassCount', parseInt(e.target.value))} className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent bg-white">
                    {(isAsaseMember() ? [1, 2, 3] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((num) => (
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
                  {isAsaseMember() ? (
                    <>
                      <p className="text-sm font-medium text-green-700 mb-1">{t('rendezvous.pass_total')}: {t('rendezvous.complimentary')}</p>
                      <p className="text-xs text-green-600">{t('rendezvous.asase_benefit', { count: form.rendezvousPassCount })}</p>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">{form.rendezvousPassCount} × €{getRendezvousPassPrice().toLocaleString()} {t('rendezvous.member_rate')}</p>
                      <p className="text-sm font-medium text-fase-navy pt-1 border-t border-fase-light-gold">{t('rendezvous.pass_total')}: €{getRendezvousPassSubtotal().toLocaleString()}</p>
                      <p className="text-xs text-gray-500 italic">VAT will be billed separately</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Final Review & Submit */}
      {ui.step === 5 && (
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
                <span className="text-fase-navy font-semibold">€{getMembershipFee().toLocaleString()}</span>
              </div>
              {form.hasOtherAssociations && (
                <div className="flex justify-between items-center py-2 border-b border-fase-light-gold">
                  <span className="text-green-600 font-medium">{t('pricing.discount')}</span>
                  <span className="text-green-600 font-semibold">-€{(getMembershipFee() - getDiscounted()).toLocaleString()}</span>
                </div>
              )}
              {form.reserveRendezvousPasses && (
                <div className="py-2 border-b border-fase-light-gold">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-fase-black font-medium">{t('rendezvous.passes_label')}</span>
                      {isAsaseMember() ? (
                        <p className="text-xs text-green-600">{t('rendezvous.asase_benefit', { count: form.rendezvousPassCount })}</p>
                      ) : (
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p>{form.rendezvousPassCount} × €{getRendezvousPassPrice().toLocaleString()} {t('rendezvous.member_rate')}</p>
                          <p className="text-gray-500 italic">VAT will be billed separately</p>
                        </div>
                      )}
                    </div>
                    {isAsaseMember() ? <span className="text-green-600 font-semibold">{t('rendezvous.complimentary')}</span> : <span className="text-fase-navy font-semibold">€{getRendezvousPassSubtotal().toLocaleString()}</span>}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center py-3 border-t-2 border-fase-navy">
                <span className="text-fase-navy text-lg font-bold">{t('pricing.total_annual')}</span>
                <span className="text-fase-navy text-xl font-bold">€{(getDiscounted() + getRendezvousPassSubtotal()).toLocaleString()}</span>
              </div>
              {form.hasOtherAssociations && <p className="text-sm text-green-600 italic">{t('pricing.discount_note')}</p>}
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <Button type="button" variant="primary" size="large" onClick={handleSubmit} disabled={!form.codeOfConductConsent || ui.submitting} className="w-full">
              {ui.submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('buttons.submitting_application')}
                </>
              ) : t('buttons.submit_application')}
            </Button>
          </div>
        </div>
      )}

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
            {ui.step > (typeFromUrl ? 0 : -1) ? <Button type="button" variant="secondary" onClick={handleBack}>{t('buttons.back')}</Button> : <div></div>}
            <Button type="button" variant="primary" onClick={handleNext}>{t('buttons.next')}</Button>
          </div>
        </div>
      )}

      {ui.step === 4 && (
        <div className="pt-6">
          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={handleBack}>{t('buttons.back')}</Button>
            <Button type="button" variant="primary" onClick={handleNext}>{t('buttons.review_submit')}</Button>
          </div>
        </div>
      )}

      {ui.step === 5 && (
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
