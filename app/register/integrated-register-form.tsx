'use client';

import { useState, useEffect } from "react";
import { sendVerificationCode, verifyCode } from "../../lib/auth";
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
        } ${props.disabled ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`}
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
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
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
  
  // NEW: Company-first structure fields
  const [registrantRole, setRegistrantRole] = useState<'primary_contact' | 'other_member'>('primary_contact');
  const [registrantJobTitle, setRegistrantJobTitle] = useState("");
  
  // Auto-fill primary contact when user selects "I am the primary contact"
  useEffect(() => {
    if (registrantRole === 'primary_contact') {
      const fullName = `${firstName} ${surname}`.trim();
      setPrimaryContactName(fullName);
      setPrimaryContactEmail(email);
      setPrimaryContactJobTitle(registrantJobTitle);
      // Note: Phone is not available from personal info, user must enter it
    }
  }, [registrantRole, firstName, surname, email, registrantJobTitle]);
  
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
  const [gwpCurrency, setGwpCurrency] = useState("EUR");
  const [principalLines, setPrincipalLines] = useState('');
  const [additionalLines, setAdditionalLines] = useState('');
  const [targetClients, setTargetClients] = useState('');
  const [currentMarkets, setCurrentMarkets] = useState('');
  const [plannedMarkets, setPlannedMarkets] = useState('');
  
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
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'invoice'>('stripe');
  
  // Email verification state for after account creation
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [pendingPaymentAction, setPendingPaymentAction] = useState<'stripe' | 'invoice' | null>(null);


  const markFieldTouched = (fieldKey: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldKey]: true }));
  };

  const organizationTypeOptions = [
    { value: 'MGA', label: 'Managing General Agent (MGA)' },
    { value: 'carrier', label: 'Insurance Carrier' },
    { value: 'provider', label: 'Service Provider' }
  ];

  // Currency conversion rates (approximate modern rates)
  const currencyRates = {
    EUR: 1.0,
    GBP: 1.17, // 1 GBP ≈ 1.17 EUR
    USD: 0.92  // 1 USD ≈ 0.92 EUR
  };

  // Helper function to convert currency to EUR
  const convertToEUR = (value: number, currency: string): number => {
    const rate = currencyRates[currency as keyof typeof currencyRates] || 1;
    return value * rate;
  };

  // Helper function to determine GWP band from EUR value
  const getGWPBand = (eurValue: number): '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+' => {
    if (eurValue < 10) return '<10m';
    if (eurValue < 20) return '10-20m';
    if (eurValue < 50) return '20-50m';
    if (eurValue < 100) return '50-100m';
    if (eurValue < 500) return '100-500m';
    return '500m+';
  };

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


  const handleNext = async () => {
    setAttemptedNext(true);
    
    if (step === 1) {
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
        setLoading(true);
        
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
        setLoading(false);
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
      const gwpValue = parseFloat(grossWrittenPremiums);
      if (isNaN(gwpValue)) return 900; // Default if invalid input
      
      // Convert to EUR for band calculation
      const eurValue = convertToEUR(gwpValue, gwpCurrency);
      const band = getGWPBand(eurValue);
      
      switch (band) {
        case '<10m': return 900;
        case '10-20m': return 1500;
        case '20-50m': return 2200;  // Updated from 2000
        case '50-100m': return 2800;
        case '100-500m': return 4200;
        case '500m+': return 7000;   // Updated from 6400
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

  const checkDomainExists = async (emailAddress: string): Promise<boolean> => {
    try {
      const domain = emailAddress.split('@')[1]?.toLowerCase();
      if (!domain) return false;

      // Whitelist of common personal email domains that should be exempt from domain checks
      const personalEmailDomains = [
        'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de',
        'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.it',
        'outlook.com', 'outlook.co.uk', 'outlook.fr', 'outlook.de', 'outlook.it',
        'live.com', 'live.co.uk', 'live.fr', 'live.de', 'live.it',
        'msn.com', 'icloud.com', 'me.com', 'mac.com',
        'aol.com', 'aol.co.uk', 'protonmail.com', 'proton.me',
        'tutanota.com', 'mail.com', 'gmx.com', 'gmx.de', 'gmx.net',
        'web.de', 'freenet.de', 't-online.de',
        'orange.fr', 'laposte.net', 'free.fr', 'sfr.fr',
        'libero.it', 'virgilio.it', 'alice.it',
        'terra.com.br', 'bol.com.br', 'uol.com.br', 'globo.com',
        'qq.com', '163.com', '126.com', 'sina.com',
        'mail.ru', 'yandex.ru', 'rambler.ru',
        'rediffmail.com', 'sify.com', 'indiatimes.com'
      ];

      // If it's a personal email domain, skip the domain check
      if (personalEmailDomains.includes(domain)) {
        return false;
      }

      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      // Check accounts collection for any email with the same domain
      const accountsRef = collection(db, 'accounts');
      const accountsQuery = query(accountsRef);
      const accountsSnapshot = await getDocs(accountsQuery);

      // Check if any account has an email with the same domain
      for (const doc of accountsSnapshot.docs) {
        const data = doc.data();
        if (data.email) {
          const existingDomain = data.email.split('@')[1]?.toLowerCase();
          if (existingDomain === domain) {
            return true;
          }
        }
      }

      // Also check company members subcollections
      for (const accountDoc of accountsSnapshot.docs) {
        const data = accountDoc.data();
        if (data.isCompanyAccount) {
          try {
            const membersRef = collection(db, 'accounts', accountDoc.id, 'members');
            const membersSnapshot = await getDocs(membersRef);
            
            for (const memberDoc of membersSnapshot.docs) {
              const memberData = memberDoc.data();
              if (memberData.email) {
                const memberDomain = memberData.email.split('@')[1]?.toLowerCase();
                if (memberDomain === domain) {
                  return true;
                }
              }
            }
          } catch (error) {
            // Continue if we can't access members subcollection
            console.warn('Could not check members for company:', accountDoc.id);
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking domain existence:', error);
      // If we can't check, allow the registration to proceed
      return false;
    }
  };

  const createAccountAndMembership = async (status: 'pending_payment' | 'pending_invoice') => {
    setLoading(true);
    setError("");

    let userToCleanup: any = null;

    try {
      // Check if domain already exists before creating account
      const domainExists = await checkDomainExists(email);
      if (domainExists) {
        throw new Error('An organization with this email domain is already registered. Please contact us if you believe this is an error.');
      }
      // Step 1: Prepare all data first (including logo upload) before any account creation
      let logoUrl = '';
      if (logoFile) {
        try {
          // Create clean identifier for logo filename
          const fullName = `${firstName} ${surname}`.trim();
          const cleanOrgName = (membershipType === 'corporate' ? organizationName : fullName)
            .toLowerCase().replace(/[^a-z0-9]/g, '_');
          
          // Use direct Firebase Storage upload
          const uploadResult = await uploadMemberLogo(logoFile, cleanOrgName);
          logoUrl = uploadResult.downloadURL;
        } catch (uploadError) {
          console.warn('Logo upload failed, continuing without logo:', uploadError);
          // Continue without logo - this is not a blocking error
        }
      }

      // Step 2: Create Firebase Auth account
      const { createUserWithEmailAndPassword, updateProfile, deleteUser } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      userToCleanup = user; // Store for potential cleanup
      
      // Create display name
      const fullName = `${firstName} ${surname}`.trim();
      const orgForAuth = membershipType === 'corporate' ? organizationName : undefined;
      const displayName = orgForAuth && orgForAuth.trim()
        ? `${fullName} (${orgForAuth})`
        : fullName;
      
      await updateProfile(user, { displayName });

      // Step 3: Create Firestore documents - if this fails, we'll clean up the auth account
      try {
        if (membershipType === 'corporate') {
          // Use company-first structure with client-side Firestore
          const { doc: firestoreDoc, setDoc, serverTimestamp, writeBatch } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          // Generate a unique company ID
          const companyId = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Use a batch write to ensure atomicity of company + member creation
          const batch = writeBatch(db);
          
          // Prepare company document
          const companyRef = firestoreDoc(db, 'accounts', companyId);
          const companyRecord = {
            id: companyId,
            email: user.email,
            displayName: organizationName,
            status,
            personalName: '', // Empty for company accounts
            isCompanyAccount: true,
            primaryContactMemberId: user.uid,
            paymentUserId: user.uid, // For webhook payment processing
            membershipType: 'corporate' as const,
            organizationName,
            organizationType: organizationType as 'MGA' | 'carrier' | 'provider',
            primaryContact: {
              name: primaryContactName,
              email: primaryContactEmail,
              phone: primaryContactPhone,
              role: primaryContactJobTitle
            },
            registeredAddress: {
              line1: addressLine1,
              line2: addressLine2,
              city,
              county: state,
              postcode: postalCode,
              country: country === 'OTHER' ? customCountry : country
            },
            ...(organizationType === 'MGA' && {
              portfolio: {
                grossWrittenPremiums: getGWPBand(convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency)),
                grossWrittenPremiumsValue: parseFloat(grossWrittenPremiums) || 0,
                grossWrittenPremiumsCurrency: gwpCurrency,
                grossWrittenPremiumsEUR: convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency),
                principalLines: principalLines.trim(),
                additionalLines: additionalLines.trim(),
                targetClients: targetClients.trim(),
                currentMarkets: currentMarkets.trim(),
                plannedMarkets: plannedMarkets.trim()
              }
            }),
            hasOtherAssociations: hasOtherAssociations ?? false,
            otherAssociations: hasOtherAssociations ? otherAssociations : [],
            logoUrl: logoUrl || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          batch.set(companyRef, companyRecord);
          
          // Prepare member document
          const memberRef = firestoreDoc(db, 'accounts', companyId, 'members', user.uid);
          const memberRecord = {
            id: user.uid,
            email: user.email!,
            personalName: fullName,
            jobTitle: registrantJobTitle,
            isPrimaryContact: registrantRole === 'primary_contact',
            joinedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          batch.set(memberRef, memberRecord);
          
          // Commit the batch atomically
          await batch.commit();
          
        } else {
          // Traditional individual membership
          const { doc: firestoreDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          const accountRef = firestoreDoc(db, 'accounts', user.uid);
          
          const dataToWrite = {
            email: user.email,
            displayName: user.displayName,
            status,
            membershipType,
            personalName: fullName,
            organizationName: fullName,
            paymentUserId: user.uid, // For webhook payment processing
            primaryContact: {
              name: primaryContactName,
              email: primaryContactEmail,
              phone: primaryContactPhone,
              role: primaryContactJobTitle
            },
            registeredAddress: {
              line1: addressLine1,
              line2: addressLine2,
              city,
              county: state,
              postcode: postalCode,
              country: country === 'OTHER' ? customCountry : country
            },
            hasOtherAssociations: hasOtherAssociations ?? false,
            otherAssociations: hasOtherAssociations ? otherAssociations : [],
            logoUrl: logoUrl || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          await setDoc(accountRef, dataToWrite);
        }
        
        // If we reach here, both auth and firestore succeeded
        userToCleanup = null; // Don't clean up on success
        
      } catch (firestoreError) {
        // Firestore failed after auth succeeded - clean up auth account
        console.error('Firestore operation failed, cleaning up auth account:', firestoreError);
        
        if (userToCleanup) {
          try {
            await deleteUser(userToCleanup);
            console.log('Successfully cleaned up orphaned auth account');
          } catch (cleanupError) {
            console.error('Failed to clean up auth account:', cleanupError);
            // Continue with the original error
          }
        }
        
        throw firestoreError;
      }
      
    } catch (error: any) {
      // Check for network/connection errors that might be caused by ad blockers
      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
          error.message?.includes('network') || 
          error.code === 'unavailable') {
        setError("Connection blocked. Please disable any ad blockers or try using a different browser.");
      } else {
        setError(handleAuthError(error));
      }
      throw error;
    } finally {
      setLoading(false);
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
        setShowEmailVerification(false);
        
        // If this is after Step 1, continue to Step 2
        if (!pendingPaymentAction) {
          setStep(2);
        } else {
          // This is after payment - continue with the pending payment action
          if (pendingPaymentAction === 'stripe') {
            await continueWithStripePayment();
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

  const continueWithStripePayment = async () => {
    try {
      const { auth } = await import('@/lib/firebase');
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Create Stripe checkout session
      const fullName = `${firstName} ${surname}`.trim();
      const orgName = membershipType === 'individual' ? fullName : organizationName;
      const response = await fetch('/api/create-checkout-session', {
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
    }
  };

  const handleSendVerificationCode = async () => {
    try {
      await sendVerificationCode(email);
      setError("");
    } catch (error: any) {
      setError(error.message || "Failed to send verification code");
    }
  };

  const handlePayment = async () => {
    if (processingPayment) return;
    
    setProcessingPayment(true);
    setPaymentError("");

    try {
      // Create the account and membership record
      await createAccountAndMembership('pending_payment');
      
      // Go directly to Stripe payment (email already verified)
      await continueWithStripePayment();
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'Failed to start payment process');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleInvoiceRequest = async () => {
    if (processingPayment) return;
    
    setProcessingPayment(true);
    setPaymentError("");

    try {
      // Create the account with 'pending_invoice' status
      await createAccountAndMembership('pending_invoice');
      
      // Generate and send invoice
      try {
        const { auth } = await import('@/lib/firebase');
        if (auth.currentUser) {
          const fullName = `${firstName} ${surname}`.trim();
          const response = await fetch('/api/generate-invoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: auth.currentUser.uid,
              userEmail: email,
              membershipData: {
                membershipType,
                organizationName: membershipType === 'corporate' ? organizationName : fullName,
                organizationType: membershipType === 'corporate' ? organizationType : 'individual',
                grossWrittenPremiums: membershipType === 'corporate' && organizationType === 'MGA' ? getGWPBand(convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency)) : undefined,
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
                hasOtherAssociations
              }
            }),
          });
          
          if (!response.ok) {
            console.warn('Failed to generate invoice:', response.statusText);
          }
        }
      } catch (invoiceError) {
        console.warn('Failed to generate/send invoice:', invoiceError);
        // Don't block the registration process if invoice fails
      }
      
      // Go directly to success (email already verified)
      setRegistrationComplete(true);
      
    } catch (error: any) {
      console.error('Invoice request error:', error);
      setPaymentError(error.message || 'Failed to process invoice request');
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
      // Handle logo upload first
      let logoUrl = '';
      if (logoFile) {
        try {
          // Create clean identifier for logo filename
          const fullName = `${firstName} ${surname}`.trim();
          const cleanOrgName = (membershipType === 'corporate' ? organizationName : fullName)
            .toLowerCase().replace(/[^a-z0-9]/g, '_');
          
          // Use direct Firebase Storage upload
          const uploadResult = await uploadMemberLogo(logoFile, cleanOrgName);
          logoUrl = uploadResult.downloadURL;
        } catch (uploadError) {
          console.warn('Logo upload failed, continuing without logo:', uploadError);
          // Continue without logo - this is not a blocking error
        }
      }
      
      const { auth } = await import('@/lib/firebase');
      
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Handle company-first vs traditional structure
      if (membershipType === 'corporate') {
        // Use company-first structure with atomic batch write
        const { doc: firestoreDoc, setDoc, serverTimestamp, writeBatch } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        // Generate a unique company ID
        const companyId = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Use a batch write to ensure atomicity of company + member creation
        const batch = writeBatch(db);
        
        // Prepare company document
        const companyRef = firestoreDoc(db, 'accounts', companyId);
        const companyRecord = {
          id: companyId,
          email: auth.currentUser.email,
          displayName: organizationName,
          status: 'pending_payment',
          personalName: '', // Empty for company accounts
          isCompanyAccount: true,
          primaryContactMemberId: auth.currentUser.uid,
          paymentUserId: auth.currentUser.uid, // For webhook payment processing
          membershipType: 'corporate' as const,
          organizationName,
          organizationType: organizationType as 'MGA' | 'carrier' | 'provider',
          primaryContact: {
            name: primaryContactName,
            email: primaryContactEmail,
            phone: primaryContactPhone,
            role: primaryContactJobTitle
          },
          registeredAddress: {
            line1: addressLine1,
            line2: addressLine2,
            city,
            county: state,
            postcode: postalCode,
            country: country === 'OTHER' ? customCountry : country
          },
          ...(organizationType === 'MGA' && {
            portfolio: {
              grossWrittenPremiums: getGWPBand(convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency)),
              grossWrittenPremiumsValue: parseFloat(grossWrittenPremiums) || 0,
              grossWrittenPremiumsCurrency: gwpCurrency,
              grossWrittenPremiumsEUR: convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency),
              principalLines: principalLines.trim(),
              additionalLines: additionalLines.trim(),
              targetClients: targetClients.trim(),
              currentMarkets: currentMarkets.trim(),
              plannedMarkets: plannedMarkets.trim()
            }
          }),
          hasOtherAssociations: hasOtherAssociations ?? false,
          otherAssociations: hasOtherAssociations ? otherAssociations : [],
          logoUrl: logoUrl || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        batch.set(companyRef, companyRecord);
        
        // Prepare member document
        const memberRef = firestoreDoc(db, 'accounts', companyId, 'members', auth.currentUser.uid);
        const fullName = `${firstName} ${surname}`.trim();
        const memberRecord = {
          id: auth.currentUser.uid,
          email: auth.currentUser.email!,
          personalName: fullName,
          jobTitle: registrantJobTitle,
          isPrimaryContact: registrantRole === 'primary_contact',
          joinedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        batch.set(memberRef, memberRecord);
        
        // Commit the batch atomically
        await batch.commit();
        
      } else {
        // Traditional individual membership - use merge to update existing document
        const { doc: firestoreDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const accountRef = firestoreDoc(db, 'accounts', auth.currentUser.uid);
        
        const fullName = `${firstName} ${surname}`.trim();
        const dataToWrite = {
          // Keep existing fields and add new ones
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          status: 'pending_payment',
          membershipType,
          personalName: fullName,
          organizationName: fullName,
          paymentUserId: auth.currentUser.uid, // For webhook payment processing
          primaryContact: {
            name: primaryContactName,
            email: primaryContactEmail,
            phone: primaryContactPhone,
            role: primaryContactJobTitle
          },
          registeredAddress: {
            line1: addressLine1,
            line2: addressLine2,
            city,
            county: state,
            postcode: postalCode,
            country: country === 'OTHER' ? customCountry : country
          },
          hasOtherAssociations: hasOtherAssociations ?? false,
          otherAssociations: hasOtherAssociations ? otherAssociations : [],
          logoUrl: logoUrl || null,
          updatedAt: serverTimestamp()
        };
        
        await setDoc(accountRef, dataToWrite, { merge: true });
      }
      
      setStep(4); // Go to payment step
      
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
            onClick={() => window.location.href = '/login'}
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
                  const fullName = `${firstName} ${surname}`.trim();
                  setOrganizationName(fullName);
                  setPrimaryContactName(fullName);
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
                <p className="text-sm text-fase-black ml-7">For organizations (you&apos;ll create the company account)</p>
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

          {/* NEW: Your Role Section */}
          {membershipType === 'corporate' && (
            <div className="space-y-4">
              <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Your Role</h4>
              <p className="text-sm text-fase-black">
                What is your role in this organization?
              </p>
              
              <div className="space-y-3">
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    registrantRole === 'primary_contact' 
                      ? 'border-fase-navy bg-fase-light-blue' 
                      : 'border-fase-light-gold bg-white hover:border-fase-navy'
                  }`}
                  onClick={() => {
                    setRegistrantRole('primary_contact');
                  }}
                >
                  <div className="flex items-center mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      registrantRole === 'primary_contact' ? 'border-fase-navy bg-fase-navy' : 'border-gray-300'
                    }`}>
                      {registrantRole === 'primary_contact' && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <span className="font-medium text-fase-navy">I am the primary contact</span>
                  </div>
                  <p className="text-sm text-fase-black ml-7">You will be the main contact for this organization</p>
                </div>
                
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    registrantRole === 'other_member' 
                      ? 'border-fase-navy bg-fase-light-blue' 
                      : 'border-fase-light-gold bg-white hover:border-fase-navy'
                  }`}
                  onClick={() => {
                    setRegistrantRole('other_member');
                    // Clear auto-filled primary contact info
                    setPrimaryContactName('');
                    setPrimaryContactEmail('');
                  }}
                >
                  <div className="flex items-center mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      registrantRole === 'other_member' ? 'border-fase-navy bg-fase-navy' : 'border-gray-300'
                    }`}>
                      {registrantRole === 'other_member' && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                      )}
                    </div>
                    <span className="font-medium text-fase-navy">Someone else is the primary contact</span>
                  </div>
                  <p className="text-sm text-fase-black ml-7">You&apos;ll provide the primary contact&apos;s details</p>
                </div>
              </div>
              
              <ValidatedInput
                label="Your Job Title"
                fieldKey="registrantJobTitle"
                value={registrantJobTitle}
                onChange={setRegistrantJobTitle}
                placeholder="e.g. CEO, Operations Manager, Underwriter"
                required
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            </div>
          )}

          {/* Primary Contact */}
          <div className="space-y-4">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">
              {membershipType === 'corporate' ? 'Primary Contact' : 'Primary Contact'}
            </h4>
            {membershipType === 'corporate' && registrantRole === 'primary_contact' && (
              <p className="text-sm text-fase-black">
                Name, email, and job title are auto-filled since you selected &quot;I am the primary contact&quot;. Please enter your phone number.
              </p>
            )}
            {membershipType === 'corporate' && registrantRole === 'other_member' && (
              <p className="text-sm text-fase-black">
                Please provide the details of the person who should be the main contact for this organization.
              </p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                label="Contact Name"
                fieldKey="primaryContactName"
                value={primaryContactName}
                onChange={setPrimaryContactName}
                placeholder="Full name"
                required
                disabled={registrantRole === 'primary_contact'}
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
                disabled={registrantRole === 'primary_contact'}
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
                disabled={registrantRole === 'primary_contact'}
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
              
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Gross Written Premiums (millions) *
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={grossWrittenPremiums}
                      onChange={(e) => {
                        setGrossWrittenPremiums(e.target.value);
                        markFieldTouched('grossWrittenPremiums');
                      }}
                      onBlur={() => markFieldTouched('grossWrittenPremiums')}
                      placeholder="e.g. 25.5"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
                        touchedFields.grossWrittenPremiums || attemptedNext
                          ? grossWrittenPremiums.trim() === '' ? 'border-red-300' : 'border-fase-light-gold'
                          : 'border-fase-light-gold'
                      }`}
                    />
                  </div>
                  <div className="w-24">
                    <select
                      value={gwpCurrency}
                      onChange={(e) => setGwpCurrency(e.target.value)}
                      className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    >
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-fase-black mt-1">
                  Enter your annual gross written premiums in millions of {gwpCurrency}.
                </p>
              </div>

              {/* Business Details Questions */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    1. Please list the principal lines of business you are currently underwriting?
                  </label>
                  <textarea
                    value={principalLines}
                    onChange={(e) => setPrincipalLines(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                    placeholder="Describe your current lines of business..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    2. Do you have current plans to write additional lines of business in the coming year? If so, please describe them?
                  </label>
                  <textarea
                    value={additionalLines}
                    onChange={(e) => setAdditionalLines(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                    placeholder="Describe any planned new lines of business..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    3. Please list, in as much detail as possible, your principal target client populations?
                  </label>
                  <textarea
                    value={targetClients}
                    onChange={(e) => setTargetClients(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                    placeholder="Describe your target client populations in detail..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    4. Please list the national market[s] in which you currently do business?
                  </label>
                  <textarea
                    value={currentMarkets}
                    onChange={(e) => setCurrentMarkets(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                    placeholder="List the countries/markets where you currently operate..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    5. Do you have plans to write business in additional national markets in the coming year? If so where?
                  </label>
                  <textarea
                    value={plannedMarkets}
                    onChange={(e) => setPlannedMarkets(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                    placeholder="Describe any planned market expansion..."
                  />
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
          <div className="bg-white rounded-lg border border-fase-light-gold p-6 space-y-4">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Membership Summary</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-fase-navy font-medium">Organization:</span>
                <p className="text-fase-black">{membershipType === 'individual' ? `${firstName} ${surname}`.trim() : organizationName}</p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">Membership Type:</span>
                <p className="text-fase-black">
                  {membershipType === 'individual' 
                    ? 'Individual' 
                    : `${organizationType} Corporate`
                  }
                </p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">Contact Email:</span>
                <p className="text-fase-black">{primaryContactEmail}</p>
              </div>
              
              <div>
                <span className="text-fase-navy font-medium">Country:</span>
                <p className="text-fase-black">{country === 'OTHER' ? customCountry : country}</p>
              </div>
              
              {membershipType === 'corporate' && organizationType === 'MGA' && grossWrittenPremiums && (
                <div className="md:col-span-2">
                  <span className="text-fase-navy font-medium">Gross Written Premiums:</span>
                  <p className="text-fase-black">
                    {gwpCurrency} {parseFloat(grossWrittenPremiums).toFixed(1)} million
                  </p>
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

          {/* Payment Method Selection */}
          <div className="bg-white rounded-lg border border-fase-light-gold p-6">
            <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Payment Method</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'stripe' 
                    ? 'border-fase-navy bg-fase-light-blue' 
                    : 'border-fase-light-gold bg-white hover:border-fase-navy'
                }`}
                onClick={() => setPaymentMethod('stripe')}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    paymentMethod === 'stripe' ? 'border-fase-navy bg-fase-navy' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'stripe' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <span className="font-medium text-fase-navy">Pay Online</span>
                </div>
                <p className="text-sm text-fase-black ml-7">Secure payment via Stripe (Credit/Debit Card)</p>
              </div>
              
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'invoice' 
                    ? 'border-fase-navy bg-fase-light-blue' 
                    : 'border-fase-light-gold bg-white hover:border-fase-navy'
                }`}
                onClick={() => setPaymentMethod('invoice')}
              >
                <div className="flex items-center mb-2">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    paymentMethod === 'invoice' ? 'border-fase-navy bg-fase-navy' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'invoice' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <span className="font-medium text-fase-navy">Request Invoice</span>
                </div>
                <p className="text-sm text-fase-black ml-7">Pay later via bank transfer</p>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <div className="text-center">
            <Button
              type="button"
              variant="primary"
              size="large"
              onClick={paymentMethod === 'stripe' ? handlePayment : handleInvoiceRequest}
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
              ) : paymentMethod === 'stripe' ? (
                "Complete Payment"
              ) : (
                "Request Invoice"
              )}
            </Button>
            
            <p className="text-xs text-fase-black mt-3">
              {paymentMethod === 'stripe' 
                ? "Secure payment powered by Stripe. You'll be redirected to complete your payment."
                : "An invoice will be sent to your email address for payment via bank transfer."
              }
            </p>
          </div>
        </div>
      )}

      {(error || paymentError) && (
        <div className="text-red-600 text-sm">{error || paymentError}</div>
      )}

      {/* Navigation Buttons */}
      {step < 4 && (
        <div className="pt-6">
          <div className="flex justify-between">
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
                onClick={() => {
                  setAttemptedNext(true);
                  
                  // Validate fields before going to payment step
                  if (!addressLine1.trim() || !city.trim() || !country) {
                    setError("Address information is required");
                    return;
                  }
                  
                  if (country === 'OTHER' && !customCountry.trim()) {
                    setError("Please specify your country");
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

                  // All validated, go to payment step
                  setError("");
                  setStep(4);
                  setAttemptedNext(false);
                }}
              >
                Continue
              </Button>
            ) : null}
          </div>
          
          {/* Alternative Options - Only show on step 1 */}
          {step === 1 && (
            <div className="mt-8 text-center border-t border-fase-light-gold pt-6">
              <p className="text-sm text-fase-black mb-4">Already a member?</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a 
                  href="/login" 
                  className="inline-flex items-center justify-center px-4 py-2 border border-fase-navy text-sm font-medium rounded-md text-fase-navy bg-white hover:bg-fase-cream transition-colors duration-200"
                >
                  Sign in to existing account
                </a>
                <a 
                  href="/join-company" 
                  className="inline-flex items-center justify-center px-4 py-2 border border-fase-gold text-sm font-medium rounded-md text-fase-gold bg-white hover:bg-fase-light-blue transition-colors duration-200"
                >
                  Join existing company membership
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}