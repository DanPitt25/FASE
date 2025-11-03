'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { sendVerificationCode, verifyCode, submitApplication } from "../../lib/auth";
import Button from "../../components/Button";
import SearchableCountrySelect from "../../components/SearchableCountrySelect";
import { countries, europeanCountries } from "../../lib/countries";
import { handleAuthError } from "../../lib/auth-errors";
import { auth } from "../../lib/firebase";

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
  const [showPassword, setShowPassword] = useState(false);
  const isValid = value.trim() !== '';
  const shouldShowValidation = required && ((touchedFields[fieldKey] || attemptedNext) && !isValid);
  const isPasswordField = type === "password";
  const inputType = isPasswordField ? (showPassword ? "text" : "password") : type;
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-fase-navy mb-2">
          {label} {required && '*'}
        </label>
      )}
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            markFieldTouched(fieldKey);
          }}
          onBlur={() => markFieldTouched(fieldKey)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
            shouldShowValidation ? 'border-red-300' : 'border-fase-light-gold'
          } ${props.disabled ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''} ${
            isPasswordField ? 'pr-10' : ''
          }`}
          {...props}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-fase-navy hover:text-fase-gold transition-colors"
          >
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
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
  const [membershipType, setMembershipType] = useState<'individual' | 'corporate'>('corporate');
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState(typeFromUrl || "");
  // Corporate members management (up to 3 people)
  interface Member {
    id: string;
    firstName: string;
    lastName: string;
    name: string; // computed field for backward compatibility
    email: string;
    phone: string;
    jobTitle: string;
    isPrimaryContact: boolean;
  }
  
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
  const [currentMarketSelection, setCurrentMarketSelection] = useState('');
  
  // Other fields
  const [hasOtherAssociations, setHasOtherAssociations] = useState<boolean | null>(null);
  const [otherAssociations, setOtherAssociations] = useState<string[]>([]);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Helper function to calculate total GWP from magnitude inputs
  const calculateTotalGWP = () => {
    const billions = parseFloat(gwpBillions) || 0;
    const millions = parseFloat(gwpMillions) || 0;
    const thousands = parseFloat(gwpThousands) || 0;
    
    // Convert everything to millions for consistency with getGWPBand()
    const totalInMillions = billions * 1000 + millions + thousands / 1000;
    return totalInMillions;
  };
  
  // Update grossWrittenPremiums whenever magnitude inputs change
  useEffect(() => {
    const total = calculateTotalGWP();
    setGrossWrittenPremiums(total.toString());
  }, [gwpBillions, gwpMillions, gwpThousands]);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [step, setStep] = useState(typeFromUrl ? 0 : -1);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'invoice'>('paypal');
  
  // Email verification state for after account creation
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [pendingPaymentAction, setPendingPaymentAction] = useState<'paypal' | 'invoice' | null>(null);
  
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

  const organizationTypeOptions = [
    { value: 'MGA', label: 'Managing General Agent (MGA)' },
    { value: 'carrier', label: 'Insurance Carrier' },
    { value: 'provider', label: 'Service Provider' }
  ];

  // Lines of business options
  const linesOfBusinessOptions = [
    'Accident & Health',
    'Aviation',
    'Bloodstock',
    'Casualty',
    'Construction',
    'Cyber',
    'Energy',
    'Event Cancellation',
    'Fine Art & Specie',
    'Legal Expenses',
    'Life',
    'Livestock',
    'Marine',
    'Management Liability (D&O, EPLI etc)',
    'Motor, commercial',
    'Motor, personal lines',
    'Pet',
    'Political Risk',
    'Professional Indemnity / E&O',
    'Property, commercial',
    'Property, personal lines',
    'Surety',
    'Trade Credit',
    'Travel',
    'Warranty & Indemnity',
    'Other',
    'Other #2',
    'Other #3'
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

  // Helper functions for managing selections
  const toggleLineOfBusiness = (line: string) => {
    setSelectedLinesOfBusiness(prev => 
      prev.includes(line) 
        ? prev.filter(l => l !== line)
        : [...prev, line]
    );
  };

  const addMarket = (countryCode: string) => {
    if (countryCode && !selectedMarkets.includes(countryCode)) {
      setSelectedMarkets(prev => [...prev, countryCode]);
      setCurrentMarketSelection(''); // Reset the selection
    }
  };

  const removeMarket = (countryCode: string) => {
    setSelectedMarkets(prev => prev.filter(c => c !== countryCode));
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

  const calculateMembershipFee = () => {
    if (membershipType === 'individual') {
      return 500;
    } else if (membershipType === 'corporate' && organizationType === 'MGA') {
      const gwpValue = parseFloat(grossWrittenPremiums) || 0;
      if (gwpValue === 0) return 900; // Default if no GWP input
      
      // Convert to EUR for band calculation
      const eurValue = convertToEUR(gwpValue, gwpCurrency);
      const band = getGWPBand(eurValue);
      
      switch (band) {
        case '<10m': return 900;
        case '10-20m': return 1500;
        case '20-50m': return 2200;
        case '50-100m': return 2800;
        case '100-500m': return 4200;
        case '500m+': return 7000;
        default: return 900;
      }
    } else if (membershipType === 'corporate' && organizationType === 'carrier') {
      return 4000; // Flat rate for carriers
    } else if (membershipType === 'corporate' && organizationType === 'provider') {
      return 5000; // Flat rate for service providers
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

  const createAccountAndMembership = async (status: 'pending_payment' | 'pending_invoice' | 'pending') => {
    setLoading(true);
    setError("");

    let userToCleanup: any = null;

    try {
      // Check if domain already exists before creating account
      const domainExists = await checkDomainExists(email);
      if (domainExists) {
        throw new Error('An organization with this email domain is already registered. Please contact us if you believe this is an error.');
      }
      // Step 1: Create Firebase Auth account first (required for Storage permissions)
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
          
          // Use Firebase Auth UID as company ID (primary contact's UID)
          const companyId = user.uid;
          
          // Use a batch write to ensure atomicity of company + member creation
          const batch = writeBatch(db);
          
          // Find primary contact from members
          const primaryContactMember = members.find(m => m.isPrimaryContact);
          if (!primaryContactMember) {
            throw new Error("No account administrator designated");
          }
          
          // Prepare company document
          const companyRef = firestoreDoc(db, 'accounts', companyId);
          const companyRecord = {
            id: companyId,
            email: user.email,
            displayName: organizationName,
            status,
            personalName: '', // Empty for company accounts
            isCompanyAccount: true,
            accountAdministratorMemberId: user.uid,
            paymentUserId: user.uid, // For webhook payment processing
            membershipType: 'corporate' as const,
            organizationName,
            organizationType: organizationType as 'MGA' | 'carrier' | 'provider',
            accountAdministrator: {
              name: primaryContactMember.name,
              email: primaryContactMember.email,
              phone: primaryContactMember.phone,
              role: primaryContactMember.jobTitle
            },
            businessAddress: {
              line1: addressLine1,
              line2: addressLine2,
              city,
              county: state,
              postcode: postalCode,
              country: country
            },
            ...(organizationType === 'MGA' && {
              portfolio: {
                grossWrittenPremiums: getGWPBand(convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency)),
                grossWrittenPremiumsValue: parseFloat(grossWrittenPremiums) || 0,
                grossWrittenPremiumsCurrency: gwpCurrency,
                grossWrittenPremiumsEUR: convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency),
                linesOfBusiness: selectedLinesOfBusiness,
                otherLinesOfBusiness: {
                  other1: otherLineOfBusiness1.trim(),
                  other2: otherLineOfBusiness2.trim(),
                  other3: otherLineOfBusiness3.trim()
                },
                markets: selectedMarkets
              }
            }),
            hasOtherAssociations: hasOtherAssociations ?? false,
            otherAssociations: hasOtherAssociations ? otherAssociations : [],
            logoUrl: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          batch.set(companyRef, companyRecord);
          
          // Create member documents for all members
          for (const member of members) {
            // For the registrant (current user), use their Firebase UID
            // For other members, use generated IDs (they'll confirm accounts later)
            const memberId = member.id === 'registrant' ? user.uid : member.id;
            const memberRef = firestoreDoc(db, 'accounts', companyId, 'members', memberId);
            
            const memberRecord = {
              id: memberId,
              email: member.email,
              personalName: member.name,
              jobTitle: member.jobTitle,
              isAccountAdministrator: member.isPrimaryContact,
              isRegistrant: member.id === 'registrant',
              accountConfirmed: member.id === 'registrant', // Only registrant is confirmed initially
              joinedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            batch.set(memberRef, memberRecord);
          }
          
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
            accountAdministrator: {
              name: fullName,
              email: user.email!,
              phone: '', // Individual members don't need to provide phone during signup
              role: 'Individual Member'
            },
            businessAddress: {
              line1: addressLine1,
              line2: addressLine2,
              city,
              county: state,
              postcode: postalCode,
              country: country
            },
            hasOtherAssociations: hasOtherAssociations ?? false,
            otherAssociations: hasOtherAssociations ? otherAssociations : [],
            logoUrl: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          await setDoc(accountRef, dataToWrite);
        }
        
        // If we reach here, both auth and firestore succeeded
        userToCleanup = null; // Don't clean up on success
        
        // Create welcome message for new user (async, don't wait for completion)
        try {
          const { createWelcomeMessage } = await import('../../lib/unified-messaging');
          createWelcomeMessage(user.uid).catch(error => {
            console.error('Failed to create welcome message:', error);
          });
        } catch (error) {
          console.error('Failed to import welcome message function:', error);
        }
        
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
        console.error('PayPal API error:', response.status, errorText);
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
      console.error('Payment error:', error);
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

  const handlePayment = async () => {
    if (processingPayment) return;
    
    setProcessingPayment(true);
    setPaymentError("");

    try {
      // Create the account and membership record
      await createAccountAndMembership('pending_payment');
      
      // Go directly to PayPal payment (email already verified)
      await continueWithPayPalPayment();
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'Failed to start payment process');
    } finally {
      setProcessingPayment(false);
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
      console.log('Application submitted successfully:', result);

      // Create Firebase Auth account and Firestore record for the applicant
      await createAccountAndMembership('pending');

      // Store application data in sessionStorage for thank you page
      const applicantName = membershipType === 'individual' ? `${firstName} ${surname}`.trim() : organizationName;
      sessionStorage.setItem('applicationSubmission', JSON.stringify({
        applicationNumber: result.applicationNumber,
        applicantName: applicantName
      }));

      // Redirect to clean thank you page URL
      window.location.href = '/register/thank-you';

    } catch (error: any) {
      console.error('Application submission error:', error);
      setPaymentError(error.message || 'Failed to submit application');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleInvoiceRequest = async () => {
    if (processingPayment) return;
    
    setProcessingPayment(true);
    setPaymentError("");

    try {
      // First, generate PDF and send invoice using the API route (which does EVERYTHING)
      const { auth } = await import('@/lib/firebase');
      if (!auth.currentUser) {
        throw new Error('User must be authenticated');
      }

      const fullName = `${firstName} ${surname}`.trim();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          membershipData: {
            membershipType,
            organizationName: membershipType === 'corporate' ? organizationName : fullName,
            organizationType: membershipType === 'corporate' ? organizationType : 'individual',
            grossWrittenPremiums: membershipType === 'corporate' && organizationType === 'MGA' ? getGWPBand(convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency)) : undefined,
            primaryContact: (() => {
              if (membershipType === 'corporate') {
                const primaryMember = members.find(m => m.isPrimaryContact);
                return primaryMember ? {
                  name: primaryMember.name,
                  email: primaryMember.email,
                  phone: primaryMember.phone,
                  role: primaryMember.jobTitle
                } : {
                  name: fullName,
                  email: email,
                  phone: '',
                  role: 'Account Administrator'
                };
              } else {
                return {
                  name: fullName,
                  email: email,
                  phone: '',
                  role: 'Individual Member'
                };
              }
            })(),
            registeredAddress: {
              line1: addressLine1,
              line2: addressLine2,
              city,
              state,
              postalCode,
              country: country
            },
            hasOtherAssociations: hasOtherAssociations ?? false,
            otherAssociations: hasOtherAssociations ? otherAssociations : []
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate invoice: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      if (!result.success || !result.emailSent) {
        throw new Error(result.emailError?.message || 'Failed to send invoice email');
      }
      
      // Only create the account if invoice sending succeeded
      await createAccountAndMembership('pending_invoice');
      
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
      const { auth } = await import('@/lib/firebase');
      
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Handle company-first vs traditional structure
      if (membershipType === 'corporate') {
        // Use company-first structure with atomic batch write
        const { doc: firestoreDoc, setDoc, serverTimestamp, writeBatch } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        // Use Firebase Auth UID as company ID (primary contact's UID)
        const companyId = auth.currentUser.uid;
        
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
          accountAdministratorMemberId: auth.currentUser.uid,
          paymentUserId: auth.currentUser.uid, // For webhook payment processing
          membershipType: 'corporate' as const,
          organizationName,
          organizationType: organizationType as 'MGA' | 'carrier' | 'provider',
          accountAdministrator: (() => {
            const primaryMember = members.find(m => m.isPrimaryContact);
            return primaryMember ? {
              name: primaryMember.name,
              email: primaryMember.email,
              phone: primaryMember.phone,
              role: primaryMember.jobTitle
            } : {
              name: `${firstName} ${surname}`.trim(),
              email: auth.currentUser?.email || '',
              phone: '',
              role: 'Account Administrator'
            };
          })(),
          businessAddress: {
            line1: addressLine1,
            line2: addressLine2,
            city,
            county: state,
            postcode: postalCode,
            country: country
          },
          ...(organizationType === 'MGA' && {
            portfolio: {
              grossWrittenPremiums: getGWPBand(convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency)),
              grossWrittenPremiumsValue: parseFloat(grossWrittenPremiums) || 0,
              grossWrittenPremiumsCurrency: gwpCurrency,
              grossWrittenPremiumsEUR: convertToEUR(parseFloat(grossWrittenPremiums) || 0, gwpCurrency),
              linesOfBusiness: selectedLinesOfBusiness,
              otherLinesOfBusiness: {
                other1: otherLineOfBusiness1.trim(),
                other2: otherLineOfBusiness2.trim(),
                other3: otherLineOfBusiness3.trim()
              },
              markets: selectedMarkets
            }
          }),
          hasOtherAssociations: hasOtherAssociations ?? false,
          otherAssociations: hasOtherAssociations ? otherAssociations : [],
          logoUrl: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        batch.set(companyRef, companyRecord);
        
        // Create member documents for all members
        for (const member of members) {
          // For the registrant (current user), use their Firebase UID
          // For other members, use generated IDs (they'll confirm accounts later)
          const memberId = member.id === 'registrant' ? auth.currentUser.uid : member.id;
          const memberRef = firestoreDoc(db, 'accounts', companyId, 'members', memberId);
          
          const memberRecord = {
            id: memberId,
            email: member.email,
            personalName: member.name,
            jobTitle: member.jobTitle,
            isPrimaryContact: member.isPrimaryContact,
            isRegistrant: member.id === 'registrant',
            accountConfirmed: member.id === 'registrant', // Only registrant is confirmed initially
            joinedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          batch.set(memberRef, memberRecord);
        }
        
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
          accountAdministrator: (() => {
            const primaryMember = members.find(m => m.isPrimaryContact);
            return primaryMember ? {
              name: primaryMember.name,
              email: primaryMember.email,
              phone: primaryMember.phone,
              role: primaryMember.jobTitle
            } : {
              name: `${firstName} ${surname}`.trim(),
              email: auth.currentUser?.email || '',
              phone: '',
              role: 'Account Administrator'
            };
          })(),
          businessAddress: {
            line1: addressLine1,
            line2: addressLine2,
            city,
            county: state,
            postcode: postalCode,
            country: country
          },
          hasOtherAssociations: hasOtherAssociations ?? false,
          otherAssociations: hasOtherAssociations ? otherAssociations : [],
          logoUrl: null,
          updatedAt: serverTimestamp()
        };
        
        await setDoc(accountRef, dataToWrite, { merge: true });
      }
      
      setStep(4); // Go to payment step
      window.scrollTo(0, 0);
      
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setOrganizationType('MGA')}
              className={`p-6 border-2 rounded-lg transition-colors text-left ${
                organizationType === 'MGA' 
                  ? 'border-fase-navy bg-fase-cream' 
                  : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
              }`}
            >
              <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">MGA</h4>
              <p className="text-fase-black text-sm">Managing General Agents transacting business in Europe</p>
            </button>

            <button
              onClick={() => setOrganizationType('carrier')}
              className={`p-6 border-2 rounded-lg transition-colors text-left ${
                organizationType === 'carrier' 
                  ? 'border-fase-navy bg-fase-cream' 
                  : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
              }`}
            >
              <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Carrier</h4>
              <p className="text-fase-black text-sm">Insurance or reinsurance companies working with MGAs</p>
            </button>

            <button
              onClick={() => setOrganizationType('provider')}
              className={`p-6 border-2 rounded-lg transition-colors text-left ${
                organizationType === 'provider' 
                  ? 'border-fase-navy bg-fase-cream' 
                  : 'border-fase-light-gold hover:border-fase-navy hover:bg-fase-cream'
              }`}
            >
              <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Service Provider</h4>
              <p className="text-fase-black text-sm">Service providers active within the MGA ecosystem</p>
            </button>
          </div>
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
                  <strong>Contact:</strong> To exercise your rights or for data protection queries, contact us at admin@fasemga.com or write to FASE Data Protection, Herengracht 124, 1015 BT Amsterdam, Netherlands.
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
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Team Members & Account Administrator</h4>
                <p className="text-sm text-fase-black mt-2 mb-4">
                  Add the people from your organization who will receive FASE membership benefits - including access to industry insights, networking opportunities, professional development resources, and member-only events. One person must be designated as the account administrator to manage billing and settings. <span className="text-fase-navy font-medium">You can add more seats after completing your registration.</span>
                </p>
              </div>

              {/* Members List */}
              <div className="space-y-4">
                {members.map((member, index) => (
                  <div key={member.id} className="p-4 border border-fase-light-gold rounded-lg bg-fase-cream">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-fase-navy">
                          {member.id === 'registrant' ? 'You' : `Member ${index + 1}`}
                          {member.isPrimaryContact && (
                            <span className="ml-2 text-xs bg-fase-navy text-white px-2 py-1 rounded">
                              Account Administrator
                            </span>
                          )}
                        </span>
                      </div>
                      {member.id !== 'registrant' && (
                        <button
                          type="button"
                          onClick={() => {
                            const newMembers = members.filter(m => m.id !== member.id);
                            // If we removed the account administrator, make the first member administrator
                            if (member.isPrimaryContact && newMembers.length > 0) {
                              newMembers[0].isPrimaryContact = true;
                            }
                            setMembers(newMembers);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-fase-navy mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={member.firstName}
                          onChange={(e) => {
                            const newMembers = [...members];
                            const updatedMember = { 
                              ...member, 
                              firstName: e.target.value,
                              name: `${e.target.value} ${member.lastName}`.trim()
                            };
                            newMembers[index] = updatedMember;
                            setMembers(newMembers);
                          }}
                          placeholder="First name"
                          className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                          disabled={member.id === 'registrant'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-fase-navy mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={member.lastName}
                          onChange={(e) => {
                            const newMembers = [...members];
                            const updatedMember = { 
                              ...member, 
                              lastName: e.target.value,
                              name: `${member.firstName} ${e.target.value}`.trim()
                            };
                            newMembers[index] = updatedMember;
                            setMembers(newMembers);
                          }}
                          placeholder="Last name"
                          className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                          disabled={member.id === 'registrant'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-fase-navy mb-2">
                          Job Title *
                        </label>
                        <input
                          type="text"
                          value={member.jobTitle}
                          onChange={(e) => {
                            const newMembers = [...members];
                            newMembers[index] = { ...member, jobTitle: e.target.value };
                            setMembers(newMembers);
                          }}
                          placeholder="e.g. CEO, Manager"
                          className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-fase-navy mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={member.email}
                          onChange={(e) => {
                            const newMembers = [...members];
                            newMembers[index] = { ...member, email: e.target.value };
                            setMembers(newMembers);
                          }}
                          placeholder="email@company.com"
                          className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                          disabled={member.id === 'registrant'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-fase-navy mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={member.phone}
                          onChange={(e) => {
                            const newMembers = [...members];
                            newMembers[index] = { ...member, phone: e.target.value };
                            setMembers(newMembers);
                          }}
                          placeholder="+44 20 1234 5678"
                          className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Account Administrator Toggle */}
                    <div className="mt-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="accountAdministrator"
                          checked={member.isPrimaryContact}
                          onChange={() => {
                            const newMembers = members.map(m => ({
                              ...m,
                              isPrimaryContact: m.id === member.id
                            }));
                            setMembers(newMembers);
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-fase-navy">Make this person the account administrator</span>
                      </label>
                    </div>

                  </div>
                ))}
              </div>

              {/* Add Member Button */}
              {members.length < 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const newMember: Member = {
                      id: `member_${Date.now()}`,
                      firstName: '',
                      lastName: '',
                      name: '',
                      email: '',
                      phone: '',
                      jobTitle: '',
                      isPrimaryContact: false
                    };
                    setMembers([...members, newMember]);
                  }}
                  className="w-full p-3 border-2 border-dashed border-fase-light-gold rounded-lg text-fase-navy hover:border-fase-navy hover:bg-fase-light-blue transition-colors"
                >
                  + Add Another Member (max 3)
                </button>
              )}
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
              {membershipType === 'individual' ? 'Personal Address' : 'Business Address'}
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
            
            <SearchableCountrySelect
              label="Country"
              fieldKey="country"
              value={country}
              onChange={setCountry}
              required
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
            />
            
          </div>

          {/* Portfolio Information for MGAs */}
          {membershipType === 'corporate' && organizationType === 'MGA' && (
            <div className="space-y-4">
              <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Portfolio Information</h4>
              
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Annual Gross Written Premiums *
                </label>
                <div className="space-y-3">
                  {/* Currency Selection */}
                  <div>
                    <label className="block text-xs text-fase-black mb-1">Currency</label>
                    <select
                      value={gwpCurrency}
                      onChange={(e) => setGwpCurrency(e.target.value)}
                      className="w-32 px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                  
                  {/* Amount Builder - Separate inputs for each magnitude */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-fase-black mb-1">Billions</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        step="1"
                        value={gwpBillions}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 99)) {
                            setGwpBillions(value);
                            markFieldTouched('grossWrittenPremiums');
                          }
                        }}
                        placeholder="0"
                        className="w-full px-2 py-2 text-sm border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-fase-black mb-1">Millions</label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        step="1"
                        value={gwpMillions}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 999)) {
                            setGwpMillions(value);
                            markFieldTouched('grossWrittenPremiums');
                          }
                        }}
                        placeholder="0"
                        className="w-full px-2 py-2 text-sm border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-fase-black mb-1">Thousands</label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        step="1"
                        value={gwpThousands}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 999)) {
                            setGwpThousands(value);
                            markFieldTouched('grossWrittenPremiums');
                          }
                        }}
                        placeholder="0"
                        className="w-full px-2 py-2 text-sm border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Display Total */}
                  <div className="bg-fase-cream/20 p-3 rounded-lg">
                    <div className="text-sm text-fase-navy font-medium">
                      Total: {gwpCurrency === 'EUR' ? '€' : gwpCurrency === 'GBP' ? '£' : '$'}{(() => {
                        const billions = parseFloat(gwpBillions) || 0;
                        const millions = parseFloat(gwpMillions) || 0;
                        const thousands = parseFloat(gwpThousands) || 0;
                        const total = (billions * 1000000000) + (millions * 1000000) + (thousands * 1000);
                        return total.toLocaleString('en-US');
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Details Questions - Structured */}
              <div className="space-y-6">
                {/* Lines of Business Question */}
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-3">
                    1. Which of the following lines of business are you currently underwriting? *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                    {linesOfBusinessOptions.map((line) => (
                      <label key={line} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedLinesOfBusiness.includes(line)}
                          onChange={() => toggleLineOfBusiness(line)}
                          className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                        />
                        <span className="text-fase-black">{line}</span>
                      </label>
                    ))}
                  </div>
                  
                  {/* Other fields */}
                  {selectedLinesOfBusiness.includes('Other') && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-fase-navy mb-1">
                        Please specify &quot;Other&quot;:
                      </label>
                      <input
                        type="text"
                        value={otherLineOfBusiness1}
                        onChange={(e) => setOtherLineOfBusiness1(e.target.value)}
                        className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                        placeholder="Please specify..."
                      />
                    </div>
                  )}
                  
                  {selectedLinesOfBusiness.includes('Other #2') && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-fase-navy mb-1">
                        Please specify &quot;Other #2&quot;:
                      </label>
                      <input
                        type="text"
                        value={otherLineOfBusiness2}
                        onChange={(e) => setOtherLineOfBusiness2(e.target.value)}
                        className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                        placeholder="Please specify..."
                      />
                    </div>
                  )}
                  
                  {selectedLinesOfBusiness.includes('Other #3') && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-fase-navy mb-1">
                        Please specify &quot;Other #3&quot;:
                      </label>
                      <input
                        type="text"
                        value={otherLineOfBusiness3}
                        onChange={(e) => setOtherLineOfBusiness3(e.target.value)}
                        className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                        placeholder="Please specify..."
                      />
                    </div>
                  )}
                </div>

                {/* Markets Question */}
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-3">
                    2. In which European markets does your organisation do business? *
                  </label>
                  
                  {/* Selected Markets Display */}
                  {selectedMarkets.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-fase-navy mb-2">Selected markets:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMarkets.map((countryCode) => {
                          const country = europeanCountries.find(c => c.value === countryCode);
                          return (
                            <span
                              key={countryCode}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-fase-navy text-white"
                            >
                              {country?.label}
                              <button
                                type="button"
                                onClick={() => removeMarket(countryCode)}
                                className="ml-2 text-white hover:text-gray-200"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Searchable Country Select */}
                  <div>
                    <SearchableCountrySelect
                      label="Add market"
                      fieldKey="currentMarketSelection"
                      value={currentMarketSelection}
                      onChange={(value) => {
                        setCurrentMarketSelection(value);
                        if (value) {
                          addMarket(value);
                        }
                      }}
                      touchedFields={touchedFields}
                      attemptedNext={attemptedNext}
                      markFieldTouched={markFieldTouched}
                      className="text-sm"
                      europeanOnly={true}
                    />
                    <p className="text-xs text-fase-black mt-1">
                      Search and select European countries/markets where you do business. Selected markets will appear as tokens above.
                    </p>
                  </div>
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

          {/* Carrier-specific Information */}
          {membershipType === 'corporate' && organizationType === 'carrier' && (
            <div className="space-y-4">
              <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Carrier Information</h4>
              
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-3">
                  Is your company currently writing delegated authority business through MGAs in Europe? (Continental Europe and/or the UK and/or Ireland) *
                </label>
                <div className="text-xs text-fase-black mb-3">
                  Note: This is not a qualification for membership. Carriers that are planning to delegate authority to MGAs in Europe are also eligible for FASE membership.
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsDelegatingInEurope('Yes')}
                    className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      isDelegatingInEurope === 'Yes' 
                        ? 'border-fase-navy bg-fase-navy text-white' 
                        : 'border-gray-300 text-gray-700 hover:border-fase-navy'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDelegatingInEurope('No')}
                    className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      isDelegatingInEurope === 'No' 
                        ? 'border-fase-navy bg-fase-navy text-white' 
                        : 'border-gray-300 text-gray-700 hover:border-fase-navy'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {isDelegatingInEurope === 'Yes' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-fase-navy mb-3">
                      How many MGAs do you currently work with in Europe? *
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {['1','2-5', '6-10', '11-25', '25+'].map((range) => (
                        <button
                          key={range}
                          type="button"
                          onClick={() => setNumberOfMGAs(range)}
                          className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                            numberOfMGAs === range 
                              ? 'border-fase-navy bg-fase-navy text-white' 
                              : 'border-gray-300 text-gray-700 hover:border-fase-navy'
                          }`}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fase-navy mb-3">
                      In which European countries are you currently delegating underwriting authority to MGAs? *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-fase-light-gold rounded-lg p-3">
                      {europeanCountries.map((country) => (
                        <label key={country.value} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={delegatingCountries.includes(country.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDelegatingCountries([...delegatingCountries, country.value]);
                              } else {
                                setDelegatingCountries(delegatingCountries.filter(c => c !== country.value));
                              }
                            }}
                            className="mr-2 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                          />
                          <span className="text-fase-black">{country.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-3">
                  Do you offer fronting options? *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['None', 'Pure', 'Hybrid', 'Both'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFrontingOptions(option)}
                      className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        frontingOptions === option 
                          ? 'border-fase-navy bg-fase-navy text-white' 
                          : 'border-gray-300 text-gray-700 hover:border-fase-navy'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-3">
                  Do you consider startup MGAs? *
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setConsiderStartupMGAs('Yes')}
                    className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      considerStartupMGAs === 'Yes' 
                        ? 'border-fase-navy bg-fase-navy text-white' 
                        : 'border-gray-300 text-gray-700 hover:border-fase-navy'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsiderStartupMGAs('No')}
                    className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      considerStartupMGAs === 'No' 
                        ? 'border-fase-navy bg-fase-navy text-white' 
                        : 'border-gray-300 text-gray-700 hover:border-fase-navy'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-3">
                  AM Best rating (if rated)
                </label>
                <select
                  value={amBestRating}
                  onChange={(e) => setAmBestRating(e.target.value)}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                >
                  <option value="">Select rating</option>
                  <option value="A++">A++</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="A-">A-</option>
                  <option value="B++">B++</option>
                  <option value="B+">B+</option>
                  <option value="B">B</option>
                  <option value="B-">B-</option>
                  <option value="C++">C++</option>
                  <option value="C">C</option>
                  <option value="C-">C-</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Additional / Other rating (Please specify)
                </label>
                <input
                  type="text"
                  value={otherRating}
                  onChange={(e) => setOtherRating(e.target.value)}
                  placeholder="Please specify other rating if applicable"
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Service Provider Information */}
          {membershipType === 'corporate' && organizationType === 'provider' && (
            <div className="space-y-4">
              <h4 className="text-lg font-noto-serif font-semibold text-fase-navy">Service Provider Information</h4>
              
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-3">
                  Which of the following services do you provide? *
                </label>
                <div className="space-y-2">
                  {[
                    'Actuarial Services',
                    'Back-office/Underwriting Outsourcing',
                    'Business Consulting/Marketing',
                    'Capital/Financial Provider',
                    'Claims Management',
                    'Client/Policy Management Technology',
                    'Data Solutions',
                    'Financial Services',
                    'M&A Advisory',
                    'Program/Product Development',
                    'Rating and Issuing Technology',
                    'Regulatory Compliance/Licensing',
                    'Reinsurance Intermediary',
                    'Risk Management/Risk Control',
                    'Talent/Staffing/Personnel',
                    'Technology - Other'
                  ].map((service) => (
                    <label key={service} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={servicesProvided.includes(service)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setServicesProvided([...servicesProvided, service]);
                          } else {
                            setServicesProvided(servicesProvided.filter(s => s !== service));
                          }
                        }}
                        className="mr-3 h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
                      />
                      <span className="text-sm text-fase-black">{service}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
            

          </div>
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
                  <span className="text-fase-navy">Total annual fee</span>
                  <span className="text-fase-navy">€{getDiscountedFee()}</span>
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
      {step < 5 && (
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
            
            {step < 3 ? (
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