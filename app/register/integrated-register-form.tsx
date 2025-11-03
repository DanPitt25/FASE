'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { sendVerificationCode, verifyCode, submitApplication } from "../../lib/auth";
import Button from "../../components/Button";
import { ValidatedInput, validatePassword } from './form-components';
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
  
  // URL parameter handling
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get('type');
  
  // Auth fields
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Membership fields
  const [membershipType] = useState<'individual' | 'corporate'>('corporate');
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState(typeFromUrl || "");
  
  const [members, setMembers] = useState<Member[]>([]);
  
  // Initialize with registrant as first member 
  useEffect(() => {
    if (membershipType === 'corporate' && members.length === 0) {
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
  }, [membershipType, firstName, surname, email, members.length]);

  // Update registrant member when personal info changes
  useEffect(() => {
    if (membershipType === 'corporate' && members.length > 0) {
      const registrantIndex = members.findIndex(m => m.id === 'registrant');
      if (registrantIndex !== -1) {
        const fullName = `${firstName} ${surname}`.trim();
        if (fullName && email) {
          const updatedMembers = [...members];
          updatedMembers[registrantIndex] = {
            ...updatedMembers[registrantIndex],
            firstName: firstName,
            lastName: surname,
            name: fullName,
            email: email
          };
          setMembers(updatedMembers);
        }
      }
    }
  }, [firstName, surname, email, membershipType, members.length]);

  
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
    setGrossWrittenPremiums((total / 1000000).toString()); // Convert to millions for consistency
  }, [gwpBillions, gwpMillions, gwpThousands]);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [step, setStep] = useState(typeFromUrl ? 0 : -1);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  
  // Email verification state for after account creation
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [pendingPaymentAction] = useState<'paypal' | 'invoice' | null>(null);
  
  // Consent states
  const [dataNoticeConsent, setDataNoticeConsent] = useState(false);
  const [codeOfConductConsent, setCodeOfConductConsent] = useState(false);

  // New carrier-specific fields
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
      window.scrollTo(0, 0);
      setAttemptedNext(false);
    } else if (step === 0) {
      // Validate data notice consent
      if (!dataNoticeConsent) {
        setError(t('errors.consent_required'));
        return;
      }
      
      setError("");
      setStep(1);
      window.scrollTo(0, 0);
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
      
      // Check domain before sending verification code
      try {
        setIsSendingVerification(true);
        
        // Check if domain already exists
        const domainExists = await checkDomainExists(email);
        if (domainExists) {
          throw new Error(t('errors.domain_already_registered'));
        }
        
        // Send verification code (no account creation yet)
        await sendVerificationCode(email);
        
        setShowEmailVerification(true);
        setError("");
        setAttemptedNext(false);
      } catch (error: any) {
        setError(error.message || t('errors.verification_failed'));
      } finally {
        setIsSendingVerification(false);
      }
    } else if (step === 2) {
      // Validate membership basic fields
      const fullName = `${firstName} ${surname}`.trim();
      const orgName = membershipType === 'individual' ? fullName : organizationName;
      if (!orgName.trim()) {
        setError(t('errors.organization_name_required'));
        return;
      }
      
      if (membershipType === 'corporate' && !organizationType) {
        setError(t('errors.organization_type_required'));
        return;
      }
      
      // Validate members for corporate membership
      if (membershipType === 'corporate') {
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
      }
      
      setError("");
      setStep(3);
      window.scrollTo(0, 0);
      setAttemptedNext(false);
    } else if (step === 3) {
      // Validate address and portfolio fields before proceeding to payment
      if (!addressLine1.trim() || !city.trim() || !country) {
        setError(t('errors.address_required'));
        return;
      }
      
      
      if (membershipType === 'corporate' && organizationType === 'MGA' && (!grossWrittenPremiums || isNaN(parseFloat(grossWrittenPremiums)))) {
        setError(t('errors.gwp_required'));
        return;
      }
      
      if (hasOtherAssociations === null) {
        setError(t('errors.associations_specify_required'));
        return;
      }
      
      if (hasOtherAssociations && otherAssociations.length === 0) {
        setError(t('errors.associations_select_required'));
        return;
      }
      
      setError("");
      setStep(4);
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

  const getCurrentMembershipFee = () => {
    return calculateMembershipFee(membershipType, organizationType as 'MGA' | 'carrier' | 'provider', grossWrittenPremiums, gwpCurrency);
  };

  const getCurrentDiscountedFee = () => {
    return getDiscountedFee(membershipType, organizationType as 'MGA' | 'carrier' | 'provider', grossWrittenPremiums, gwpCurrency, hasOtherAssociations || false);
  };



  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError(t('errors.enter_verification_code'));
      return;
    }

    setIsCheckingVerification(true);
    try {
      const isVerified = await verifyCode(email, verificationCode.trim());
      
      if (isVerified) {
        setShowEmailVerification(false);
        
        // If this is after Step 2, continue to Step 3
        if (!pendingPaymentAction) {
          setStep(2);
          window.scrollTo(0, 0);
        } else {
          // This is after payment - continue with the pending payment action
          if (pendingPaymentAction === 'paypal') {
            await continueWithPayPalPayment();
          } else if (pendingPaymentAction === 'invoice') {
            setRegistrationComplete(true);
          }
        }
      } else {
        setError(t('errors.invalid_verification_code'));
      }
    } catch (error: any) {
      setError(error.message || t('errors.verification_code_failed'));
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const continueWithPayPalPayment = async () => {
    try {
      const { auth } = await import('@/lib/firebase');
      if (!auth.currentUser) {
        throw new Error(t('errors.no_authenticated_user'));
      }
      
      // Create PayPal order
      const fullName = `${firstName} ${surname}`.trim();
      const orgName = membershipType === 'individual' ? fullName : organizationName;
      const response = await fetch('/api/create-paypal-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName: orgName,
          organizationType: membershipType === 'individual' ? 'individual' : organizationType,
          membershipType,
          grossWrittenPremiums: membershipType === 'corporate' && organizationType === 'MGA' ? getGWPBand(convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency)) : undefined,
          userEmail: email,
          userId: auth.currentUser.uid,
          testPayment: false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(t('errors.payment_processing_failed'));
      }

      const data = await response.json();

      // Redirect to PayPal Checkout
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error(t('errors.no_paypal_url'));
      }
    } catch (error: any) {
      setPaymentError(error.message || t('errors.failed_payment_start'));
    }
  };

  const handleSendVerificationCode = async () => {
    if (isSendingVerification) return;
    
    try {
      setIsSendingVerification(true);
      await sendVerificationCode(email);
      setError("");
    } catch (error: any) {
      setError(error.message || t('errors.verification_failed'));
    } finally {
      setIsSendingVerification(false);
    }
  };


  const handleSubmitApplication = async () => {
    if (!codeOfConductConsent) {
      setError(t('errors.code_of_conduct_required'));
      return;
    }

    if (processingPayment) return;

    setProcessingPayment(true);
    setPaymentError("");

    try {
      // Prepare application data
      const applicationData = {
        // Personal info
        firstName,
        surname,
        email,
        phone: membershipType === 'corporate' ? members.find(m => m.isPrimaryContact)?.phone || '' : '',
        membershipType,
        
        // Organization info
        ...(membershipType === 'corporate' && {
          organizationName,
          organizationType,
          members: membershipType === 'corporate' ? members : undefined,
        }),

        // Address
        businessAddress: {
          line1: addressLine1,
          line2: addressLine2,
          city,
          state,
          postalCode,
          country,
        },

        // MGA specific
        ...(membershipType === 'corporate' && organizationType === 'MGA' && {
          grossWrittenPremiums: getGWPBand(convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency)),
          gwpCurrency,
          selectedLinesOfBusiness,
          selectedMarkets,
          hasOtherAssociations,
          otherAssociations: hasOtherAssociations ? otherAssociations : undefined,
        }),

        // Carrier specific
        ...(membershipType === 'corporate' && organizationType === 'carrier' && {
          isDelegatingInEurope,
          numberOfMGAs: isDelegatingInEurope === 'Yes' ? numberOfMGAs : undefined,
          delegatingCountries: isDelegatingInEurope === 'Yes' ? delegatingCountries : undefined,
          frontingOptions,
          considerStartupMGAs,
          amBestRating,
          otherRating,
        }),

        // Service provider specific
        ...(membershipType === 'corporate' && organizationType === 'provider' && {
          servicesProvided,
        }),

        // Consents
        dataNoticeConsent,
        codeOfConductConsent,
      };

      // Submit application using Firebase Function
      const result = await submitApplication(applicationData);

      // Create Firebase Auth account and Firestore record for the applicant
      await createAccountAndMembership('pending', {
        email,
        password,
        firstName,
        surname,
        membershipType,
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
        isDelegatingInEurope,
        numberOfMGAs,
        delegatingCountries,
        frontingOptions,
        considerStartupMGAs,
        amBestRating,
        otherRating
      });

      // Store application data in sessionStorage for thank you page
      const applicantName = membershipType === 'individual' ? `${firstName} ${surname}`.trim() : organizationName;
      sessionStorage.setItem('applicationSubmission', JSON.stringify({
        applicationNumber: result.applicationNumber,
        applicantName: applicantName
      }));

      // Redirect to clean thank you page URL
      window.location.href = '/register/thank-you';

    } catch (error: any) {
      setPaymentError(error.message || t('errors.failed_to_submit'));
    } finally {
      setProcessingPayment(false);
    }
  };





  // Email verification screen
  if (showEmailVerification) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div>
          <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">{t('verification.title')}</h2>
          <p className="text-fase-black mb-6">
            {t('verification.subtitle')} <strong>{email}</strong>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="verification-code" className="block text-sm font-medium text-fase-navy mb-2">
              {t('verification.code_label')}
            </label>
            <input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={(e) => {
                // Only allow numbers and limit to 6 digits
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
              }}
              placeholder={t('verification.code_placeholder')}
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              maxLength={6}
            />
          </div>
          
          <Button 
            variant="primary" 
            size="large" 
            className="w-full"
            onClick={handleVerifyCode}
            disabled={isCheckingVerification || verificationCode.length !== 6}
          >
            {isCheckingVerification ? t('verification.verifying') : t('verification.verify_button')}
          </Button>
          
          <Button 
            variant="secondary" 
            size="medium" 
            className="w-full"
            onClick={handleSendVerificationCode}
            disabled={isSendingVerification}
          >
            {isSendingVerification ? t('verification.sending') : t('verification.resend_code')}
          </Button>
          
          <p className="text-xs text-fase-black text-center">
            {t('verification.code_expires')}
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
        
      </div>
    );
  }

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
      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 0 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-8 h-1 ${step >= 1 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-8 h-1 ${step >= 2 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
          <div className={`w-8 h-1 ${step >= 3 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 3 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            4
          </div>
          <div className={`w-8 h-1 ${step >= 4 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
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
            membershipType={membershipType}
          />

          {/* Portfolio Information for MGAs */}
          {membershipType === 'corporate' && organizationType === 'MGA' && (
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
          {membershipType === 'corporate' && organizationType === 'carrier' && (
            <CarrierInformationSection
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
          {membershipType === 'corporate' && organizationType === 'provider' && (
            <ServiceProviderSection
              servicesProvided={servicesProvided}
              setServicesProvided={setServicesProvided}
            />
          )}

          {/* European MGA Associations - for all organization types */}
          {membershipType === 'corporate' && (
            <EuropeanAssociationsSection
              hasOtherAssociations={hasOtherAssociations}
              setHasOtherAssociations={setHasOtherAssociations}
              otherAssociations={otherAssociations}
              setOtherAssociations={setOtherAssociations}
            />
          )}
      </div>
      )}

      {/* Step 4: Final Review & Submit Application */}
      {step === 4 && (
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
                <p className="text-fase-black">{membershipType === 'individual' ? `${firstName} ${surname}`.trim() : organizationName}</p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">{t('application_summary.membership_type')}:</span>
                <p className="text-fase-black">
                  {membershipType === 'individual' 
                    ? t('membership_types.individual') 
                    : `${organizationType.charAt(0).toUpperCase() + organizationType.slice(1)}`
                  }
                </p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">{t('application_summary.contact_email')}:</span>
                <p className="text-fase-black">
                  {membershipType === 'corporate' 
                    ? members.find(m => m.isPrimaryContact)?.email || email
                    : email
                  }
                </p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">{t('application_summary.country')}:</span>
                <p className="text-fase-black">{country}</p>
              </div>
              
              {membershipType === 'corporate' && organizationType === 'MGA' && (gwpBillions || gwpMillions || gwpThousands) && (
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

          {/* Pricing */}
          <div className="bg-white rounded-lg border border-fase-light-gold p-6">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">{t('pricing.title')}</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-fase-black">{t('pricing.base_fee')}</span>
                <span className="text-fase-black">€{getCurrentMembershipFee()}</span>
              </div>
              
              {membershipType === 'corporate' && hasOtherAssociations && (
                <div className="flex justify-between items-center text-green-600">
                  <span>{t('pricing.member_discount')}</span>
                  <span>-€{getCurrentMembershipFee() - getCurrentDiscountedFee()}</span>
                </div>
              )}
              
              <div className="border-t border-fase-light-gold pt-2 mt-2">
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span className="text-fase-navy">{t('pricing.total_fee')}</span>
                  <span className="text-fase-navy">€{getCurrentDiscountedFee()}</span>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-fase-black mt-4">
              {t('pricing.billing_note')}
              {membershipType === 'corporate' && hasOtherAssociations && (
                <> {t('pricing.discount_note')}</>
              )}
            </p>
          </div>

          {/* Submit Application Button */}
          <div className="text-center">
            <Button
              type="button"
              variant="primary"
              size="large"
              onClick={handleSubmitApplication}
              disabled={!codeOfConductConsent || processingPayment}
              className="w-full"
            >
              {processingPayment ? (
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
            
            <p className="text-xs text-fase-black mt-3">
              {t('submit_note')}
            </p>
          </div>
        </div>
      )}

      {(error || paymentError) && (
        <div className="text-red-600 text-sm">{error || paymentError}</div>
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

      {/* Navigation Buttons */}
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
            
            {step < 4 ? (
              <Button 
                type="button"
                variant="primary" 
                onClick={handleNext}
                disabled={step === 1 && isSendingVerification}
              >
                {step === 1 && isSendingVerification ? t('buttons.sending_code') : t('buttons.next')}
              </Button>
            ) : step === 3 ? (
              <Button 
                type="button"
                variant="primary" 
                onClick={handleNext}
              >
                {t('buttons.review_submit')}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}