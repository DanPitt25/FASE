'use client';

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
// Removed sendVerificationCode and verifyCode imports - no longer needed
import Button from "../../components/Button";
import { ValidatedInput, validatePassword, validateEmail } from './form-components';
import { Member } from './registration-hooks';
import { AccountInformationStep, OrganizationTypeSelector } from './step-components';
import { TeamMembersSection } from './member-management';
import { AddressSection } from './address-components';
import { MGAPortfolioSection } from './mga-components';
import { CarrierInformationSection, ServiceProviderSection } from './carrier-provider-components';
import { EuropeanAssociationsSection } from './associations-components';
import { checkDomainExists, createAccountAndMembership } from './registration-handlers';
import { calculateMembershipFee, getDiscountedFee, convertToEUR, getGWPBand, calculateTotalGWP } from './registration-utils';




export default function IntegratedRegisterForm() {
  // Translations
  const t = useTranslations('register_form');
  const locale = useLocale();

  // Helper function to scroll to top of form
  const scrollToTop = () => {
    const formContainer = document.querySelector('.overflow-y-auto');
    if (formContainer) {
      formContainer.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  };
  
  // URL parameter handling
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get('type');
  
  // Auth fields
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // All memberships are corporate
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState(typeFromUrl || "");
  
  const [members, setMembers] = useState<Member[]>([]);
  const updatingMembersRef = useRef(false);
  
  // Initialize with registrant as first member 
  useEffect(() => {
    // All memberships are corporate
    if (members.length === 0) {
      const fullName = `${firstName} ${surname}`.trim();
      if (fullName && email) {
        setMembers([{
          id: 'registrant',
          firstName: firstName,
          lastName: surname,
          name: fullName,
          email: email,
          phone: '',
          jobTitle: '',
          isPrimaryContact: true // Default registrant as admin
        }]);
      }
    }
  }, [firstName, surname, email]);

  // Update registrant member when personal info changes
  useEffect(() => {
    if (updatingMembersRef.current) return; // Prevent infinite loop
    
    // All memberships are corporate
    if (members.length > 0) {
      const registrantIndex = members.findIndex(m => m.id === 'registrant');
      if (registrantIndex !== -1) {
        const registrant = members[registrantIndex];
        const fullName = `${firstName} ${surname}`.trim();
        // Only update if the data has actually changed
        if (fullName && email && 
            (registrant.firstName !== firstName || 
             registrant.lastName !== surname || 
             registrant.email !== email ||
             registrant.name !== fullName)) {
          updatingMembersRef.current = true;
          const updatedMembers = [...members];
          updatedMembers[registrantIndex] = {
            ...updatedMembers[registrantIndex],
            firstName: firstName,
            lastName: surname,
            name: fullName,
            email: email
          };
          setMembers(updatedMembers);
          // Reset the flag after state update
          setTimeout(() => {
            updatingMembersRef.current = false;
          }, 0);
        }
      }
    }
  }, [firstName, surname, email, members]);

  
  // Address fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  
  // Portfolio fields (for MGAs) - separate inputs for each magnitude
  const [gwpBillions, setGwpBillions] = useState("");
  const [gwpMillions, setGwpMillions] = useState("");
  const [gwpThousands, setGwpThousands] = useState("");
  const [grossWrittenPremiums, setGrossWrittenPremiums] = useState("");
  const [gwpCurrency, setGwpCurrency] = useState("EUR");
  // New structured business fields
  const [selectedLinesOfBusiness, setSelectedLinesOfBusiness] = useState<string[]>([]);
  const [otherLineOfBusiness1, setOtherLineOfBusiness1] = useState('');
  const [otherLineOfBusiness2, setOtherLineOfBusiness2] = useState('');
  const [otherLineOfBusiness3, setOtherLineOfBusiness3] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  
  // Other fields
  const [hasOtherAssociations, setHasOtherAssociations] = useState<boolean | null>(null);
  const [otherAssociations, setOtherAssociations] = useState<string[]>([]);
  
  const [error, setError] = useState("");
  
  
  // Update grossWrittenPremiums whenever magnitude inputs change
  useEffect(() => {
    const total = calculateTotalGWP(gwpBillions, gwpMillions, gwpThousands);
    const totalString = total.toString();
    // Only update if the value has actually changed
    if (totalString !== grossWrittenPremiums) {
      setGrossWrittenPremiums(totalString);
    }
  }, [gwpBillions, gwpMillions, gwpThousands, grossWrittenPremiums]);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [step, setStep] = useState(typeFromUrl ? 0 : -1);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  
  // Consent states
  const [dataNoticeConsent, setDataNoticeConsent] = useState(false);
  const [codeOfConductConsent, setCodeOfConductConsent] = useState(false);

  // MGA Rendezvous pass reservation
  const [reserveRendezvousPasses, setReserveRendezvousPasses] = useState(false);
  const [rendezvousPassCount, setRendezvousPassCount] = useState(1);
  const [rendezvousAttendees, setRendezvousAttendees] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
  }[]>([{ id: '1', firstName: '', lastName: '', email: '', jobTitle: '' }]);

  // Sync rendezvous attendees array with pass count
  useEffect(() => {
    if (rendezvousPassCount > rendezvousAttendees.length) {
      // Add more attendees
      const newAttendees = [...rendezvousAttendees];
      for (let i = rendezvousAttendees.length; i < rendezvousPassCount; i++) {
        newAttendees.push({ id: Date.now().toString() + i, firstName: '', lastName: '', email: '', jobTitle: '' });
      }
      setRendezvousAttendees(newAttendees);
    } else if (rendezvousPassCount < rendezvousAttendees.length) {
      // Remove excess attendees
      setRendezvousAttendees(rendezvousAttendees.slice(0, rendezvousPassCount));
    }
  }, [rendezvousPassCount]);

  // Clamp pass count to 3 when ASASE membership is selected
  useEffect(() => {
    if (otherAssociations.includes('ASASE') && rendezvousPassCount > 3) {
      setRendezvousPassCount(3);
    }
  }, [otherAssociations, rendezvousPassCount]);

  // Update a rendezvous attendee field
  const updateRendezvousAttendee = (id: string, field: 'firstName' | 'lastName' | 'email' | 'jobTitle', value: string) => {
    setRendezvousAttendees(attendees =>
      attendees.map(a => a.id === id ? { ...a, [field]: value } : a)
    );
  };

  // Application submission state
  const [submittingApplication, setSubmittingApplication] = useState(false);

  // New carrier-specific fields
  const [carrierOrganizationType, setCarrierOrganizationType] = useState('');
  const [isDelegatingInEurope, setIsDelegatingInEurope] = useState('');
  const [numberOfMGAs, setNumberOfMGAs] = useState('');
  const [delegatingCountries, setDelegatingCountries] = useState<string[]>([]);
  const [frontingOptions, setFrontingOptions] = useState('');
  const [considerStartupMGAs, setConsiderStartupMGAs] = useState('');
  const [amBestRating, setAmBestRating] = useState('');
  const [otherRating, setOtherRating] = useState('');

  // New service provider fields
  const [servicesProvided, setServicesProvided] = useState<string[]>([]);


  const markFieldTouched = (fieldKey: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldKey]: true }));
  };








  const handleNext = async () => {
    setAttemptedNext(true);
    
    if (step === -1) {
      // Validate organization type selection
      if (!organizationType) {
        setError(t('errors.select_organization_type'));
        return;
      }
      
      setError("");
      setStep(0);
      scrollToTop();
      setAttemptedNext(false);
    } else if (step === 0) {
      // Validate data notice consent
      if (!dataNoticeConsent) {
        setError(t('errors.consent_required'));
        return;
      }
      
      setError("");
      setStep(1);
      scrollToTop();
      setAttemptedNext(false);
    } else if (step === 1) {
      // Validate auth fields
      const authRequiredFields = ['firstName', 'surname', 'email', 'password', 'confirmPassword'];
      const authFieldValues = {
        firstName,
        surname,
        email,
        password,
        confirmPassword
      };
      
      const hasAllAuthFields = authRequiredFields.every(field => 
        authFieldValues[field as keyof typeof authFieldValues].trim() !== ''
      );
      
      if (!hasAllAuthFields) {
        setError(t('errors.fill_required_fields'));
        return;
      }
      
      // Validate email format
      if (!validateEmail(email)) {
        setError(t('errors.invalid_email_format'));
        return;
      }

      if (password !== confirmPassword) {
        setError(t('errors.passwords_dont_match'));
        return;
      }

      const { isValid, requirements } = validatePassword(password);
      if (!isValid) {
        let errorMsg = t('errors.password_requirements_prefix');
        const missing = [];
        if (!requirements.length) missing.push(t('errors.eight_characters'));
        if (!requirements.capital) missing.push(t('errors.capital_letter'));
        if (!requirements.special) missing.push(t('errors.special_character'));
        setError(errorMsg + missing.join(", "));
        return;
      }
      
      // Skip verification - go straight to next step
      try {
        // Check if domain already exists
        const domainExists = await checkDomainExists(email);
        if (domainExists) {
          throw new Error(t('errors.domain_already_registered'));
        }
        
        setError("");
        setStep(2);
        scrollToTop();
        setAttemptedNext(false);
      } catch (error: any) {
        setError(error.message || t('errors.verification_failed'));
      }
    } else if (step === 2) {
      // Validate membership basic fields
      const fullName = `${firstName} ${surname}`.trim();
      const orgName = organizationName; // All memberships are corporate
      if (!orgName.trim()) {
        setError(t('errors.organization_name_required'));
        return;
      }
      
      if (!organizationType) { // All memberships are corporate
        setError(t('errors.organization_type_required'));
        return;
      }
      
      // Validate members for corporate membership
      // All memberships are corporate
      if (members.length === 0) {
          setError(t('errors.team_member_required'));
          return;
        }
        
        const hasPrimaryContact = members.some(m => m.isPrimaryContact);
        if (!hasPrimaryContact) {
          setError(t('errors.primary_contact_required'));
          return;
        }
        
        // Validate all members have required fields
        for (const member of members) {
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
      
      setError("");
      setStep(3);
      scrollToTop();
      setAttemptedNext(false);
    } else if (step === 3) {
      // Validate address and portfolio fields before proceeding to payment
      if (!addressLine1.trim() || !city.trim() || !country) {
        setError(t('errors.address_required'));
        return;
      }
      
      
      if (organizationType === 'MGA') {
        const actualTotal = calculateTotalGWP(gwpBillions, gwpMillions, gwpThousands);
        if (actualTotal <= 0) {
          setError(t('errors.gwp_must_be_greater_than_zero'));
          return;
        }
      }
      
      if (hasOtherAssociations === null) {
        setError(t('errors.associations_specify_required'));
        return;
      }
      
      if (hasOtherAssociations && otherAssociations.length === 0) {
        setError(t('errors.associations_select_required'));
        return;
      }
      
      // Carrier validation - only for specific organization types
      if (organizationType === 'carrier') {
        // Only validate delegating/fronting/startup fields for specific carrier types
        if (carrierOrganizationType === 'insurance_company' || 
            carrierOrganizationType === 'reinsurance_company' || 
            carrierOrganizationType === 'lloyds_managing_agency') {
          
          if (!isDelegatingInEurope) {
            setError(t('errors.carrier_delegation_required'));
            return;
          }
          
          if (isDelegatingInEurope === 'Yes') {
            if (!numberOfMGAs) {
              setError(t('errors.carrier_mga_count_required'));
              return;
            }
            if (!delegatingCountries || delegatingCountries.length === 0) {
              setError(t('errors.carrier_countries_required'));
              return;
            }
          }
          
          if (!frontingOptions) {
            setError(t('errors.carrier_fronting_required'));
            return;
          }
          
          if (!considerStartupMGAs) {
            setError(t('errors.carrier_startup_required'));
            return;
          }
        }
      }
      
      // Service provider validation
      if (organizationType === 'provider') {
        if (!servicesProvided || servicesProvided.length === 0) {
          setError(t('errors.service_provider_services_required'));
          return;
        }
      }

      setError("");
      setStep(4);
      window.scrollTo(0, 0);
      setAttemptedNext(false);
    } else if (step === 4) {
      // Validate rendezvous attendees if passes are reserved
      if (reserveRendezvousPasses) {
        const incompleteAttendee = rendezvousAttendees.find(
          a => !a.firstName.trim() || !a.lastName.trim() || !a.email.trim() || !a.jobTitle.trim()
        );
        if (incompleteAttendee) {
          setError(t('errors.rendezvous_attendee_required'));
          return;
        }
        // Validate email format for all attendees
        const invalidEmail = rendezvousAttendees.find(a => !validateEmail(a.email));
        if (invalidEmail) {
          setError(t('errors.rendezvous_invalid_email'));
          return;
        }
      }
      setError("");
      setStep(5);
      window.scrollTo(0, 0);
      setAttemptedNext(false);
    }
  };

  const handleBack = () => {
    if (step > (typeFromUrl ? 0 : -1)) {
      setStep(step - 1);
      setError("");
      window.scrollTo(0, 0);
    }
  };

  const getActualGWPTotal = () => {
    const billions = parseFloat(gwpBillions) || 0;
    const millions = parseFloat(gwpMillions) || 0;
    const thousands = parseFloat(gwpThousands) || 0;
    return (billions * 1000000000) + (millions * 1000000) + (thousands * 1000);
  };

  const getCurrentMembershipFee = () => {
    const actualTotal = getActualGWPTotal();
    return calculateMembershipFee(organizationType as 'MGA' | 'carrier' | 'provider', actualTotal.toString(), gwpCurrency);
  };

  const getCurrentDiscountedFee = () => {
    const actualTotal = getActualGWPTotal();
    return getDiscountedFee(organizationType as 'MGA' | 'carrier' | 'provider', actualTotal.toString(), gwpCurrency, hasOtherAssociations || false);
  };

  // Check if user is an ASASE member (complimentary Rendezvous tickets)
  const isAsaseMember = () => {
    return otherAssociations.includes('ASASE');
  };

  const getRendezvousPassPrice = () => {
    // ASASE members get complimentary tickets
    if (isAsaseMember()) return 0;

    // Member pricing (already 50% discounted) - based on application organization type
    const pricing = {
      MGA: 400,
      carrier: 550,
      provider: 700
    };
    return pricing[organizationType as 'MGA' | 'carrier' | 'provider'];
  };

  const getRendezvousPassSubtotal = () => {
    if (!reserveRendezvousPasses) return 0;
    return getRendezvousPassPrice() * rendezvousPassCount;
  };

  const getRendezvousVatAmount = () => {
    // 21% VAT
    return Math.round(getRendezvousPassSubtotal() * 0.21 * 100) / 100;
  };

  const getRendezvousPassTotal = () => {
    if (!reserveRendezvousPasses) return 0;
    return getRendezvousPassSubtotal() + getRendezvousVatAmount();
  };


  // Email verification screen removed - no longer needed

  if (registrationComplete) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">{t('registration_complete.title')}</h2>
        <p className="text-fase-black mb-6">
          {t('registration_complete.message')}
        </p>
        
        <div className="space-y-3">
          <Button 
            variant="primary" 
            size="large" 
            className="w-full"
            onClick={async () => {
              try {
                await signOut(auth);
              } catch (error) {
              }
              window.location.href = '/login';
            }}
          >
            {t('registration_complete.continue_button')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator - 5 steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 0 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-6 h-1 ${step >= 1 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-6 h-1 ${step >= 2 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
          <div className={`w-6 h-1 ${step >= 3 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 3 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            4
          </div>
          <div className={`w-6 h-1 ${step >= 4 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 4 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            5
          </div>
        </div>
      </div>

      {/* Step -1: Organization Type Selection */}
      {step === -1 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.organization_type.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.organization_type.subtitle')}</p>
          </div>

          <OrganizationTypeSelector
            organizationType={organizationType as 'MGA' | 'carrier' | 'provider'}
            setOrganizationType={setOrganizationType}
          />
        </div>
      )}

      {/* Step 0: Data Notice Consent */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.data_notice.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.data_notice.subtitle')}</p>
          </div>

          <div className="bg-white border border-fase-light-gold rounded-lg p-6 max-h-96 overflow-y-auto shadow-sm">
            <div className="space-y-4 text-base text-fase-black">
              <h4 className="font-semibold text-fase-navy text-lg">{t('data_notice.title')}</h4>
              
              <div className="space-y-3">
                <p className="mb-3">
                  <strong>{t('data_notice.controller')}</strong>
                </p>
                
                <p className="mb-3">
                  {t('data_notice.purpose')}
                </p>
                
                <p className="mb-2">
                  <strong>{t('data_notice.legal_basis.title')}</strong>
                </p>
                <ul className="list-disc list-inside ml-4 mb-3">
                  <li><strong>{t('data_notice.legal_basis.contractual')}</strong></li>
                  <li><strong>{t('data_notice.legal_basis.legitimate')}</strong></li>
                  <li><strong>{t('data_notice.legal_basis.legal')}</strong></li>
                  <li><strong>{t('data_notice.legal_basis.consent')}</strong></li>
                </ul>
                
                <p className="mb-3">
                  <strong>{t('data_notice.sharing')}</strong>
                </p>
                
                <p className="mb-3">
                  <strong>{t('data_notice.retention')}</strong>
                </p>
                
                <p className="mb-3">
                  <strong>{t('data_notice.rights.title')}</strong>
                </p>
                <ul className="list-disc list-inside ml-4 mb-3">
                  <li>{t('data_notice.rights.access')}</li>
                  <li>{t('data_notice.rights.rectify')}</li>
                  <li>{t('data_notice.rights.erase')}</li>
                  <li>{t('data_notice.rights.restrict')}</li>
                  <li>{t('data_notice.rights.portability')}</li>
                  <li>{t('data_notice.rights.withdraw')}</li>
                  <li>{t('data_notice.rights.complain')}</li>
                </ul>
                
                <p className="mb-3">
                  <strong>{t('data_notice.contact')}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-fase-light-gold rounded-lg p-4">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={dataNoticeConsent}
                onChange={(e) => setDataNoticeConsent(e.target.checked)}
                className="mt-1 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
              />
              <span className="text-base text-fase-black">
                {t('data_notice.consent_text')}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Step 1: Account Information */}
      {step === 1 && (
        <AccountInformationStep
          firstName={firstName}
          setFirstName={setFirstName}
          surname={surname}
          setSurname={setSurname}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          showPasswordReqs={showPasswordReqs}
          setShowPasswordReqs={setShowPasswordReqs}
          touchedFields={touchedFields}
          attemptedNext={attemptedNext}
          markFieldTouched={markFieldTouched}
        />
      )}

      {/* Step 2: Membership Information */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.membership_info.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.membership_info.subtitle')}</p>
          </div>


          {/* Organization Information */}
          <ValidatedInput
            label={t('fields.organization_name')}
            fieldKey="organizationName"
            value={organizationName}
            onChange={setOrganizationName}
            placeholder={t('placeholders.organization_name')}
            required
            touchedFields={touchedFields}
            attemptedNext={attemptedNext}
            markFieldTouched={markFieldTouched}
          />


          {/* Team Members Section */}
          <TeamMembersSection
            members={members}
            setMembers={setMembers}
            firstName={firstName}
            surname={surname}
            email={email}
          />
        </div>
      )}

      {/* Step 3: Additional Details */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.additional_details.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.additional_details.subtitle')}</p>
          </div>

          {/* Address Information */}
          <AddressSection
            addressLine1={addressLine1}
            setAddressLine1={setAddressLine1}
            addressLine2={addressLine2}
            setAddressLine2={setAddressLine2}
            city={city}
            setCity={setCity}
            state={state}
            setState={setState}
            postalCode={postalCode}
            setPostalCode={setPostalCode}
            country={country}
            setCountry={setCountry}
            touchedFields={touchedFields}
            attemptedNext={attemptedNext}
            markFieldTouched={markFieldTouched}
          />

          {/* Portfolio Information for MGAs */}
          {organizationType === 'MGA' && (
            <MGAPortfolioSection
              grossWrittenPremiums={grossWrittenPremiums}
              setGrossWrittenPremiums={setGrossWrittenPremiums}
              gwpCurrency={gwpCurrency}
              setGwpCurrency={setGwpCurrency}
              gwpBillions={gwpBillions}
              setGwpBillions={setGwpBillions}
              gwpMillions={gwpMillions}
              setGwpMillions={setGwpMillions}
              gwpThousands={gwpThousands}
              setGwpThousands={setGwpThousands}
              selectedLinesOfBusiness={selectedLinesOfBusiness}
              setSelectedLinesOfBusiness={setSelectedLinesOfBusiness}
              otherLineOfBusiness1={otherLineOfBusiness1}
              setOtherLineOfBusiness1={setOtherLineOfBusiness1}
              otherLineOfBusiness2={otherLineOfBusiness2}
              setOtherLineOfBusiness2={setOtherLineOfBusiness2}
              otherLineOfBusiness3={otherLineOfBusiness3}
              setOtherLineOfBusiness3={setOtherLineOfBusiness3}
              selectedMarkets={selectedMarkets}
              setSelectedMarkets={setSelectedMarkets}
              calculateTotalGWP={calculateTotalGWP}
            />
          )}


          {/* Carrier-specific Information */}
          {organizationType === 'carrier' && (
            <CarrierInformationSection
              carrierOrganizationType={carrierOrganizationType}
              setCarrierOrganizationType={setCarrierOrganizationType}
              isDelegatingInEurope={isDelegatingInEurope}
              setIsDelegatingInEurope={setIsDelegatingInEurope}
              numberOfMGAs={numberOfMGAs}
              setNumberOfMGAs={setNumberOfMGAs}
              delegatingCountries={delegatingCountries}
              setDelegatingCountries={setDelegatingCountries}
              frontingOptions={frontingOptions}
              setFrontingOptions={setFrontingOptions}
              considerStartupMGAs={considerStartupMGAs}
              setConsiderStartupMGAs={setConsiderStartupMGAs}
              amBestRating={amBestRating}
              setAmBestRating={setAmBestRating}
              otherRating={otherRating}
              setOtherRating={setOtherRating}
            />
          )}

          {/* Service Provider Information */}
          {organizationType === 'provider' && (
            <ServiceProviderSection
              servicesProvided={servicesProvided}
              setServicesProvided={setServicesProvided}
            />
          )}

          {/* European MGA Associations - for all organization types */}
          {/* All memberships are corporate */ (
            <EuropeanAssociationsSection
              hasOtherAssociations={hasOtherAssociations}
              setHasOtherAssociations={setHasOtherAssociations}
              otherAssociations={otherAssociations}
              setOtherAssociations={setOtherAssociations}
            />
          )}
      </div>
      )}

      {/* Step 4: MGA Rendezvous Pass Reservation */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.rendezvous.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.rendezvous.subtitle')}</p>
          </div>

          <div className="bg-white rounded-lg border border-fase-light-gold p-6">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">{t('rendezvous.title')}</h4>
            <p className="text-fase-black mb-4">
              {t('rendezvous.description')}
            </p>

            <p className="text-fase-black mb-6">
              <a
                href="https://mgarendezvous.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fase-navy hover:text-fase-gold underline transition-colors"
              >
                {t('rendezvous.visit_website')}
              </a>
            </p>

            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                checked={reserveRendezvousPasses}
                onChange={(e) => setReserveRendezvousPasses(e.target.checked)}
                className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                id="reserve-passes"
              />
              <label htmlFor="reserve-passes" className="text-sm font-medium text-fase-black cursor-pointer">
                {t('rendezvous.checkbox_label')}
              </label>
            </div>

            {reserveRendezvousPasses && (
              <div className="mt-4 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    {t('rendezvous.number_of_passes')}
                  </label>
                  <select
                    value={rendezvousPassCount}
                    onChange={(e) => setRendezvousPassCount(parseInt(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent bg-white"
                  >
                    {(isAsaseMember() ? [1, 2, 3] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((num) => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  {isAsaseMember() && (
                    <p className="text-xs text-green-600 mt-1">{t('rendezvous.asase_limit')}</p>
                  )}
                </div>

                {/* Attendee Details */}
                <div className="space-y-4">
                  <h5 className="text-md font-medium text-fase-navy">{t('rendezvous.attendee_details')}</h5>
                  {rendezvousAttendees.map((attendee, index) => (
                    <div key={attendee.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm font-medium text-fase-navy mb-3">
                        {t('rendezvous.attendee_number', { number: index + 1 })}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('rendezvous.first_name')} *
                          </label>
                          <input
                            type="text"
                            value={attendee.firstName}
                            onChange={(e) => updateRendezvousAttendee(attendee.id, 'firstName', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('rendezvous.last_name')} *
                          </label>
                          <input
                            type="text"
                            value={attendee.lastName}
                            onChange={(e) => updateRendezvousAttendee(attendee.id, 'lastName', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('rendezvous.email')} *
                          </label>
                          <input
                            type="email"
                            value={attendee.email}
                            onChange={(e) => updateRendezvousAttendee(attendee.id, 'email', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t('rendezvous.job_title')} *
                          </label>
                          <input
                            type="text"
                            value={attendee.jobTitle}
                            onChange={(e) => updateRendezvousAttendee(attendee.id, 'jobTitle', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-fase-cream rounded p-3 border border-fase-light-gold">
                  {isAsaseMember() ? (
                    <>
                      <p className="text-sm font-medium text-green-700 mb-1">
                        {t('rendezvous.pass_total')}: {t('rendezvous.complimentary')}
                      </p>
                      <p className="text-xs text-green-600">
                        {t('rendezvous.asase_benefit', { count: rendezvousPassCount })}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600">
                          {rendezvousPassCount} × €{getRendezvousPassPrice().toLocaleString()} {t('rendezvous.member_rate')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {t('rendezvous.subtotal')}: €{getRendezvousPassSubtotal().toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          {t('rendezvous.vat')}: €{getRendezvousVatAmount().toLocaleString()}
                        </p>
                        <p className="text-sm font-medium text-fase-navy pt-1 border-t border-fase-light-gold">
                          {t('rendezvous.pass_total')}: €{getRendezvousPassTotal().toLocaleString()}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Final Review & Submit Application */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">{t('steps.submit_application.title')}</h3>
            <p className="text-fase-black text-sm">{t('steps.submit_application.subtitle')}</p>
          </div>

          {/* Code of Conduct Consent */}
          <div className="bg-white rounded-lg border border-fase-light-gold p-6">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">{t('code_of_conduct.review_header')}</h4>

            <div className="bg-white border border-fase-light-gold rounded-lg p-6 max-h-96 overflow-y-auto shadow-sm mb-4">
              <div className="text-base text-fase-black">
                <div className="prose prose-base max-w-none">
                  <h4 className="font-semibold text-fase-navy text-lg mb-4">{t('code_of_conduct.intro.title')}</h4>

                  <p className="mb-3">
                    {t('code_of_conduct.intro.content.paragraph1')}
                  </p>

                  <p className="mb-3">
                    {t('code_of_conduct.intro.content.paragraph2')}
                  </p>

                  <p className="mb-4">
                    {t('code_of_conduct.intro.content.paragraph3')}
                  </p>

                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.legal.title')}</h5>
                  <div className="mb-4" style={{whiteSpace: 'pre-line'}}>
                    {t('code_of_conduct.sections.legal.content')}
                  </div>

                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.financial.title')}</h5>
                  <div className="mb-4" style={{whiteSpace: 'pre-line'}}>
                    {t('code_of_conduct.sections.financial.content')}
                  </div>

                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.inter_org.title')}</h5>
                  <div className="mb-4" style={{whiteSpace: 'pre-line'}}>
                    {t('code_of_conduct.sections.inter_org.content')}
                  </div>

                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.community.title')}</h5>
                  <div className="mb-4" style={{whiteSpace: 'pre-line'}}>
                    {t('code_of_conduct.sections.community.content')}
                  </div>

                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.insurers.title')}</h5>
                  <div className="mb-4" style={{whiteSpace: 'pre-line'}}>
                    {t('code_of_conduct.sections.insurers.content')}
                  </div>

                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">{t('code_of_conduct.sections.brokers.title')}</h5>
                  <div className="mb-6" style={{whiteSpace: 'pre-line'}}>
                    {t('code_of_conduct.sections.brokers.content')}
                  </div>

                  <p className="mt-6 pt-4 border-t border-gray-200 font-medium">
                    {t('code_of_conduct.reporting.content.paragraph1')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-fase-light-gold rounded-lg p-4">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={codeOfConductConsent}
                  onChange={(e) => setCodeOfConductConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                />
                <span className="text-sm text-fase-black">
                  {t('code_of_conduct.consent_text')}
                </span>
              </label>
            </div>
          </div>

          {/* Application Summary */}
          <div className="bg-white rounded-lg border border-fase-light-gold p-6 space-y-4">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">{t('application_summary.title')}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-fase-navy font-medium">{t('application_summary.organization')}:</span>
                <p className="text-fase-black">{organizationName}</p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">{t('application_summary.membership_type')}:</span>
                <p className="text-fase-black">
                  {`${organizationType.charAt(0).toUpperCase() + organizationType.slice(1)} Corporate`}
                </p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">{t('application_summary.contact_email')}:</span>
                <p className="text-fase-black">
                  {members.find(m => m.isPrimaryContact)?.email || email}
                </p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">{t('application_summary.country')}:</span>
                <p className="text-fase-black">{country}</p>
              </div>
              
              {organizationType === 'MGA' && (gwpBillions || gwpMillions || gwpThousands) && (
                <div className="md:col-span-2">
                  <span className="text-fase-navy font-medium">{t('application_summary.gwp')}:</span>
                  <p className="text-fase-black">
                    {gwpCurrency === 'EUR' ? '€' : gwpCurrency === 'GBP' ? '£' : '$'}{(() => {
                      const billions = parseFloat(gwpBillions) || 0;
                      const millions = parseFloat(gwpMillions) || 0;
                      const thousands = parseFloat(gwpThousands) || 0;
                      const total = (billions * 1000000000) + (millions * 1000000) + (thousands * 1000);
                      return total.toLocaleString('en-US');
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>


          {/* Pricing Summary */}
          <div className="bg-white rounded-lg border border-fase-light-gold p-6">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">{t('pricing.title')}</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-fase-light-gold">
                <span className="text-fase-black font-medium">{t('pricing.membership_fee')}</span>
                <span className="text-fase-navy font-semibold">€{getCurrentMembershipFee().toLocaleString()}</span>
              </div>

              {hasOtherAssociations && (
                <div className="flex justify-between items-center py-2 border-b border-fase-light-gold">
                  <span className="text-green-600 font-medium">{t('pricing.discount')}</span>
                  <span className="text-green-600 font-semibold">-€{(getCurrentMembershipFee() - getCurrentDiscountedFee()).toLocaleString()}</span>
                </div>
              )}

              {reserveRendezvousPasses && (
                <div className="py-2 border-b border-fase-light-gold">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-fase-black font-medium">{t('rendezvous.passes_label')}</span>
                      {isAsaseMember() ? (
                        <p className="text-xs text-green-600">
                          {t('rendezvous.asase_benefit', { count: rendezvousPassCount })}
                        </p>
                      ) : (
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <p>{rendezvousPassCount} × €{getRendezvousPassPrice().toLocaleString()} {t('rendezvous.member_rate')}</p>
                          <p>{t('rendezvous.subtotal')}: €{getRendezvousPassSubtotal().toLocaleString()}</p>
                          <p>{t('rendezvous.vat')}: €{getRendezvousVatAmount().toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                    {isAsaseMember() ? (
                      <span className="text-green-600 font-semibold">{t('rendezvous.complimentary')}</span>
                    ) : (
                      <span className="text-fase-navy font-semibold">€{getRendezvousPassTotal().toLocaleString()}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center py-3 border-t-2 border-fase-navy">
                <span className="text-fase-navy text-lg font-bold">{t('pricing.total_annual')}</span>
                <span className="text-fase-navy text-xl font-bold">€{(getCurrentDiscountedFee() + getRendezvousPassTotal()).toLocaleString()}</span>
              </div>

              {hasOtherAssociations && (
                <p className="text-sm text-green-600 italic">{t('pricing.discount_note')}</p>
              )}
            </div>
          </div>

          {/* Submit Application Button */}
          <div className="text-center">
            <Button
              type="button"
              variant="primary"
              size="large"
              onClick={async () => {
                if (!codeOfConductConsent) {
                  setError(t('errors.code_of_conduct_required'));
                  return;
                }
                
                setSubmittingApplication(true);
                setError("");
                
                try {
                  // Create account using the exact same function as payment flow
                  const userId = await createAccountAndMembership('pending', {
                    email,
                    password,
                    firstName,
                    surname,
                    organizationName,
                    organizationType: organizationType as 'MGA' | 'carrier' | 'provider',
                    members,
                    addressLine1,
                    addressLine2,
                    city,
                    state,
                    postalCode,
                    country,
                    grossWrittenPremiums,
                    gwpCurrency,
                    selectedLinesOfBusiness,
                    otherLineOfBusiness1,
                    otherLineOfBusiness2,
                    otherLineOfBusiness3,
                    selectedMarkets,
                    hasOtherAssociations,
                    otherAssociations,
                    servicesProvided,
                    carrierOrganizationType,
                    isDelegatingInEurope,
                    numberOfMGAs,
                    delegatingCountries,
                    frontingOptions,
                    considerStartupMGAs,
                    amBestRating,
                    otherRating,
                    reserveRendezvousPasses,
                    rendezvousPassCount,
                    rendezvousPassSubtotal: getRendezvousPassSubtotal(),
                    rendezvousPassVat: getRendezvousVatAmount(),
                    rendezvousPassTotal: getRendezvousPassTotal(),
                    rendezvousIsAsaseMember: isAsaseMember(),
                    rendezvousAttendees
                  });

                  // Generate application number and send email
                  const applicationNumber = `FASE-APP-${Date.now()}-${Date.now().toString().slice(-6)}`;
                  const membershipFee = getCurrentDiscountedFee();
                  
                  // Send application email via simple API with timeout
                  const controller = new AbortController();
                  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                  
                  const response = await fetch('/api/submit-application', {
                    signal: controller.signal,
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      applicationNumber,
                      membershipFee,
                      email,
                      firstName,
                      surname,
                      organizationName,
                        organizationType,
                      hasOtherAssociations,
                      addressLine1,
                      addressLine2,
                      city,
                      state,
                      postalCode,
                      country,
                      grossWrittenPremiums,
                      gwpCurrency,
                      selectedLinesOfBusiness,
                      selectedMarkets,
                      members,
                      reserveRendezvousPasses,
                      rendezvousPassCount,
                      rendezvousPassSubtotal: getRendezvousPassSubtotal(),
                      rendezvousPassVat: getRendezvousVatAmount(),
                      rendezvousPassTotal: getRendezvousPassTotal(),
                      rendezvousAttendees
                    }),
                  });

                  clearTimeout(timeout);

                  if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Submit application API error:', response.status, errorText);
                    throw new Error('Failed to submit application');
                  }
                  
                  // Store application data for thank you page
                  const applicantName = organizationName;
                  sessionStorage.setItem('applicationSubmission', JSON.stringify({
                    applicationNumber: applicationNumber,
                    applicantName: applicantName,
                    paymentMethod: 'application' // Indicates this was application-only
                  }));
                  
                  // Redirect to thank you page
                  window.location.href = '/register/thank-you';
                  
                } catch (error: any) {
                  // Log full error details for debugging
                  const errorDetails = {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    email: email,
                    organizationName: organizationName,
                    organizationType: organizationType,
                    timestamp: new Date().toISOString(),
                    userAgent: window.navigator.userAgent
                  };
                  
                  console.error('Registration submission error:', errorDetails);
                  
                  // Send error log to server
                  try {
                    fetch('/api/log-registration-error', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(errorDetails)
                    });
                  } catch (logError) {
                    console.error('Failed to log error:', logError);
                  }
                  
                  // Show user-friendly error with specific timeout message
                  if (error.name === 'AbortError') {
                    setError(t('errors.submission_timeout'));
                  } else {
                    setError(error.message || t('errors.failed_to_submit'));
                  }
                  
                  setSubmittingApplication(false);
                  console.error('Registration failed:', error.message, {
                    email: email,
                    organizationName: organizationName,
                    organizationType: organizationType,
                    timestamp: new Date().toISOString()
                  });
                }
              }}
              disabled={!codeOfConductConsent || submittingApplication}
              className="w-full"
            >
              {submittingApplication ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('buttons.submitting_application')}
                </>
              ) : (
                t('buttons.submit_application')
              )}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {/* Help Contact */}
      <div className="text-center py-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          {t('help.contact_prefix')}{' '}
          <a 
            href="mailto:help@fasemga.com" 
            className="text-fase-navy hover:text-fase-gold transition-colors"
          >
            help@fasemga.com
          </a>
        </p>
      </div>

      {/* Navigation Buttons - 5-step flow */}
      {step < 4 && (
        <div className="pt-6">
          <div className="flex justify-between">
            {step > (typeFromUrl ? 0 : -1) ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
              >
                {t('buttons.back')}
              </Button>
            ) : (
              <div></div>
            )}

            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
            >
              {t('buttons.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Navigation for step 4 (Rendezvous) - next goes to Review */}
      {step === 4 && (
        <div className="pt-6">
          <div className="flex justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
            >
              {t('buttons.back')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
            >
              {t('buttons.review_submit')}
            </Button>
          </div>
        </div>
      )}

      {/* Navigation for final step (5) - only back button since submit is inline */}
      {step === 5 && (
        <div className="pt-6">
          <div className="flex justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
            >
              {t('buttons.back')}
            </Button>
            <div></div>
          </div>
        </div>
      )}
    </div>
  );
}