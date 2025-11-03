'use client';

import { useState, useEffect } from "react";
import { useSearchParams } from 'next/navigation';

// Member interface
export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  isPrimaryContact: boolean;
}

// Custom hook for managing registration state
export const useRegistrationState = () => {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  
  // Step management
  const [step, setStep] = useState(0);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  
  // Error states
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  
  // Form validation
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  
  // Basic account information
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  
  // Membership type
  const [membershipType, setMembershipType] = useState<'individual' | 'corporate'>('corporate');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState<'MGA' | 'carrier' | 'provider'>('MGA');
  
  // Team members
  const [members, setMembers] = useState<Member[]>([]);
  
  // Address information
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  
  // MGA specific fields
  const [grossWrittenPremiums, setGrossWrittenPremiums] = useState('');
  const [gwpCurrency, setGwpCurrency] = useState('EUR');
  const [gwpBillions, setGwpBillions] = useState('');
  const [gwpMillions, setGwpMillions] = useState('');
  const [gwpThousands, setGwpThousands] = useState('');
  const [selectedLinesOfBusiness, setSelectedLinesOfBusiness] = useState<string[]>([]);
  const [otherLineOfBusiness1, setOtherLineOfBusiness1] = useState('');
  const [otherLineOfBusiness2, setOtherLineOfBusiness2] = useState('');
  const [otherLineOfBusiness3, setOtherLineOfBusiness3] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [hasOtherAssociations, setHasOtherAssociations] = useState<boolean | null>(null);
  const [otherAssociations, setOtherAssociations] = useState<string[]>([]);
  
  // Carrier specific fields
  const [isDelegatingInEurope, setIsDelegatingInEurope] = useState('');
  const [numberOfMGAs, setNumberOfMGAs] = useState('');
  const [delegatingCountries, setDelegatingCountries] = useState<string[]>([]);
  const [frontingOptions, setFrontingOptions] = useState('');
  const [considerStartupMGAs, setConsiderStartupMGAs] = useState('');
  const [amBestRating, setAmBestRating] = useState('');
  const [otherRating, setOtherRating] = useState('');
  
  // Service provider fields
  const [servicesProvided, setServicesProvided] = useState<string[]>([]);
  
  // Consent fields
  const [dataNoticeConsent, setDataNoticeConsent] = useState(false);
  const [codeOfConductConsent, setCodeOfConductConsent] = useState(false);
  
  // Utility function for marking fields as touched
  const markFieldTouched = (fieldKey: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldKey]: true }));
  };
  
  return {
    // Step management
    step, setStep,
    showEmailVerification, setShowEmailVerification,
    registrationComplete, setRegistrationComplete,
    
    // Loading states
    loading, setLoading,
    processingPayment, setProcessingPayment,
    isSendingVerification, setIsSendingVerification,
    isCheckingVerification, setIsCheckingVerification,
    
    // Error states
    error, setError,
    paymentError, setPaymentError,
    
    // Form validation
    attemptedNext, setAttemptedNext,
    touchedFields, setTouchedFields,
    markFieldTouched,
    
    // Basic account information
    firstName, setFirstName,
    surname, setSurname,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    verificationCode, setVerificationCode,
    showPasswordReqs, setShowPasswordReqs,
    
    // Membership type
    membershipType, setMembershipType,
    organizationName, setOrganizationName,
    organizationType, setOrganizationType,
    
    // Team members
    members, setMembers,
    
    // Address information
    addressLine1, setAddressLine1,
    addressLine2, setAddressLine2,
    city, setCity,
    state, setState,
    postalCode, setPostalCode,
    country, setCountry,
    
    // MGA specific fields
    grossWrittenPremiums, setGrossWrittenPremiums,
    gwpCurrency, setGwpCurrency,
    gwpBillions, setGwpBillions,
    gwpMillions, setGwpMillions,
    gwpThousands, setGwpThousands,
    selectedLinesOfBusiness, setSelectedLinesOfBusiness,
    otherLineOfBusiness1, setOtherLineOfBusiness1,
    otherLineOfBusiness2, setOtherLineOfBusiness2,
    otherLineOfBusiness3, setOtherLineOfBusiness3,
    selectedMarkets, setSelectedMarkets,
    hasOtherAssociations, setHasOtherAssociations,
    otherAssociations, setOtherAssociations,
    
    // Carrier specific fields
    isDelegatingInEurope, setIsDelegatingInEurope,
    numberOfMGAs, setNumberOfMGAs,
    delegatingCountries, setDelegatingCountries,
    frontingOptions, setFrontingOptions,
    considerStartupMGAs, setConsiderStartupMGAs,
    amBestRating, setAmBestRating,
    otherRating, setOtherRating,
    
    // Service provider fields
    servicesProvided, setServicesProvided,
    
    // Consent fields
    dataNoticeConsent, setDataNoticeConsent,
    codeOfConductConsent, setCodeOfConductConsent,
    
    // Additional data
    inviteToken
  };
};