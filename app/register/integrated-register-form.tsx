'use client';

import { useState, useEffect } from "react";
import { createAccountWithoutVerification, sendVerificationCode, verifyCode } from "../../lib/auth";
import { uploadMemberLogo, validateLogoFile } from "../../lib/storage";
import Button from "../../components/Button";
import { handleAuthError } from "../../lib/auth-errors";

// Password validation function
const validatePassword = (password: string) => {
  const requirements = {
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const isValid = requirements.length && requirements.capital && requirements.special;
  return { requirements, isValid };
};

// Validated input component
const ValidatedInput = ({ 
  label, 
  fieldKey, 
  value, 
  onChange, 
  type = "text", 
  placeholder, 
  required = false,
  className = "",
  touchedFields,
  attemptedNext,
  markFieldTouched,
  ...props 
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (fieldKey: string) => void;
  [key: string]: any;
}) => {
  const isValid = value.trim() !== '';
  const shouldShowValidation = required && ((touchedFields[fieldKey] || attemptedNext) && !isValid);
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-fase-navy mb-2">
          {label} {required && '*'}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          markFieldTouched(fieldKey);
        }}
        onBlur={() => markFieldTouched(fieldKey)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
          shouldShowValidation ? 'border-red-300' : 'border-fase-light-gold'
        }`}
        {...props}
      />
    </div>
  );
};

// Validated select component
const ValidatedSelect = ({ 
  label, 
  fieldKey, 
  value, 
  onChange, 
  options,
  required = false,
  className = "",
  touchedFields,
  attemptedNext,
  markFieldTouched
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{value: string, label: string}>;
  required?: boolean;
  className?: string;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (fieldKey: string) => void;
}) => {
  const isValid = value.trim() !== '';
  const shouldShowValidation = required && ((touchedFields[fieldKey] || attemptedNext) && !isValid);
  
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-fase-navy mb-2">
        {label} {required && '*'}
      </label>
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          markFieldTouched(fieldKey);
        }}
        onBlur={() => markFieldTouched(fieldKey)}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
          shouldShowValidation ? 'border-red-300' : 'border-fase-light-gold'
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

export default function IntegratedRegisterForm() {
  // Auth fields
  const [personalName, setPersonalName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Membership fields
  const [membershipType, setMembershipType] = useState<'individual' | 'corporate'>('individual');
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactEmail, setPrimaryContactEmail] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");
  const [primaryContactJobTitle, setPrimaryContactJobTitle] = useState("");
  
  // Address fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [customCountry, setCustomCountry] = useState("");
  
  // Portfolio fields (for MGAs)
  const [grossWrittenPremiums, setGrossWrittenPremiums] = useState("");
  const [portfolioMix, setPortfolioMix] = useState<{[key: string]: number}>({});
  
  // Other fields
  const [hasOtherAssociations, setHasOtherAssociations] = useState<boolean | null>(null);
  const [otherAssociations, setOtherAssociations] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [step, setStep] = useState(1);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // Check for verification redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true' && showEmailVerification) {
      // User came back from clicking verification link
      handleVerifyCode();
    }
  }, [showEmailVerification]);

  const markFieldTouched = (fieldKey: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldKey]: true }));
  };

  const organizationTypeOptions = [
    { value: 'MGA', label: 'Managing General Agent (MGA)' },
    { value: 'carrier', label: 'Insurance Carrier' },
    { value: 'provider', label: 'Service Provider' }
  ];

  const grossWrittenPremiumsOptions = [
    { value: '<10m', label: 'Less than €10 million' },
    { value: '10-20m', label: '€10-20 million' },
    { value: '20-50m', label: '€20-50 million' },
    { value: '50-100m', label: '€50-100 million' },
    { value: '100-500m', label: '€100-500 million' },
    { value: '500m+', label: 'More than €500 million' }
  ];

  const countryOptions = [
    { value: 'AT', label: 'Austria' },
    { value: 'BE', label: 'Belgium' },
    { value: 'BG', label: 'Bulgaria' },
    { value: 'HR', label: 'Croatia' },
    { value: 'CY', label: 'Cyprus' },
    { value: 'CZ', label: 'Czech Republic' },
    { value: 'DK', label: 'Denmark' },
    { value: 'EE', label: 'Estonia' },
    { value: 'FI', label: 'Finland' },
    { value: 'FR', label: 'France' },
    { value: 'DE', label: 'Germany' },
    { value: 'GR', label: 'Greece' },
    { value: 'HU', label: 'Hungary' },
    { value: 'IE', label: 'Ireland' },
    { value: 'IT', label: 'Italy' },
    { value: 'LV', label: 'Latvia' },
    { value: 'LT', label: 'Lithuania' },
    { value: 'LU', label: 'Luxembourg' },
    { value: 'MT', label: 'Malta' },
    { value: 'NL', label: 'Netherlands' },
    { value: 'PL', label: 'Poland' },
    { value: 'PT', label: 'Portugal' },
    { value: 'RO', label: 'Romania' },
    { value: 'SK', label: 'Slovakia' },
    { value: 'SI', label: 'Slovenia' },
    { value: 'ES', label: 'Spain' },
    { value: 'SE', label: 'Sweden' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'US', label: 'United States' },
    { value: 'OTHER', label: 'Other' }
  ];

  const portfolioMixLines = [
    'Property', 'Casualty', 'Motor', 'Marine', 'Aviation', 'Cyber', 'D&O', 'E&O', 'Other'
  ];

  const handleNext = async () => {
    setAttemptedNext(true);
    
    if (step === 1) {
      // Validate auth fields
      const authRequiredFields = ['personalName', 'email', 'password', 'confirmPassword'];
      const authFieldValues = {
        personalName,
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
      
      // Create account and trigger email verification
      try {
        setLoading(true);
        const orgForAuth = membershipType === 'corporate' ? organizationName : undefined;
        await createAccountWithoutVerification(email, password, personalName, orgForAuth);
        
        // Show email verification step
        setShowEmailVerification(true);
        setEmailVerificationSent(true); // Email is automatically sent during account creation
        setError("");
        setAttemptedNext(false);
        setLoading(false);
        return;
      } catch (error: any) {
        setLoading(false);
        setError(handleAuthError(error));
        return;
      }
    } else if (step === 2) {
      // Validate membership basic fields
      const orgName = membershipType === 'individual' ? personalName : organizationName;
      if (!orgName.trim()) {
        setError("Organization name is required");
        return;
      }
      
      if (membershipType === 'corporate' && !organizationType) {
        setError("Organization type is required for corporate memberships");
        return;
      }
      
      if (!primaryContactName.trim() || !primaryContactEmail.trim() || !primaryContactPhone.trim()) {
        setError("Primary contact information is required");
        return;
      }
      
      setError("");
      setStep(3);
      setAttemptedNext(false);
    } else if (step === 3) {
      // Validate address and portfolio fields before proceeding to payment
      if (!addressLine1.trim() || !city.trim() || !country) {
        setError("Address information is required");
        return;
      }
      
      if (country === 'OTHER' && !customCountry.trim()) {
        setError("Please specify your country");
        return;
      }
      
      if (membershipType === 'corporate' && organizationType === 'MGA' && !grossWrittenPremiums) {
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
      setAttemptedNext(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError("");
    }
  };

  const calculateMembershipFee = () => {
    if (membershipType === 'individual') {
      return 500;
    } else if (membershipType === 'corporate' && organizationType === 'MGA' && grossWrittenPremiums) {
      switch (grossWrittenPremiums) {
        case '<10m': return 900;
        case '10-20m': return 1500;
        case '20-50m': return 2000;
        case '50-100m': return 2800;
        case '100-500m': return 4200;
        case '500m+': return 6400;
        default: return 900;
      }
    } else {
      return 900; // Default corporate rate
    }
  };

  const getDiscountedFee = () => {
    const baseFee = calculateMembershipFee();
    if (membershipType === 'corporate' && hasOtherAssociations) {
      return Math.round(baseFee * 0.8); // 20% discount
    }
    return baseFee;
  };

  const handlePayment = async () => {
    if (processingPayment) return;
    
    setProcessingPayment(true);
    setPaymentError("");

    try {
      const { auth } = await import('@/lib/firebase');
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Create Stripe checkout session
      const orgName = membershipType === 'individual' ? personalName : organizationName;
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationName: orgName,
          organizationType: membershipType === 'individual' ? 'individual' : organizationType,
          membershipType,
          grossWrittenPremiums: membershipType === 'corporate' && organizationType === 'MGA' ? grossWrittenPremiums : undefined,
          userEmail: email,
          userId: auth.currentUser.uid
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Stripe API error:', response.status, errorText);
        throw new Error(`Payment processing failed (${response.status}). Please try again.`);
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'Failed to start payment process');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError("");

    try {
      // Create membership application
      const orgName = membershipType === 'individual' ? personalName : organizationName;
      let logoUrl = '';
      
      if (logoFile) {
        try {
          const uploadResult = await uploadMemberLogo(logoFile, orgName);
          logoUrl = uploadResult.downloadURL;
        } catch (uploadError) {
          console.warn('Logo upload failed, continuing without logo:', uploadError);
          // Continue without logo - this is not a blocking error
        }
      }
      
      // Update the account document with membership information
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db, auth } = await import('@/lib/firebase');
      
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      const accountRef = doc(db, 'accounts', auth.currentUser.uid);
      await updateDoc(accountRef, {
        status: 'pending_payment',
        membershipType,
        organizationName: orgName,
        organizationType: membershipType === 'individual' ? 'individual' : organizationType,
        primaryContact: {
          name: primaryContactName,
          email: primaryContactEmail,
          phone: primaryContactPhone,
          jobTitle: primaryContactJobTitle
        },
        registeredAddress: {
          line1: addressLine1,
          line2: addressLine2,
          city,
          state,
          postalCode,
          country: country === 'OTHER' ? customCountry : country
        },
        ...(membershipType === 'corporate' && organizationType === 'MGA' && {
          portfolio: {
            grossWrittenPremiums,
            portfolioMix: Object.keys(portfolioMix).length > 0 ? portfolioMix : undefined
          }
        }),
        hasOtherAssociations: hasOtherAssociations ?? false,
        otherAssociations: hasOtherAssociations ? otherAssociations : [],
        logoUrl: logoUrl || null,
        updatedAt: serverTimestamp()
      });
      
      setStep(4); // Go to payment step
      
    } catch (error: any) {
      setError(handleAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerificationCode = async () => {
    try {
      await sendVerificationCode(email);
      setEmailVerificationSent(true);
      setError("");
    } catch (error: any) {
      setError(error.message || "Failed to send verification code");
    }
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
        setIsEmailVerified(true);
        setShowEmailVerification(false);
        
        // Now proceed with creating the membership application
        await continueWithMembershipApplication();
      } else {
        setError("Invalid verification code");
      }
    } catch (error: any) {
      setError(error.message || "Failed to verify code");
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const continueWithMembershipApplication = async () => {
    try {
      setLoading(true);
      
      // Continue to step 2 after email verification
      setShowEmailVerification(false);
      setStep(2);
      setError("");
      setAttemptedNext(false);
      
    } catch (error: any) {
      setError(handleAuthError(error));
    } finally {
      setLoading(false);
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
            We&apos;ve sent a 6-digit code to: <strong>{email}</strong>
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
          >
            Resend Code
          </Button>
          
          <p className="text-xs text-fase-black text-center">
            Code expires in 5 minutes
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
          Please check your email to verify your account, then sign in to access your member portal.
        </p>
        
        <div className="space-y-3">
          <Button 
            variant="primary" 
            size="large" 
            className="w-full"
            onClick={() => window.location.href = '/login'}
          >
            Continue to Sign In
          </Button>
        </div>
        
        <p className="text-xs text-fase-black text-center mt-4">
          Check your spam folder if you do not see the verification email.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-12 h-1 ${step >= 2 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-12 h-1 ${step >= 3 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 3 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
          <div className={`w-12 h-1 ${step >= 4 ? 'bg-fase-navy' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 4 ? 'bg-fase-navy text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            4
          </div>
        </div>
      </div>

      {/* Step 1: Account Information */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Create Your Account</h3>
            <p className="text-fase-black text-sm">We&apos;ll create your account and membership application together</p>
          </div>

          <ValidatedInput
            label="Personal Name"
            fieldKey="personalName"
            value={personalName}
            onChange={setPersonalName}
            placeholder="Your full name"
            required
            touchedFields={touchedFields}
            attemptedNext={attemptedNext}
            markFieldTouched={markFieldTouched}
          />
          
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
      )}

      {/* Step 2: Membership Information */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Membership Information</h3>
            <p className="text-fase-black text-sm">Tell us about your organization</p>
          </div>

          {/* Membership Type Selection */}
          <div>
            <label className="block text-sm font-medium text-fase-navy mb-3">Membership Type *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  membershipType === 'individual' 
                    ? 'border-fase-navy bg-fase-light-blue' 
                    : 'border-fase-light-gold bg-white hover:border-fase-navy'
                }`}
                onClick={() => {
                  setMembershipType('individual');
                  setOrganizationName(personalName);
                  setPrimaryContactName(personalName);
                  setPrimaryContactEmail(email);
                }}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    membershipType === 'individual' ? 'border-fase-navy bg-fase-navy' : 'border-gray-300'
                  }`}>
                    {membershipType === 'individual' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <span className="font-medium text-fase-navy">Individual Membership</span>
                </div>
                <p className="text-sm text-fase-black ml-7">For individual professionals</p>
              </div>
              
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  membershipType === 'corporate' 
                    ? 'border-fase-navy bg-fase-light-blue' 
                    : 'border-fase-light-gold bg-white hover:border-fase-navy'
                }`}
                onClick={() => {
                  setMembershipType('corporate');
                  setOrganizationName('');
                  setPrimaryContactName('');
                  setPrimaryContactEmail('');
                }}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    membershipType === 'corporate' ? 'border-fase-navy bg-fase-navy' : 'border-gray-300'
                  }`}>
                    {membershipType === 'corporate' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <span className="font-medium text-fase-navy">Corporate Membership</span>
                </div>
                <p className="text-sm text-fase-black ml-7">For organizations</p>
              </div>
            </div>
          </div>

          {/* Organization Information */}
          {membershipType === 'corporate' && (
            <>
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

              <ValidatedSelect
                label="Organization Type"
                fieldKey="organizationType"
                value={organizationType}
                onChange={setOrganizationType}
                options={organizationTypeOptions}
                required
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            </>
          )}

          {/* Primary Contact */}
          <div className="space-y-4">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Primary Contact</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                label="Contact Name"
                fieldKey="primaryContactName"
                value={primaryContactName}
                onChange={setPrimaryContactName}
                placeholder="Full name"
                required
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <ValidatedInput
                label="Job Title"
                fieldKey="primaryContactJobTitle"
                value={primaryContactJobTitle}
                onChange={setPrimaryContactJobTitle}
                placeholder="Position or title"
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                label="Email"
                fieldKey="primaryContactEmail"
                type="email"
                value={primaryContactEmail}
                onChange={setPrimaryContactEmail}
                placeholder="contact@company.com"
                required
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <ValidatedInput
                label="Phone"
                fieldKey="primaryContactPhone"
                type="tel"
                value={primaryContactPhone}
                onChange={setPrimaryContactPhone}
                placeholder="+44 20 1234 5678"
                required
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            </div>
          </div>
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
          <div className="space-y-4">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">
              {membershipType === 'individual' ? 'Personal Address' : 'Registered Address'}
            </h4>
            
            <ValidatedInput
              label="Address Line 1"
              fieldKey="addressLine1"
              value={addressLine1}
              onChange={setAddressLine1}
              placeholder="Street address"
              required
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
            />
            
            <ValidatedInput
              label="Address Line 2"
              fieldKey="addressLine2"
              value={addressLine2}
              onChange={setAddressLine2}
              placeholder="Apartment, suite, etc. (optional)"
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ValidatedInput
                label="City"
                fieldKey="city"
                value={city}
                onChange={setCity}
                placeholder="City"
                required
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <ValidatedInput
                label="State/Province"
                fieldKey="state"
                value={state}
                onChange={setState}
                placeholder="State or province"
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <ValidatedInput
                label="Postal Code"
                fieldKey="postalCode"
                value={postalCode}
                onChange={setPostalCode}
                placeholder="Postal code"
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            </div>
            
            <ValidatedSelect
              label="Country"
              fieldKey="country"
              value={country}
              onChange={setCountry}
              options={countryOptions}
              required
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
            />
            
            {country === 'OTHER' && (
              <ValidatedInput
                label="Specify Country"
                fieldKey="customCountry"
                value={customCountry}
                onChange={setCustomCountry}
                placeholder="Enter country name"
                required
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            )}
          </div>

          {/* Portfolio Information for MGAs */}
          {membershipType === 'corporate' && organizationType === 'MGA' && (
            <div className="space-y-4">
              <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Portfolio Information</h4>
              
              <ValidatedSelect
                label="Gross Written Premiums"
                fieldKey="grossWrittenPremiums"
                value={grossWrittenPremiums}
                onChange={setGrossWrittenPremiums}
                options={grossWrittenPremiumsOptions}
                required
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-3">
                  Portfolio Mix (Optional) - Specify percentage for each line of business
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {portfolioMixLines.map((line) => (
                    <div key={line}>
                      <label className="block text-xs text-fase-black mb-1">{line}</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={portfolioMix[line] || ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setPortfolioMix(prev => {
                              const newMix = { ...prev };
                              if (value > 0) {
                                newMix[line] = value;
                              } else {
                                delete newMix[line];
                              }
                              return newMix;
                            });
                          }}
                          className="w-full px-2 py-1 border border-fase-light-gold rounded text-sm focus:outline-none focus:ring-1 focus:ring-fase-navy focus:border-transparent"
                          placeholder="0"
                        />
                        <span className="ml-1 text-xs text-fase-black">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Additional Questions */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-3">
                Is your organization a member of other European MGA associations? *
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setHasOtherAssociations(true);
                  }}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    hasOtherAssociations === true
                      ? 'bg-fase-navy text-white border-fase-navy'
                      : 'bg-white text-fase-black border-fase-light-gold hover:border-fase-navy'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasOtherAssociations(false);
                    setOtherAssociations([]);
                  }}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    hasOtherAssociations === false
                      ? 'bg-fase-navy text-white border-fase-navy'
                      : 'bg-white text-fase-black border-fase-light-gold hover:border-fase-navy'
                  }`}
                >
                  No
                </button>
              </div>

              {hasOtherAssociations && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    Select associations you are a member of *
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'ASASE', label: 'ASASE' },
                      { value: 'AIMGA', label: 'AIMGA' },
                      { value: 'BAUA', label: 'BAUA' },
                      { value: 'MGAA', label: 'MGAA' },
                      { value: 'NVGA', label: 'NVGA' }
                    ].map((association) => (
                      <label key={association.value} className="flex items-center">
                        <input
                          type="checkbox"
                          value={association.value}
                          checked={otherAssociations.includes(association.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOtherAssociations([...otherAssociations, association.value]);
                            } else {
                              setOtherAssociations(otherAssociations.filter(a => a !== association.value));
                            }
                          }}
                          className="mr-2 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                        />
                        <span className="text-sm text-fase-black">{association.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-3">
                Organization Logo (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      validateLogoFile(file);
                      setLogoFile(file);
                      setError('');
                    } catch (error: any) {
                      setError(error.message || 'Invalid file');
                      setLogoFile(null);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
              <p className="text-xs text-fase-black mt-1">
                PNG, JPG, or SVG. Max 5MB. Recommended: 200x200px or larger.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Payment */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Complete Your Membership</h3>
            <p className="text-fase-black text-sm">Review and pay for your FASE membership</p>
          </div>

          {/* Membership Summary */}
          <div className="bg-fase-light-blue rounded-lg p-6 space-y-4">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Membership Summary</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-fase-black font-medium">Organization:</span>
                <p className="text-fase-black">{membershipType === 'individual' ? personalName : organizationName}</p>
              </div>
              
              <div>
                <span className="text-fase-black font-medium">Membership Type:</span>
                <p className="text-fase-black">
                  {membershipType === 'individual' 
                    ? 'Individual' 
                    : `${organizationType} Corporate`
                  }
                </p>
              </div>
              
              <div>
                <span className="text-fase-black font-medium">Contact Email:</span>
                <p className="text-fase-black">{primaryContactEmail}</p>
              </div>
              
              <div>
                <span className="text-fase-black font-medium">Country:</span>
                <p className="text-fase-black">{country === 'OTHER' ? customCountry : country}</p>
              </div>
              
              {membershipType === 'corporate' && organizationType === 'MGA' && grossWrittenPremiums && (
                <div className="md:col-span-2">
                  <span className="text-fase-black font-medium">Gross Written Premiums:</span>
                  <p className="text-fase-black">{grossWrittenPremiums}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg border border-fase-light-gold p-6">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Annual Membership Fee</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-fase-black">Base Fee</span>
                <span className="text-fase-black">€{calculateMembershipFee()}</span>
              </div>
              
              {membershipType === 'corporate' && hasOtherAssociations && (
                <div className="flex justify-between items-center text-green-600">
                  <span>Member Discount (20%)</span>
                  <span>-€{calculateMembershipFee() - getDiscountedFee()}</span>
                </div>
              )}
              
              <div className="border-t border-fase-light-gold pt-2 mt-2">
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span className="text-fase-navy">Total Annual Fee</span>
                  <span className="text-fase-navy">€{getDiscountedFee()}</span>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-fase-black mt-4">
              * Membership fee is billed annually. You can cancel at any time.
              {membershipType === 'corporate' && hasOtherAssociations && (
                <>* 20% discount applied for members of other European MGA associations.</>
              )}
            </p>
          </div>

          {/* Payment Button */}
          <div className="text-center">
            <Button
              type="button"
              variant="primary"
              size="large"
              onClick={handlePayment}
              disabled={processingPayment}
              className="w-full"
            >
              {processingPayment ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "Complete Payment"
              )}
            </Button>
            
            <p className="text-xs text-fase-black mt-3">
              Secure payment powered by Stripe. You&apos;ll be redirected to complete your payment.
            </p>
          </div>
        </div>
      )}

      {(error || paymentError) && (
        <div className="text-red-600 text-sm">{error || paymentError}</div>
      )}

      {/* Navigation Buttons */}
      {step < 4 && (
        <div className="flex justify-between pt-6">
          {step > 1 ? (
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
          
          {step < 3 ? (
            <Button 
              type="button"
              variant="primary" 
              onClick={handleNext}
            >
              Next
            </Button>
          ) : step === 3 ? (
            <Button 
              type="button"
              variant="primary" 
              onClick={async () => {
                setAttemptedNext(true);
                
                // Validate fields before creating membership application
                if (!addressLine1.trim() || !city.trim() || !country) {
                  setError("Address information is required");
                  return;
                }
                
                if (country === 'OTHER' && !customCountry.trim()) {
                  setError("Please specify your country");
                  return;
                }
                
                if (membershipType === 'corporate' && organizationType === 'MGA' && !grossWrittenPremiums) {
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

                await handleSubmit();
                setAttemptedNext(false);
              }}
              disabled={loading}
            >
              {loading ? "Processing..." : "Continue"}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}