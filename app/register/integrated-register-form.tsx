'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
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
        setError("Please select an organization type to continue");
        return;
      }
      
      setError("");
      setStep(0);
      window.scrollTo(0, 0);
      setAttemptedNext(false);
    } else if (step === 0) {
      // Validate data notice consent
      if (!dataNoticeConsent) {
        setError("Please consent to our data notice to continue");
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
        setError("Please fill in all required fields");
        return;
      }
      
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      const { isValid, requirements } = validatePassword(password);
      if (!isValid) {
        let errorMsg = "Password must include: ";
        const missing = [];
        if (!requirements.length) missing.push("at least 8 characters");
        if (!requirements.capital) missing.push("one capital letter");
        if (!requirements.special) missing.push("one special character");
        setError(errorMsg + missing.join(", "));
        return;
      }
      
      // Check domain before sending verification code
      try {
        setIsSendingVerification(true);
        
        // Check if domain already exists
        const domainExists = await checkDomainExists(email);
        if (domainExists) {
          throw new Error('An organization with this email domain is already registered. Please contact us if you believe this is an error.');
        }
        
        // Send verification code (no account creation yet)
        await sendVerificationCode(email);
        
        setShowEmailVerification(true);
        setError("");
        setAttemptedNext(false);
      } catch (error: any) {
        setError(error.message || "Failed to send verification code");
      } finally {
        setIsSendingVerification(false);
      }
    } else if (step === 2) {
      // Validate membership basic fields
      const fullName = `${firstName} ${surname}`.trim();
      const orgName = membershipType === 'individual' ? fullName : organizationName;
      if (!orgName.trim()) {
        setError("Organization name is required");
        return;
      }
      
      if (membershipType === 'corporate' && !organizationType) {
        setError("Organization type is required for corporate memberships");
        return;
      }
      
      // Validate members for corporate membership
      if (membershipType === 'corporate') {
        if (members.length === 0) {
          setError("At least one team member is required");
          return;
        }
        
        const hasPrimaryContact = members.some(m => m.isPrimaryContact);
        if (!hasPrimaryContact) {
          setError("You must designate one person as the account administrator");
          return;
        }
        
        // Validate all members have required fields
        for (const member of members) {
          if (!member.firstName?.trim() || !member.lastName?.trim()) {
            setError("All members must have a first and last name");
            return;
          }
          if (!member.email.trim()) {
            setError("All members must have an email");
            return;
          }
          if (!member.jobTitle.trim()) {
            setError("All members must have a job title");
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
        setError("Address information is required");
        return;
      }
      
      
      if (membershipType === 'corporate' && organizationType === 'MGA' && (!grossWrittenPremiums || isNaN(parseFloat(grossWrittenPremiums)))) {
        setError("Gross written premiums are required for MGA memberships");
        return;
      }
      
      if (hasOtherAssociations === null) {
        setError("Please specify if your organization is a member of other European MGA associations");
        return;
      }
      
      if (hasOtherAssociations && otherAssociations.length === 0) {
        setError("Please select at least one European MGA association you are a member of");
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
      setError("Please enter the verification code");
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
        setError("Invalid verification code");
      }
    } catch (error: any) {
      setError(error.message || "Failed to verify code");
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const continueWithPayPalPayment = async () => {
    try {
      const { auth } = await import('@/lib/firebase');
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
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
        throw new Error(`Payment processing failed (${response.status}). Please try again.`);
      }

      const data = await response.json();

      // Redirect to PayPal Checkout
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error('No approval URL received from PayPal');
      }
    } catch (error: any) {
      setPaymentError(error.message || 'Failed to start payment process');
    }
  };

  const handleSendVerificationCode = async () => {
    if (isSendingVerification) return;
    
    try {
      setIsSendingVerification(true);
      await sendVerificationCode(email);
      setError("");
    } catch (error: any) {
      setError(error.message || "Failed to send verification code");
    } finally {
      setIsSendingVerification(false);
    }
  };


  const handleSubmitApplication = async () => {
    if (!codeOfConductConsent) {
      setError("Please consent to the Code of Conduct to continue");
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
      setPaymentError(error.message || 'Failed to submit application');
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
          <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Verify Your Email</h2>
          <p className="text-fase-black mb-6">
            We&apos;ve sent a 6-digit verification code to: <strong>{email}</strong>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="verification-code" className="block text-sm font-medium text-fase-navy mb-2">
              Verification Code
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
              placeholder="Enter 6-digit code"
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
            {isCheckingVerification ? "Verifying..." : "Verify Code"}
          </Button>
          
          <Button 
            variant="secondary" 
            size="medium" 
            className="w-full"
            onClick={handleSendVerificationCode}
            disabled={isSendingVerification}
          >
            {isSendingVerification ? "Sending..." : "Resend Code"}
          </Button>
          
          <p className="text-xs text-fase-black text-center">
            Code expires in 20 minutes
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
        <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Registration Complete!</h2>
        <p className="text-fase-black mb-6">
          Your account has been created and your membership application submitted. 
          You can now sign in to access your member portal.
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
            Continue to Sign In
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
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Choose Your Organization Type</h3>
            <p className="text-fase-black text-sm">Select the type that best describes your organization</p>
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
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Data Notice</h3>
            <p className="text-fase-black text-sm">Please review and consent to our data usage policy</p>
          </div>

          <div className="bg-white border border-fase-light-gold rounded-lg p-6 max-h-96 overflow-y-auto shadow-sm">
            <div className="space-y-4 text-base text-fase-black">
              <h4 className="font-semibold text-fase-navy text-lg">Data protection notice</h4>
              
              <div className="space-y-3">
                <p className="mb-3">
                  <strong>Data Controller:</strong> FASE B.V., Herengracht 124, 1015 BT Amsterdam, Netherlands. Contact: admin@fasemga.com
                </p>
                
                <p className="mb-3">
                  FASE collects the personal and business information you provide to manage your membership and operate as an association for Managing General Agents and related insurance professionals.
                </p>
                
                <p className="mb-2">
                  <strong>Legal Basis and Purpose:</strong> We process your data based on:
                </p>
                <ul className="list-disc list-inside ml-4 mb-3">
                  <li><strong>Contractual necessity:</strong> to process your membership application, provide member services, and fulfill our membership agreement</li>
                  <li><strong>Legitimate interests:</strong> to facilitate professional networking, maintain member directories, and promote the insurance industry</li>
                  <li><strong>Legal obligations:</strong> to meet regulatory and professional association requirements</li>
                  <li><strong>Your consent:</strong> for marketing communications and sharing your details for networking (where you have agreed)</li>
                </ul>
                
                <p className="mb-3">
                  <strong>Data Sharing and Confidentiality:</strong> FASE may share basic information about your business publicly and with other members for legitimate organisational and networking purposes. Commercially sensitive information, including financial processing data, business strategies, and proprietary information, will be held in strict confidence.
                </p>
                
                <p className="mb-3">
                  <strong>Retention Period:</strong> We retain your data for the duration of your membership plus 7 years for regulatory compliance, unless you request earlier deletion or we have another legal basis to retain it.
                </p>
                
                <p className="mb-3">
                  <strong>Your Rights:</strong> Under GDPR and UK data protection law, you have the right to:
                </p>
                <ul className="list-disc list-inside ml-4 mb-3">
                  <li>access your personal data and receive a copy</li>
                  <li>rectify inaccurate or incomplete data</li>
                  <li>erase your data (where legally permissible)</li>
                  <li>restrict or object to processing</li>
                  <li>data portability</li>
                  <li>withdraw consent (where processing is based on consent)</li>
                  <li>lodge a complaint with your local data protection authority</li>
                </ul>
                
                <p className="mb-3">
                  <strong>Contact:</strong> To exercise your rights or for data protection queries, contact us at admin@fasemga.com.
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
                I have read and understand the data notice above, and I consent to FASE collecting, using, and storing my personal and business information as described. *
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
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Membership Information</h3>
            <p className="text-fase-black text-sm">Tell us about your organization</p>
          </div>


          {/* Organization Information */}
          <ValidatedInput
            label="Organization Name"
            fieldKey="organizationName"
            value={organizationName}
            onChange={setOrganizationName}
            placeholder="Your company or organization name"
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
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Additional Details</h3>
            <p className="text-fase-black text-sm">Complete your membership application</p>
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
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Submit your application</h3>
            <p className="text-fase-black text-sm">Review your information and submit your membership application</p>
          </div>

          {/* Code of Conduct Consent */}
          <div className="bg-white rounded-lg border border-fase-light-gold p-6">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Please review and consent to our code of conduct.</h4>
            
            <div className="bg-white border border-fase-light-gold rounded-lg p-6 max-h-96 overflow-y-auto shadow-sm mb-4">
              <div className="text-base text-fase-black">
                <div className="prose prose-base max-w-none">
                  <h4 className="font-semibold text-fase-navy text-lg mb-4">FASE Code of Conduct</h4>
                  
                  <p className="mb-3">
                    FASE supports the highest professional and ethical standards, as described in this Code of Conduct, and requires that all members commit annually to upholding these standards as a condition of their membership.
                  </p>
                  
                  <p className="mb-3">
                    Members hereby undertake to act in a legal, fair and ethical manner in all their dealings with all parties.
                  </p>
                  
                  <p className="mb-4">
                    Members undertake to cooperate fully and at all times with FASE in its enforcement of this Code.
                  </p>
                  
                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">1. Legal responsibilities</h5>
                  <p className="mb-3">
                    Members will comply with all applicable laws and regulations in the locations in which they do business. Should this legal responsibility conflict with another duty described in this Code, this legal responsibility will take priority.
                  </p>
                  
                  <p className="mb-2">
                    Members will bring to the attention of the FASE Business Conduct Committee any circumstances of which they become aware involving:
                  </p>
                  
                  <ul className="list-disc list-inside ml-4 mb-3">
                    <li>A member being in breach of any regulatory requirement and</li>
                    <li>Any circumstance that may reasonably lead to sanctions against the member or a member of their staff or directors by the relevant regulatory authorities</li>
                  </ul>
                  
                  <p className="mb-4">
                    Members will provide all reasonable lawful assistance to regulatory, professional and law enforcement organization in the discharge of their duties, whether in respect of themselves, another Member or a non-member.
                  </p>
                  
                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">2. Financial Responsibilities</h5>
                  <p className="mb-3">
                    Members should always meet their financial obligations on time. This includes, but it not limited to, payment of debts, premium due to insurers, returns due to brokers and insureds, sums due to employees.
                  </p>
                  
                  <p className="mb-4">
                    Members must comply with applicable solvency or like requirements.
                  </p>
                  
                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">3. Inter-organisational Responsibilities</h5>
                  <p className="mb-3">
                    Members will compete fairly and honourably in the markets in which they operate.
                  </p>
                  
                  <p className="mb-2">
                    This includes, but is not limited to:
                  </p>
                  
                  <ul className="list-disc list-inside ml-4 mb-4">
                    <li>making no statement about fellow Members, competitors or other market participants, privately or publicly, which they do not honestly believe to be true and relevant based on the best information reasonably available to them;</li>
                    <li>entering into any agreement intended to diminish competition within the market.</li>
                  </ul>
                  
                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">4. Community Responsibilities</h5>
                  <p className="mb-3">
                    FASE members must conduct themselves in a manner befitting the privileges of membership.
                  </p>
                  
                  <p className="mb-3">
                    Members will not only comply with their obligations under law pertaining to discrimination, but in all their dealings will take reasonable steps not to cause a detriment to any person or organisation arising from race, sex, sexual orientation, gender reassignment, pregnancy and maternity, married or civil partnership status, religion or belief, age and disability.
                  </p>
                  
                  <p className="mb-3">
                    Members are encouraged to take part in civic, charitable and philanthropic activities which contribute to the promotion of the good standing of the insurance sector, its contribution to the public good and the welfare of those who work in it.
                  </p>
                  
                  <p className="mb-4">
                    Members will encourage continuing education and training for staff.
                  </p>
                  
                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">5. Relationships with Insurers</h5>
                  <p className="mb-2">
                    Members will deal fairly and honestly when acting on behalf of insurers. In particular they should:
                  </p>
                  
                  <ul className="list-disc list-inside ml-4 mb-4">
                    <li>faithfully execute the underwriting guidelines of the insurers they represent;</li>
                    <li>act in the utmost good faith and gather all data necessary to make a proper underwriting decision before putting an insurer on risk;</li>
                    <li>keep themselves up to date on the laws and regulations in all areas in which they have authority, and advise insurers accordingly of the impact of such laws and regulations as they affect their relationship.</li>
                  </ul>
                  
                  <h5 className="font-semibold text-fase-navy mt-6 mb-3">6. Relationships with Brokers and Agents (or Insureds if operating directly)</h5>
                  <p className="mb-2">
                    Members should deal fairly and honestly with brokers, agents or insureds (if operating directly), and in so doing will:
                  </p>
                  
                  <ul className="list-disc list-inside ml-4 mb-3">
                    <li>consider at all times the financial stability of insurers with which the Member places business;</li>
                    <li>make no false or misleading representation of what coverage is being provided, or the limitations or exclusions to coverage or impose limitations or exclusions such that the policy provides no effective benefit to the insured.</li>
                  </ul>
                  
                  <p className="mb-3">
                    Members should be able to demonstrate that they have carefully considered the insurers that they represent as underwriting agents and place their and their brokers&apos; customers&apos; business with.
                  </p>
                  
                  <p className="mb-3">
                    Effective and appropriate due diligence is a key part of the process that Members should perform on the insurance companies they represent as security for the policies they provide. There is a risk to customers in the event that an insurer fails and is unable to pay valid claims.
                  </p>
                  
                  <p className="mb-3">
                    FASE expects MGA Members to be able to demonstrate that suitable due diligence has been performed on the insurers that they represent and offer as insurance security.
                  </p>
                  
                  <p className="mb-6">
                    Members should provide clear and unambiguous detail of the name and address of the insurer in all the relevant documentation provided for brokers and policyholders. We expect Members to positively avoid giving the policyholder the impression that the MGA is the insurer and obscure the name of the insurer behind the MGA. It is important that customers can make an informed decision on where their insurance is being placed.
                  </p>
                  
                  <p className="mt-6 pt-4 border-t border-gray-200 font-medium">
                    All notices of potential breach made under this Code should be made to the Business Conduct Committee at conduct@fasemga.com.
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
                  I have read and agree to abide by the FASE Code of Conduct as a condition of my membership. I understand that failure to comply may result in membership termination. *
                </span>
              </label>
            </div>
          </div>

          {/* Application Summary */}
          <div className="bg-white rounded-lg border border-fase-light-gold p-6 space-y-4">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Application summary</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-fase-navy font-medium">Organization:</span>
                <p className="text-fase-black">{membershipType === 'individual' ? `${firstName} ${surname}`.trim() : organizationName}</p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">Membership type:</span>
                <p className="text-fase-black">
                  {membershipType === 'individual' 
                    ? 'Individual' 
                    : `${organizationType.charAt(0).toUpperCase() + organizationType.slice(1)}`
                  }
                </p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">Contact email:</span>
                <p className="text-fase-black">
                  {membershipType === 'corporate' 
                    ? members.find(m => m.isPrimaryContact)?.email || email
                    : email
                  }
                </p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">Country:</span>
                <p className="text-fase-black">{country}</p>
              </div>
              
              {membershipType === 'corporate' && organizationType === 'MGA' && (gwpBillions || gwpMillions || gwpThousands) && (
                <div className="md:col-span-2">
                  <span className="text-fase-navy font-medium">Gross written premiums:</span>
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
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Annual membership fee (founding member)</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-fase-black">Base Fee</span>
                <span className="text-fase-black">€{getCurrentMembershipFee()}</span>
              </div>
              
              {membershipType === 'corporate' && hasOtherAssociations && (
                <div className="flex justify-between items-center text-green-600">
                  <span>Member Discount (20%)</span>
                  <span>-€{getCurrentMembershipFee() - getCurrentDiscountedFee()}</span>
                </div>
              )}
              
              <div className="border-t border-fase-light-gold pt-2 mt-2">
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span className="text-fase-navy">Total annual fee</span>
                  <span className="text-fase-navy">€{getCurrentDiscountedFee()}</span>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-fase-black mt-4">
              Membership is billed annually, with notice prior to renewal.
              {membershipType === 'corporate' && hasOtherAssociations && (
                <>* 20% discount applied for members of other European MGA associations.</>
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
                  Submitting Application...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
            
            <p className="text-xs text-fase-black mt-3">
              Your application will be sent to our team for review. You will hear back from us within one business day.
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
          Problems signing up? Please contact{' '}
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
                Back
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
                {step === 1 && isSendingVerification ? "Sending Code..." : "Next"}
              </Button>
            ) : step === 3 ? (
              <Button 
                type="button"
                variant="primary" 
                onClick={handleNext}
              >
                Review & Submit
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}