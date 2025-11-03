'use client';

import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "../../../components/Button";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { createMemberApplication } from "../../../lib/firestore";
import { uploadMemberLogo, validateLogoFile } from "../../../lib/storage";

// Reusable validated input component
const ValidatedInput = ({ 
  label, 
  fieldKey, 
  value, 
  onChange, 
  type = "text", 
  placeholder, 
  required = false,
  hideRequiredIndicator = false,
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
  hideRequiredIndicator?: boolean;
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
          {label} {required && !hideRequiredIndicator && '*'}
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

// Reusable validated select component
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
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
};

// Reusable validated checkbox component
const ValidatedCheckbox = ({ 
  label, 
  fieldKey, 
  checked, 
  onChange, 
  required = false,
  className = "",
  touchedFields,
  attemptedNext,
  markFieldTouched
}: {
  label: React.ReactNode;
  fieldKey: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  className?: string;
  touchedFields: Record<string, boolean>;
  attemptedNext: boolean;
  markFieldTouched: (fieldKey: string) => void;
}) => {
  const shouldShowValidation = required && ((touchedFields[fieldKey] || attemptedNext) && !checked);
  
  return (
    <label className={`flex items-start p-3 rounded-lg border ${
      shouldShowValidation ? 'border-red-200 bg-red-50' : 'border-transparent'
    } ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
          markFieldTouched(fieldKey);
        }}
        className="mt-1 mr-3"
      />
      <span className="text-sm text-fase-black">
        {label} {required && '*'}
      </span>
    </label>
  );
};

export default function MembershipApplication() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [attemptedNext, setAttemptedNext] = useState(false);
  
  // Logo upload state
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Reset touched fields when changing steps
  useEffect(() => {
    setTouchedFields({});
    setAttemptedNext(false);
  }, [currentStep]);

  // Initialize arrays if empty
  useEffect(() => {
    setNewOrgData(prev => ({
      ...prev,
      keyContacts: prev.keyContacts.length === 0 
        ? [{ name: '', role: '', email: '', phone: '' }] 
        : prev.keyContacts,
      targetMarkets: prev.targetMarkets.length === 0 
        ? [''] 
        : prev.targetMarkets,
      claimsPartners: prev.claimsPartners.length === 0 
        ? [''] 
        : prev.claimsPartners
    }));
  }, []);
  
  const [newOrgData, setNewOrgData] = useState({
    // Introduction & Basic Info
    membershipType: 'corporate' as 'corporate' | 'individual',
    organizationName: '',
    organizationType: '' as '' | 'MGA' | 'carrier' | 'provider',
    logoURL: '' as string,
    
    // Privacy & Data
    privacyAgreed: false,
    dataProcessingAgreed: false,
    
    // Primary Contact
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    primaryContactRole: '',
    
    // Organization Details
    tradingName: '',
    registeredNumber: '',
    vatNumber: '',
    websiteUrl: '',
    
    // Regulatory & Compliance
    fcarNumber: '',
    authorizedActivities: [] as string[],
    regulatoryBody: '',
    
    // Registered Address
    registeredAddress: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom'
    },
    
    // Member Key Contacts
    keyContacts: [] as Array<{name: string, role: string, email: string, phone: string}>,
    
    // Invoicing Address
    invoicingAddress: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom',
      sameAsRegistered: true
    },
    
    // Invoicing Contact
    invoicingContact: {
      name: '',
      email: '',
      phone: '',
      role: ''
    },
    
    // Distribution Strategy
    distributionChannels: [] as string[],
    brokerNetwork: '',
    
    // Portfolio & GWP
    grossWrittenPremiums: '' as '' | '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+',
    portfolioMix: {} as Record<string, number>,
    
    // Product Lines
    productLines: [] as string[],
    targetMarkets: [] as string[],
    
    // Claims Model
    claimsHandling: '',
    claimsPartners: [] as string[],
    
    // General Information
    businessPlan: '',
    marketingStrategy: '',
    
    // Demographics
    employeeCount: '',
    yearEstablished: '',
    ownershipStructure: '',
    
    // Association Memberships
    hasOtherAssociations: false,
    otherAssociationMemberships: '',

    // Carrier-specific fields
    carrierType: '', // Lloyd's syndicate, European carrier, etc.
    licenseNumber: '',
    linesOfBusiness: [] as string[],
    capitalBase: '',

    // Service Provider fields
    serviceCategories: [] as string[],
    serviceDescription: '',
    targetClients: [] as string[],
    certifications: ''
  });

  // Define steps based on membership type
  const corporateSteps = [
    { id: 'introduction', title: 'Introduction', required: true },
    { id: 'privacy', title: 'Privacy, Data and Disclosure', required: true },
    { id: 'primary-contact', title: 'Primary Contact Details', required: true },
    { id: 'organisation', title: 'Organisation Details', required: true },
    { id: 'registered-address', title: 'Registered Address', required: true },
    { id: 'key-contacts', title: 'Member Key Contacts', required: false },
    { id: 'invoicing-address', title: 'Invoicing Address', required: true },
    { id: 'invoicing-contact', title: 'Invoicing Contact Details', required: true },
    { id: 'distribution', title: 'Distribution Strategy', required: false },
    { id: 'portfolio', title: 'Portfolio Mix & GWP', required: true },
    { id: 'general', title: 'General Information', required: false },
    { id: 'demographics', title: 'Organisation Demographics', required: false },
    { id: 'payment', title: 'Membership Payment', required: true },
    { id: 'submit', title: 'Complete and Submit', required: true }
  ];

  const individualSteps = [
    { id: 'introduction', title: 'Introduction', required: true },
    { id: 'privacy', title: 'Privacy, Data and Disclosure', required: true },
    { id: 'primary-contact', title: 'Personal Details', required: true },
    { id: 'personal-address', title: 'Address Details', required: true },
    { id: 'payment', title: 'Membership Payment', required: true },
    { id: 'submit', title: 'Complete and Submit', required: true }
  ];

  // Simplified steps for carriers (insurance companies providing capacity)
  const carrierSteps = [
    { id: 'introduction', title: 'Introduction', required: true },
    { id: 'privacy', title: 'Privacy, data and disclosure', required: true },
    { id: 'primary-contact', title: 'Primary contact details', required: true },
    { id: 'organisation', title: 'Organisation details', required: true },
    { id: 'registered-address', title: 'Registered address', required: true },
    { id: 'carrier-details', title: 'Carrier information', required: true },
    { id: 'invoicing-address', title: 'Invoicing address', required: true },
    { id: 'invoicing-contact', title: 'Invoicing Contact details', required: true },
    { id: 'payment', title: 'Membership payment', required: true },
    { id: 'submit', title: 'Complete and submit', required: true }
  ];

  // Simplified steps for service providers (technology, legal, consulting, etc.)
  const serviceProviderSteps = [
    { id: 'introduction', title: 'Introduction', required: true },
    { id: 'privacy', title: 'Privacy, Data and Disclosure', required: true },
    { id: 'primary-contact', title: 'Primary Contact Details', required: true },
    { id: 'organisation', title: 'Organisation Details', required: true },
    { id: 'registered-address', title: 'Registered Address', required: true },
    { id: 'service-details', title: 'Service Information', required: true },
    { id: 'invoicing-address', title: 'Invoicing Address', required: true },
    { id: 'invoicing-contact', title: 'Invoicing Contact Details', required: true },
    { id: 'payment', title: 'Membership Payment', required: true },
    { id: 'submit', title: 'Complete and Submit', required: true }
  ];

  // Use appropriate steps based on membership type and organization type
  const getMembershipSteps = () => {
    if (newOrgData.membershipType === 'individual') {
      return individualSteps;
    } else if (newOrgData.organizationType === 'carrier') {
      return carrierSteps;
    } else if (newOrgData.organizationType === 'provider') {
      return serviceProviderSteps;
    } else {
      return corporateSteps; // MGA and other corporate types
    }
  };

  const membershipSteps = getMembershipSteps();

  // Helper function to check validation for any step by ID
  const checkStepValidation = (stepId: string) => {
    switch (stepId) {
      case 'introduction':
        if (newOrgData.membershipType === 'corporate') {
          return newOrgData.organizationName.trim() !== '' && 
                 newOrgData.organizationType !== '';
        } else {
          return newOrgData.organizationName.trim() !== '';
        }
      
      case 'privacy':
        return newOrgData.privacyAgreed && newOrgData.dataProcessingAgreed;
      
      case 'primary-contact':
        return newOrgData.primaryContactName.trim() !== '' &&
               newOrgData.primaryContactEmail.trim() !== '' &&
               newOrgData.primaryContactPhone.trim() !== '' &&
               newOrgData.primaryContactRole.trim() !== '';
      
      case 'personal-address':
        return newOrgData.registeredAddress.line1.trim() !== '' &&
               newOrgData.registeredAddress.city.trim() !== '' &&
               newOrgData.registeredAddress.postcode.trim() !== '' &&
               newOrgData.registeredAddress.country.trim() !== '';
      
      case 'organisation':
        return true; // No required fields in organisation step
      
      case 'registered-address':
        return newOrgData.registeredAddress.line1.trim() !== '' &&
               newOrgData.registeredAddress.city.trim() !== '' &&
               newOrgData.registeredAddress.postcode.trim() !== '' &&
               newOrgData.registeredAddress.country.trim() !== '';
      
      case 'invoicing-address':
        if (newOrgData.invoicingAddress.sameAsRegistered) {
          return true;
        }
        return newOrgData.invoicingAddress.line1.trim() !== '' &&
               newOrgData.invoicingAddress.city.trim() !== '' &&
               newOrgData.invoicingAddress.postcode.trim() !== '' &&
               newOrgData.invoicingAddress.country.trim() !== '';
      
      case 'invoicing-contact':
        return newOrgData.invoicingContact.name.trim() !== '' &&
               newOrgData.invoicingContact.email.trim() !== '' &&
               newOrgData.invoicingContact.phone.trim() !== '' &&
               newOrgData.invoicingContact.role.trim() !== '';
      
      case 'portfolio':
        if (newOrgData.membershipType === 'corporate' && newOrgData.organizationType === 'MGA') {
          return newOrgData.grossWrittenPremiums !== '';
        }
        return true;
      
      case 'carrier-details':
        return newOrgData.carrierType.trim() !== '' &&
               newOrgData.linesOfBusiness.length > 0;
      
      case 'service-details':
        return newOrgData.serviceCategories.length > 0 &&
               (newOrgData.serviceCategories.includes('Other') ? newOrgData.serviceDescription.trim() !== '' : true);
      
      case 'payment':
        return true; // Payment step is valid when user selects a payment method
      
      case 'submit':
        return termsAgreed;
      
      default:
        return true;
    }
  };

  // Function to check if current step is valid
  const isCurrentStepValid = () => {
    const currentStepData = membershipSteps[currentStep];
    
    // Non-required steps are always valid
    if (!currentStepData?.required) {
      return true;
    }
    
    return checkStepValidation(currentStepData.id);
  };

  // Helper function to determine if validation styling should be shown
  const shouldShowValidation = (fieldKey: string, isValid: boolean) => {
    return (touchedFields[fieldKey] || attemptedNext) && !isValid;
  };

  // Calculate annual fee with discount
  const calculateAnnualFee = (membershipType: string, organizationType: string, grossWrittenPremiums: string, hasOtherAssociations: boolean) => {
    let baseFee = 0;
    
    if (membershipType === 'individual') {
      baseFee = 500;
    } else if (organizationType === 'MGA' && grossWrittenPremiums) {
      switch (grossWrittenPremiums) {
        case '<10m': baseFee = 900; break;
        case '10-20m': baseFee = 1500; break;
        case '20-50m': baseFee = 2000; break;
        case '50-100m': baseFee = 2800; break;
        case '100-500m': baseFee = 4200; break;
        case '500m+': baseFee = 6400; break;
        default: baseFee = 900; break;
      }
    } else {
      baseFee = 900; // Default corporate fee
    }
    
    // Apply 20% discount for corporate members of other associations only
    if (hasOtherAssociations && membershipType === 'corporate') {
      baseFee = Math.round(baseFee * 0.8);
    }
    
    return baseFee;
  };

  // Helper to mark a field as touched
  const markFieldTouched = (fieldKey: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldKey]: true }));
  };

  // Helper function to remove undefined values from object but preserve structure
  const cleanObject = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) {
      const filtered = obj.filter(item => item !== undefined && item !== null && item !== '');
      return filtered.length > 0 ? filtered : undefined;
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = cleanObject(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    return obj === '' ? undefined : obj;
  };

  // Handle submission without payment
  const handleSubmitWithoutPayment = async () => {
    if (!user?.uid) {
      alert('User not authenticated');
      return;
    }

    let rawApplicationData;
    try {
      rawApplicationData = {
        status: 'pending' as const,
        
        // Basic information
        membershipType: newOrgData.membershipType,
        organizationName: newOrgData.organizationName,
        organizationType: newOrgData.organizationType,
        logoURL: newOrgData.logoURL,
        
        // Privacy agreements
        privacyAgreed: newOrgData.privacyAgreed,
        dataProcessingAgreed: newOrgData.dataProcessingAgreed,
        
        // Primary contact
        primaryContact: {
          name: newOrgData.primaryContactName,
          email: newOrgData.primaryContactEmail,
          phone: newOrgData.primaryContactPhone,
          role: newOrgData.primaryContactRole,
        },
        
        // Organization details
        organizationDetails: {
          tradingName: newOrgData.tradingName,
          registeredNumber: newOrgData.registeredNumber,
          vatNumber: newOrgData.vatNumber,
          websiteUrl: newOrgData.websiteUrl,
        },
        
        // Regulatory information
        regulatory: {
          fcarNumber: newOrgData.fcarNumber,
          authorizedActivities: newOrgData.authorizedActivities,
          regulatoryBody: newOrgData.regulatoryBody,
        },
        
        // Registered address
        registeredAddress: {
          line1: newOrgData.registeredAddress.line1,
          line2: newOrgData.registeredAddress.line2,
          city: newOrgData.registeredAddress.city,
          county: newOrgData.registeredAddress.county,
          postcode: newOrgData.registeredAddress.postcode,
          country: newOrgData.registeredAddress.country,
        },
        
        // Key contacts (if any)
        keyContacts: newOrgData.keyContacts.length > 0 ? newOrgData.keyContacts : undefined,
        
        // Invoicing details (if provided)
        invoicingAddress: newOrgData.invoicingAddress.line1 ? {
          line1: newOrgData.invoicingAddress.line1,
          line2: newOrgData.invoicingAddress.line2,
          city: newOrgData.invoicingAddress.city,
          county: newOrgData.invoicingAddress.county,
          postcode: newOrgData.invoicingAddress.postcode,
          country: newOrgData.invoicingAddress.country,
          sameAsRegistered: newOrgData.invoicingAddress.sameAsRegistered,
        } : undefined,
        
        invoicingContact: newOrgData.invoicingContact.name ? {
          name: newOrgData.invoicingContact.name,
          email: newOrgData.invoicingContact.email,
          phone: newOrgData.invoicingContact.phone,
          role: newOrgData.invoicingContact.role,
        } : undefined,
        
        // Business information
        distributionStrategy: newOrgData.distributionChannels.length > 0 ? {
          channels: newOrgData.distributionChannels,
          brokerNetwork: newOrgData.brokerNetwork,
        } : undefined,
        
        // Portfolio information
        portfolio: newOrgData.grossWrittenPremiums || Object.keys(newOrgData.portfolioMix).length > 0 ? {
          grossWrittenPremiums: newOrgData.grossWrittenPremiums,
          portfolioMix: newOrgData.portfolioMix,
        } : undefined,
        
        productLines: newOrgData.productLines.length > 0 || newOrgData.targetMarkets.length > 0 ? {
          lines: newOrgData.productLines,
          targetMarkets: newOrgData.targetMarkets,
        } : undefined,
        
        claimsModel: newOrgData.claimsHandling || newOrgData.claimsPartners.length > 0 ? {
          handling: newOrgData.claimsHandling,
          partners: newOrgData.claimsPartners,
        } : undefined,
        
        // Additional information
        generalInformation: newOrgData.businessPlan || newOrgData.marketingStrategy ? {
          businessPlan: newOrgData.businessPlan,
          marketingStrategy: newOrgData.marketingStrategy,
        } : undefined,
        
        demographics: newOrgData.employeeCount || newOrgData.yearEstablished || newOrgData.ownershipStructure ? {
          employeeCount: newOrgData.employeeCount,
          yearEstablished: newOrgData.yearEstablished,
          ownership: newOrgData.ownershipStructure,
        } : undefined,

        // Carrier-specific information
        carrierDetails: newOrgData.organizationType === 'carrier' ? {
          carrierType: newOrgData.carrierType,
          licenseNumber: newOrgData.licenseNumber,
          linesOfBusiness: newOrgData.linesOfBusiness,
          capitalBase: newOrgData.capitalBase,
        } : undefined,

        // Service provider information
        serviceDetails: newOrgData.organizationType === 'provider' ? {
          serviceCategories: newOrgData.serviceCategories,
          serviceDescription: newOrgData.serviceDescription,
          targetClients: newOrgData.targetClients,
          certifications: newOrgData.certifications,
        } : undefined,
        
        // Terms agreement
        termsAgreed: termsAgreed,
      };

      // Clean the data to remove undefined values
      const applicationData = cleanObject(rawApplicationData);

      console.log('Submitting application data:', applicationData);
      const applicationId = await createMemberApplication(user.uid, applicationData);
      alert(`Membership application submitted successfully! Application ID: ${applicationId}`);
      router.push('/member-portal');
    } catch (error) {
      console.error('Error submitting application:', error);
      console.error('Raw application data that failed:', rawApplicationData);
      if (error instanceof Error) {
        alert(`Failed to submit application: ${error.message}`);
      } else {
        alert('Failed to submit application. Please try again.');
      }
    }
  };

  // Silent application submission for invoice flows
  const submitApplicationForInvoice = async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }
    const rawApplicationData = {
      status: 'invoice_sent' as const,
      
      // Basic information
      membershipType: newOrgData.membershipType,
      organizationName: newOrgData.organizationName || `${newOrgData.primaryContactName} (Individual)`,
      organizationType: newOrgData.organizationType,
      logoURL: newOrgData.logoURL,
      
      // Privacy agreements
      privacyAgreed: true,
      dataProcessingAgreed: true,
      
      // Primary contact
      primaryContact: {
        name: newOrgData.primaryContactName,
        email: newOrgData.primaryContactEmail,
        phone: newOrgData.primaryContactPhone,
        role: newOrgData.primaryContactRole,
      },
      
      // Organization details
      organizationDetails: {
        tradingName: newOrgData.tradingName,
        registeredNumber: newOrgData.registeredNumber,
        vatNumber: newOrgData.vatNumber,
        websiteUrl: newOrgData.websiteUrl,
      },
      
      // Regulatory information
      regulatory: {
        fcarNumber: newOrgData.fcarNumber,
        authorizedActivities: newOrgData.authorizedActivities,
        regulatoryBody: newOrgData.regulatoryBody,
      },
      
      // Registered address
      registeredAddress: {
        line1: newOrgData.registeredAddress.line1,
        line2: newOrgData.registeredAddress.line2,
        city: newOrgData.registeredAddress.city,
        county: newOrgData.registeredAddress.county,
        postcode: newOrgData.registeredAddress.postcode,
        country: newOrgData.registeredAddress.country,
      },
      
      // Key contacts (if any)
      keyContacts: newOrgData.keyContacts.length > 0 ? newOrgData.keyContacts : undefined,
      
      // Invoicing details (required for invoices)
      invoicingAddress: newOrgData.membershipType === 'individual' 
        ? {
            line1: newOrgData.registeredAddress.line1,
            line2: newOrgData.registeredAddress.line2,
            city: newOrgData.registeredAddress.city,
            county: newOrgData.registeredAddress.county,
            postcode: newOrgData.registeredAddress.postcode,
            country: newOrgData.registeredAddress.country,
            sameAsRegistered: true,
          }
        : newOrgData.invoicingAddress.line1 ? {
            line1: newOrgData.invoicingAddress.line1,
            line2: newOrgData.invoicingAddress.line2,
            city: newOrgData.invoicingAddress.city,
            county: newOrgData.invoicingAddress.county,
            postcode: newOrgData.invoicingAddress.postcode,
            country: newOrgData.invoicingAddress.country,
            sameAsRegistered: newOrgData.invoicingAddress.sameAsRegistered,
          } : undefined,
      
      invoicingContact: newOrgData.membershipType === 'individual'
        ? {
            name: newOrgData.primaryContactName,
            email: newOrgData.primaryContactEmail,
            phone: newOrgData.primaryContactPhone,
            role: newOrgData.primaryContactRole,
          }
        : {
            name: newOrgData.invoicingContact.name,
            email: newOrgData.invoicingContact.email,
            phone: newOrgData.invoicingContact.phone,
            role: newOrgData.invoicingContact.role,
          },
      
      // Business information
      distributionStrategy: newOrgData.distributionChannels.length > 0 ? {
        channels: newOrgData.distributionChannels,
        brokerNetwork: newOrgData.brokerNetwork,
      } : undefined,
      
      // Portfolio information
      portfolio: newOrgData.grossWrittenPremiums || Object.keys(newOrgData.portfolioMix).length > 0 ? {
        grossWrittenPremiums: newOrgData.grossWrittenPremiums,
        portfolioMix: newOrgData.portfolioMix,
      } : undefined,
      
      productLines: newOrgData.productLines.length > 0 || newOrgData.targetMarkets.length > 0 ? {
        lines: newOrgData.productLines,
        targetMarkets: newOrgData.targetMarkets,
      } : undefined,
      
      claimsModel: newOrgData.claimsHandling || newOrgData.claimsPartners.length > 0 ? {
        handling: newOrgData.claimsHandling,
        partners: newOrgData.claimsPartners,
      } : undefined,
      
      // Additional information
      generalInformation: newOrgData.businessPlan || newOrgData.marketingStrategy ? {
        businessPlan: newOrgData.businessPlan,
        marketingStrategy: newOrgData.marketingStrategy,
      } : undefined,
      
      demographics: newOrgData.employeeCount || newOrgData.yearEstablished || newOrgData.ownershipStructure ? {
        employeeCount: newOrgData.employeeCount,
        yearEstablished: newOrgData.yearEstablished,
        ownership: newOrgData.ownershipStructure,
      } : undefined,

      // Carrier-specific information
      carrierDetails: newOrgData.organizationType === 'carrier' ? {
        carrierType: newOrgData.carrierType,
        licenseNumber: newOrgData.licenseNumber,
        linesOfBusiness: newOrgData.linesOfBusiness,
        capitalBase: newOrgData.capitalBase,
      } : undefined,

      // Service provider information
      serviceDetails: newOrgData.organizationType === 'provider' ? {
        serviceCategories: newOrgData.serviceCategories,
        serviceDescription: newOrgData.serviceDescription,
        targetClients: newOrgData.targetClients,
        certifications: newOrgData.certifications,
      } : undefined,
      
      // Terms agreement
      termsAgreed: true, // Must be true to reach this point
      
      // Other associations data
      hasOtherAssociations: newOrgData.hasOtherAssociations,
      otherAssociationMemberships: newOrgData.otherAssociationMemberships,
    };

    // Clean the data to remove undefined values
    const applicationData = cleanObject(rawApplicationData);
    
    // Submit silently without UI changes
    const applicationId = await createMemberApplication(user.uid, applicationData);
    return applicationId;
  };

  // Silent application submission for payment flows
  const submitApplicationSilently = async () => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    const rawApplicationData = {
      status: 'pending' as const,
      
      // Basic information
      membershipType: newOrgData.membershipType,
      organizationName: newOrgData.organizationName,
      organizationType: newOrgData.organizationType,
      logoURL: newOrgData.logoURL,
      
      // Privacy agreements
      privacyAgreed: newOrgData.privacyAgreed,
      dataProcessingAgreed: newOrgData.dataProcessingAgreed,
      
      // Primary contact
      primaryContact: {
        name: newOrgData.primaryContactName,
        email: newOrgData.primaryContactEmail,
        phone: newOrgData.primaryContactPhone,
        role: newOrgData.primaryContactRole,
      },
      
      // Organization details
      organizationDetails: {
        tradingName: newOrgData.tradingName,
        registeredNumber: newOrgData.registeredNumber,
        vatNumber: newOrgData.vatNumber,
        websiteUrl: newOrgData.websiteUrl,
      },
      
      // Regulatory information
      regulatory: {
        fcarNumber: newOrgData.fcarNumber,
        authorizedActivities: newOrgData.authorizedActivities,
        regulatoryBody: newOrgData.regulatoryBody,
      },
      
      // Registered address
      registeredAddress: {
        line1: newOrgData.registeredAddress.line1,
        line2: newOrgData.registeredAddress.line2,
        city: newOrgData.registeredAddress.city,
        county: newOrgData.registeredAddress.county,
        postcode: newOrgData.registeredAddress.postcode,
        country: newOrgData.registeredAddress.country,
      },
      
      // Key contacts (if any)
      keyContacts: newOrgData.keyContacts.length > 0 ? newOrgData.keyContacts : undefined,
      
      // Invoicing details (if provided)
      invoicingAddress: newOrgData.invoicingAddress.line1 ? {
        line1: newOrgData.invoicingAddress.line1,
        line2: newOrgData.invoicingAddress.line2,
        city: newOrgData.invoicingAddress.city,
        county: newOrgData.invoicingAddress.county,
        postcode: newOrgData.invoicingAddress.postcode,
        country: newOrgData.invoicingAddress.country,
        sameAsRegistered: newOrgData.invoicingAddress.sameAsRegistered,
      } : undefined,
      
      invoicingContact: newOrgData.invoicingContact.name ? {
        name: newOrgData.invoicingContact.name,
        email: newOrgData.invoicingContact.email,
        phone: newOrgData.invoicingContact.phone,
        role: newOrgData.invoicingContact.role,
      } : undefined,
      
      // Business information
      distributionStrategy: newOrgData.distributionChannels.length > 0 ? {
        channels: newOrgData.distributionChannels,
        brokerNetwork: newOrgData.brokerNetwork,
      } : undefined,
      
      // Portfolio information
      portfolio: newOrgData.grossWrittenPremiums || Object.keys(newOrgData.portfolioMix).length > 0 ? {
        grossWrittenPremiums: newOrgData.grossWrittenPremiums,
        portfolioMix: newOrgData.portfolioMix,
      } : undefined,
      
      productLines: newOrgData.productLines.length > 0 || newOrgData.targetMarkets.length > 0 ? {
        lines: newOrgData.productLines,
        targetMarkets: newOrgData.targetMarkets,
      } : undefined,
      
      claimsModel: newOrgData.claimsHandling || newOrgData.claimsPartners.length > 0 ? {
        handling: newOrgData.claimsHandling,
        partners: newOrgData.claimsPartners,
      } : undefined,
      
      // Additional information
      generalInformation: newOrgData.businessPlan || newOrgData.marketingStrategy ? {
        businessPlan: newOrgData.businessPlan,
        marketingStrategy: newOrgData.marketingStrategy,
      } : undefined,
      
      demographics: newOrgData.employeeCount || newOrgData.yearEstablished || newOrgData.ownershipStructure ? {
        employeeCount: newOrgData.employeeCount,
        yearEstablished: newOrgData.yearEstablished,
        ownership: newOrgData.ownershipStructure,
      } : undefined,

      // Carrier-specific information
      carrierDetails: newOrgData.organizationType === 'carrier' ? {
        carrierType: newOrgData.carrierType,
        licenseNumber: newOrgData.licenseNumber,
        linesOfBusiness: newOrgData.linesOfBusiness,
        capitalBase: newOrgData.capitalBase,
      } : undefined,

      // Service provider information
      serviceDetails: newOrgData.organizationType === 'provider' ? {
        serviceCategories: newOrgData.serviceCategories,
        serviceDescription: newOrgData.serviceDescription,
        targetClients: newOrgData.targetClients,
        certifications: newOrgData.certifications,
      } : undefined,
      
      // Terms agreement
      termsAgreed: termsAgreed,
    };

    // Clean the data to remove undefined values
    const applicationData = cleanObject(rawApplicationData);
    
    // Submit silently without UI changes
    const applicationId = await createMemberApplication(user.uid, applicationData);
    return applicationId;
  };

  // Logo upload handler
  const handleLogoUpload = async (file: File) => {
    if (!user?.uid) return;
    
    setIsUploadingLogo(true);
    setLogoUploadError(null);
    
    try {
      validateLogoFile(file);
      const result = await uploadMemberLogo(file, user.uid);
      setNewOrgData(prev => ({ ...prev, logoURL: result.downloadURL }));
      setSelectedLogoFile(file);
    } catch (error) {
      setLogoUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Function to render step content
  const renderStepContent = () => {
    const currentStepData = membershipSteps[currentStep];
    
    switch (currentStepData?.id) {
      case 'introduction':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Welcome to the FASE membership application. This form will collect the information needed to process your application.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Membership Type
              </label>
              <select
                value={newOrgData.membershipType}
                onChange={(e) => setNewOrgData({ 
                  ...newOrgData, 
                  membershipType: e.target.value as 'corporate' | 'individual' 
                })}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="corporate">Corporate Membership</option>
                <option value="individual">Individual Membership</option>
              </select>
            </div>

            <ValidatedInput
              label={newOrgData.membershipType === 'corporate' ? 'Organization Name' : 'Full Name'}
              fieldKey="organizationName"
              value={newOrgData.organizationName}
              onChange={(value) => setNewOrgData({ ...newOrgData, organizationName: value })}
              placeholder={newOrgData.membershipType === 'corporate' ? 'Enter your organization name' : 'Enter your full name'}
              required={true}
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
            />

            {newOrgData.membershipType === 'corporate' && (
              <ValidatedSelect
                label="Organization Type"
                fieldKey="organizationType"
                value={newOrgData.organizationType}
                onChange={(value) => setNewOrgData({ 
                  ...newOrgData, 
                  organizationType: value as '' | 'MGA' | 'carrier' | 'provider' 
                })}
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
                options={[
                  { value: '', label: 'Select organization type...' },
                  { value: 'MGA', label: 'MGA' },
                  { value: 'carrier', label: 'Carrier' },
                  { value: 'provider', label: 'Service Provider' }
                ]}
              />
            )}
            
            <div className="space-y-4">
              <ValidatedCheckbox
                label="Are you a member of any European national MGA associations?"
                fieldKey="hasOtherAssociations"
                checked={newOrgData.hasOtherAssociations}
                onChange={(checked) => setNewOrgData({ 
                  ...newOrgData, 
                  hasOtherAssociations: checked,
                  otherAssociationMemberships: checked ? newOrgData.otherAssociationMemberships : ''
                })}
                required={false}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              {newOrgData.hasOtherAssociations && (
                <ValidatedSelect
                  label="Other Association Memberships"
                  fieldKey="otherAssociationMemberships"
                  value={newOrgData.otherAssociationMemberships}
                  onChange={(value) => setNewOrgData({ 
                    ...newOrgData, 
                    otherAssociationMemberships: value 
                  })}
                  required={false}
                  touchedFields={touchedFields}
                  attemptedNext={attemptedNext}
                  markFieldTouched={markFieldTouched}
                  options={[
                    { value: '', label: 'Select association...' },
                    { value: 'ASASE', label: 'ASASE' },
                    { value: 'MGAA', label: 'MGAA' },
                    { value: 'NVGA', label: 'NVGA' },
                    { value: 'AIMGA', label: 'AIMGA' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
              )}
            </div>

            {/* Logo Upload Section */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Organization Logo (Optional)
              </label>
              <p className="text-xs text-fase-black mb-3">
                Upload your organization&#39;s logo. Supported formats: PNG, JPG, SVG, WebP (max 5MB)
              </p>
              
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleLogoUpload(file);
                    }
                  }}
                  className="block w-full text-sm text-fase-black
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-fase-cream file:text-fase-navy
                    hover:file:bg-fase-light-gold"
                  disabled={isUploadingLogo}
                />
                
                {isUploadingLogo && (
                  <div className="flex items-center text-sm text-fase-navy">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-fase-navy mr-2"></div>
                    Uploading...
                  </div>
                )}
              </div>

              {logoUploadError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                  {logoUploadError}
                </p>
              )}

              {newOrgData.logoURL && (
                <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-12 h-12 border border-green-300 rounded-lg overflow-hidden">
                    <img
                      src={newOrgData.logoURL}
                      alt="Uploaded logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Logo uploaded successfully</p>
                    <p className="text-xs text-green-600">Your logo will appear in the member directory</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Please review and accept our privacy and data processing terms.
              </p>
            </div>
            
            <div className="space-y-4">
              <ValidatedCheckbox
                label="I agree to the FASE privacy policy and terms of service"
                fieldKey="privacyAgreed"
                checked={newOrgData.privacyAgreed}
                onChange={(checked) => setNewOrgData({ ...newOrgData, privacyAgreed: checked })}
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <ValidatedCheckbox
                label="I consent to the processing of personal data for membership purposes"
                fieldKey="dataProcessingAgreed"
                checked={newOrgData.dataProcessingAgreed}
                onChange={(checked) => setNewOrgData({ ...newOrgData, dataProcessingAgreed: checked })}
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            </div>
          </div>
        );

      case 'organisation':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Provide additional details about your organization.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Trading Name
                </label>
                <input
                  type="text"
                  value={newOrgData.tradingName}
                  onChange={(e) => setNewOrgData({ ...newOrgData, tradingName: e.target.value })}
                  placeholder="If different from organization name"
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
              
              <ValidatedInput
                label="Company Registration Number"
                fieldKey="registeredNumber"
                value={newOrgData.registeredNumber}
                onChange={(value) => setNewOrgData({ ...newOrgData, registeredNumber: value })}
                required={false}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  VAT Number
                </label>
                <input
                  type="text"
                  value={newOrgData.vatNumber}
                  onChange={(e) => setNewOrgData({ ...newOrgData, vatNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={newOrgData.websiteUrl}
                  onChange={(e) => setNewOrgData({ ...newOrgData, websiteUrl: e.target.value })}
                  placeholder="https://www.example.com"
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );


      case 'registered-address':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Provide the registered address of your head office.
              </p>
            </div>
            
            <div className="space-y-4">
              <ValidatedInput
                label="Address Line 1"
                fieldKey="registeredAddress.line1"
                value={newOrgData.registeredAddress.line1}
                onChange={(value) => setNewOrgData({ 
                  ...newOrgData, 
                  registeredAddress: { ...newOrgData.registeredAddress, line1: value }
                })}
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={newOrgData.registeredAddress.line2}
                  onChange={(e) => setNewOrgData({ 
                    ...newOrgData, 
                    registeredAddress: { ...newOrgData.registeredAddress, line2: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="City"
                  fieldKey="registeredAddress.city"
                  value={newOrgData.registeredAddress.city}
                  onChange={(value) => setNewOrgData({ 
                    ...newOrgData, 
                    registeredAddress: { ...newOrgData.registeredAddress, city: value }
                  })}
                  required={true}
                  touchedFields={touchedFields}
                  attemptedNext={attemptedNext}
                  markFieldTouched={markFieldTouched}
                />
                
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    County/State
                  </label>
                  <input
                    type="text"
                    value={newOrgData.registeredAddress.county}
                    onChange={(e) => setNewOrgData({ 
                      ...newOrgData, 
                      registeredAddress: { ...newOrgData.registeredAddress, county: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="Postcode / ZIP Code"
                  fieldKey="registeredAddress.postcode"
                  value={newOrgData.registeredAddress.postcode}
                  onChange={(value) => setNewOrgData({ 
                    ...newOrgData, 
                    registeredAddress: { ...newOrgData.registeredAddress, postcode: value }
                  })}
                  required={true}
                  touchedFields={touchedFields}
                  attemptedNext={attemptedNext}
                  markFieldTouched={markFieldTouched}
                />
                
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    Country *
                  </label>
                  <select
                    value={newOrgData.registeredAddress.country}
                    onChange={(e) => setNewOrgData({ 
                      ...newOrgData, 
                      registeredAddress: { ...newOrgData.registeredAddress, country: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  >
                    <option value="">Select country...</option>
                    {/* European Countries */}
                    <option value="Austria">Austria</option>
                    <option value="Belgium">Belgium</option>
                    <option value="Bulgaria">Bulgaria</option>
                    <option value="Croatia">Croatia</option>
                    <option value="Cyprus">Cyprus</option>
                    <option value="Czech Republic">Czech Republic</option>
                    <option value="Denmark">Denmark</option>
                    <option value="Estonia">Estonia</option>
                    <option value="Finland">Finland</option>
                    <option value="France">France</option>
                    <option value="Germany">Germany</option>
                    <option value="Greece">Greece</option>
                    <option value="Hungary">Hungary</option>
                    <option value="Iceland">Iceland</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Italy">Italy</option>
                    <option value="Latvia">Latvia</option>
                    <option value="Liechtenstein">Liechtenstein</option>
                    <option value="Lithuania">Lithuania</option>
                    <option value="Luxembourg">Luxembourg</option>
                    <option value="Malta">Malta</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="Norway">Norway</option>
                    <option value="Poland">Poland</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Romania">Romania</option>
                    <option value="Slovakia">Slovakia</option>
                    <option value="Slovenia">Slovenia</option>
                    <option value="Spain">Spain</option>
                    <option value="Sweden">Sweden</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="United Kingdom">United Kingdom</option>
                    {/* Non-European Countries */}
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Japan">Japan</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Hong Kong">Hong Kong</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );


      case 'primary-contact':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Provide details for the primary contact for this membership.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                label="Full Name"
                fieldKey="primaryContactName"
                value={newOrgData.primaryContactName}
                onChange={(value) => setNewOrgData({ ...newOrgData, primaryContactName: value })}
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <ValidatedInput
                label="Title"
                fieldKey="primaryContactRole"
                value={newOrgData.primaryContactRole}
                onChange={(value) => setNewOrgData({ ...newOrgData, primaryContactRole: value })}
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <ValidatedInput
                label="Email Address"
                fieldKey="primaryContactEmail"
                type="email"
                value={newOrgData.primaryContactEmail}
                onChange={(value) => setNewOrgData({ ...newOrgData, primaryContactEmail: value })}
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <ValidatedInput
                label="Phone Number"
                fieldKey="primaryContactPhone"
                type="tel"
                value={newOrgData.primaryContactPhone}
                onChange={(value) => setNewOrgData({ ...newOrgData, primaryContactPhone: value })}
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            </div>
          </div>
        );

      case 'personal-address':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Provide your personal address details.
              </p>
            </div>
            
            <div className="space-y-4">
              <ValidatedInput
                label="Address Line 1"
                fieldKey="registeredAddress.line1"
                value={newOrgData.registeredAddress.line1}
                onChange={(value) => setNewOrgData({ 
                  ...newOrgData, 
                  registeredAddress: { ...newOrgData.registeredAddress, line1: value }
                })}
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={newOrgData.registeredAddress.line2}
                  onChange={(e) => setNewOrgData({ 
                    ...newOrgData, 
                    registeredAddress: { ...newOrgData.registeredAddress, line2: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="City"
                  fieldKey="registeredAddress.city"
                  value={newOrgData.registeredAddress.city}
                  onChange={(value) => setNewOrgData({ 
                    ...newOrgData, 
                    registeredAddress: { ...newOrgData.registeredAddress, city: value }
                  })}
                  required={true}
                  touchedFields={touchedFields}
                  attemptedNext={attemptedNext}
                  markFieldTouched={markFieldTouched}
                />
                
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    County/State
                  </label>
                  <input
                    type="text"
                    value={newOrgData.registeredAddress.county}
                    onChange={(e) => setNewOrgData({ 
                      ...newOrgData, 
                      registeredAddress: { ...newOrgData.registeredAddress, county: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ValidatedInput
                  label="Postcode / ZIP Code"
                  fieldKey="registeredAddress.postcode"
                  value={newOrgData.registeredAddress.postcode}
                  onChange={(value) => setNewOrgData({ 
                    ...newOrgData, 
                    registeredAddress: { ...newOrgData.registeredAddress, postcode: value }
                  })}
                  required={true}
                  touchedFields={touchedFields}
                  attemptedNext={attemptedNext}
                  markFieldTouched={markFieldTouched}
                />
                
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    Country *
                  </label>
                  <select
                    value={newOrgData.registeredAddress.country}
                    onChange={(e) => setNewOrgData({ 
                      ...newOrgData, 
                      registeredAddress: { ...newOrgData.registeredAddress, country: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  >
                    <option value="">Select country...</option>
                    {/* European Countries */}
                    <option value="Austria">Austria</option>
                    <option value="Belgium">Belgium</option>
                    <option value="Bulgaria">Bulgaria</option>
                    <option value="Croatia">Croatia</option>
                    <option value="Cyprus">Cyprus</option>
                    <option value="Czech Republic">Czech Republic</option>
                    <option value="Denmark">Denmark</option>
                    <option value="Estonia">Estonia</option>
                    <option value="Finland">Finland</option>
                    <option value="France">France</option>
                    <option value="Germany">Germany</option>
                    <option value="Greece">Greece</option>
                    <option value="Hungary">Hungary</option>
                    <option value="Iceland">Iceland</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Italy">Italy</option>
                    <option value="Latvia">Latvia</option>
                    <option value="Liechtenstein">Liechtenstein</option>
                    <option value="Lithuania">Lithuania</option>
                    <option value="Luxembourg">Luxembourg</option>
                    <option value="Malta">Malta</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="Norway">Norway</option>
                    <option value="Poland">Poland</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Romania">Romania</option>
                    <option value="Slovakia">Slovakia</option>
                    <option value="Slovenia">Slovenia</option>
                    <option value="Spain">Spain</option>
                    <option value="Sweden">Sweden</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="United Kingdom">United Kingdom</option>
                    {/* Non-European Countries */}
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="Japan">Japan</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Hong Kong">Hong Kong</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'portfolio':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Provide details about your organization&#39;s portfolio mix and gross written premiums.
              </p>
            </div>
            
            <div className="space-y-6">
              {newOrgData.membershipType === 'corporate' && newOrgData.organizationType === 'MGA' && (
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-2">
                    Annual Gross Written Premiums *
                  </label>
                  <select
                    value={newOrgData.grossWrittenPremiums}
                    onChange={(e) => {
                      setNewOrgData({ 
                        ...newOrgData, 
                        grossWrittenPremiums: e.target.value as typeof newOrgData.grossWrittenPremiums
                      });
                      markFieldTouched('grossWrittenPremiums');
                    }}
                    onBlur={() => markFieldTouched('grossWrittenPremiums')}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
                      shouldShowValidation('grossWrittenPremiums', newOrgData.grossWrittenPremiums !== '') ? 'border-red-300' : 'border-fase-light-gold'
                    }`}
                  >
                    <option value="">Select premium bracket</option>
                    <option value="<10m">Less than €10M</option>
                    <option value="10-20m">€10M - €20M</option>
                    <option value="20-50m">€20M - €50M</option>
                    <option value="50-100m">€50M - €100M</option>
                    <option value="100-500m">€100M - €500M</option>
                    <option value="500m+">€500M+</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Portfolio Mix by Line of Business
                </label>
                <p className="text-xs text-fase-black mb-3">
                  Provide a percentage breakdown of your business across different lines
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Motor', 'Property', 'Liability', 'Marine', 'Aviation', 'Energy',
                    'Cyber', 'Professional Indemnity', 'Directors & Officers', 'Financial Lines',
                    'Specialty', 'Reinsurance'
                  ].map((lineOfBusiness) => (
                    <div key={lineOfBusiness} className="flex items-center gap-3">
                      <label className="flex-1 text-sm text-fase-black">{lineOfBusiness}</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={newOrgData.portfolioMix[lineOfBusiness] || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                            setNewOrgData({
                              ...newOrgData,
                              portfolioMix: {
                                ...newOrgData.portfolioMix,
                                [lineOfBusiness]: value
                              }
                            });
                          }}
                          className="w-16 px-2 py-1 border border-fase-light-gold rounded text-center focus:outline-none focus:ring-1 focus:ring-fase-navy"
                        />
                        <span className="text-xs text-fase-black">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 p-3 bg-fase-cream rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-fase-black">Total Percentage (Approximate):</span>
                    <span className="font-medium text-fase-navy">
                      {Object.values(newOrgData.portfolioMix).reduce((sum, val) => sum + (val || 0), 0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'carrier-details':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Please provide information about your carrier organization and the types of insurance you provide.
              </p>
            </div>
            
            <ValidatedSelect
              label="Carrier Type"
              fieldKey="carrierType"
              value={newOrgData.carrierType}
              onChange={(value) => setNewOrgData({ ...newOrgData, carrierType: value })}
              required={true}
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
              options={[
                { value: '', label: 'Select carrier type...' },
                { value: 'lloyds-syndicate', label: "Lloyd's Syndicate" },
                { value: 'european-insurer', label: 'European Insurer' },
                { value: 'reinsurer', label: 'Reinsurer' },
                { value: 'captive', label: 'Captive Insurance Company' },
                { value: 'mutual', label: 'Mutual Insurance Company' },
                { value: 'other', label: 'Other' }
              ]}
            />
            
            <ValidatedInput
              label="License/Registration Number"
              fieldKey="licenseNumber"
              value={newOrgData.licenseNumber}
              onChange={(value) => setNewOrgData({ ...newOrgData, licenseNumber: value })}
              placeholder="Enter your license or registration number"
              required={false}
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
            />
            
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Lines of Business Offered *
              </label>
              <p className="text-xs text-fase-black mb-3">
                Select the insurance lines your organization provides capacity for
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  'Motor', 'Property', 'Liability', 'Marine', 'Aviation', 'Energy',
                  'Cyber', 'Professional Indemnity', 'Directors & Officers', 'Trade Credit',
                  'Political Risk', 'Terrorism', 'Catastrophe', 'Other Specialty'
                ].map((line) => (
                  <label key={line} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newOrgData.linesOfBusiness.includes(line)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewOrgData({
                            ...newOrgData,
                            linesOfBusiness: [...newOrgData.linesOfBusiness, line]
                          });
                        } else {
                          setNewOrgData({
                            ...newOrgData,
                            linesOfBusiness: newOrgData.linesOfBusiness.filter(l => l !== line)
                          });
                        }
                        markFieldTouched('linesOfBusiness');
                      }}
                      className="rounded border-fase-light-gold text-fase-navy focus:ring-fase-navy"
                    />
                    <span className="text-sm text-fase-black">{line}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <ValidatedSelect
              label="Capital Base"
              fieldKey="capitalBase"
              value={newOrgData.capitalBase}
              onChange={(value) => setNewOrgData({ ...newOrgData, capitalBase: value })}
              required={false}
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
              options={[
                { value: '', label: 'Select capital base...' },
                { value: '<50m', label: 'Less than €50M' },
                { value: '50-100m', label: '€50M - €100M' },
                { value: '100-500m', label: '€100M - €500M' },
                { value: '500m-1b', label: '€500M - €1B' },
                { value: '1b+', label: 'Over €1B' }
              ]}
            />
          </div>
        );

      case 'service-details':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Please describe the services your organization provides to the insurance industry.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Service Categories *
              </label>
              <p className="text-xs text-fase-black mb-3">
                Select all categories that describe your services
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'Technology/Software', 'Legal Services', 'Consulting', 'Actuarial Services',
                  'Claims Management', 'Risk Management', 'Compliance & Regulatory',
                  'Data & Analytics', 'Marketing & Communications', 'Financial Services',
                  'HR & Recruitment', 'Training & Education', 'Facilities Management', 'Other'
                ].map((category) => (
                  <label key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newOrgData.serviceCategories.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewOrgData({
                            ...newOrgData,
                            serviceCategories: [...newOrgData.serviceCategories, category]
                          });
                        } else {
                          const updatedCategories = newOrgData.serviceCategories.filter(c => c !== category);
                          setNewOrgData({
                            ...newOrgData,
                            serviceCategories: updatedCategories,
                            // Clear service description if "Other" is deselected
                            serviceDescription: category === 'Other' ? '' : newOrgData.serviceDescription
                          });
                        }
                        markFieldTouched('serviceCategories');
                      }}
                      className="rounded border-fase-light-gold text-fase-navy focus:ring-fase-navy"
                    />
                    <span className="text-sm text-fase-black">{category}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {newOrgData.serviceCategories.includes('Other') && (
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Service Description *
                </label>
                <textarea
                  value={newOrgData.serviceDescription}
                  onChange={(e) => {
                    setNewOrgData({ ...newOrgData, serviceDescription: e.target.value });
                    markFieldTouched('serviceDescription');
                  }}
                  onBlur={() => markFieldTouched('serviceDescription')}
                  placeholder="Describe your services and how they support the insurance industry..."
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent ${
                    shouldShowValidation('serviceDescription', newOrgData.serviceDescription.trim() !== '') ? 'border-red-300' : 'border-fase-light-gold'
                  }`}
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Target Client Types
              </label>
              <p className="text-xs text-fase-black mb-3">
                Who are your primary clients in the insurance ecosystem?
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'MGAs', 'Insurance Carriers', 'Reinsurers', 'Brokers',
                  'Lloyd\'s Syndicates', 'Captives', 'Risk Managers', 'Other'
                ].map((client) => (
                  <label key={client} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newOrgData.targetClients.includes(client)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewOrgData({
                            ...newOrgData,
                            targetClients: [...newOrgData.targetClients, client]
                          });
                        } else {
                          setNewOrgData({
                            ...newOrgData,
                            targetClients: newOrgData.targetClients.filter(c => c !== client)
                          });
                        }
                      }}
                      className="rounded border-fase-light-gold text-fase-navy focus:ring-fase-navy"
                    />
                    <span className="text-sm text-fase-black">{client}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <ValidatedInput
              label="Professional Certifications"
              fieldKey="certifications"
              value={newOrgData.certifications}
              onChange={(value) => setNewOrgData({ ...newOrgData, certifications: value })}
              placeholder="List any relevant professional certifications or accreditations"
              required={false}
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
            />
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">
                Choose Payment Method
              </h3>
              <p className="text-fase-black mb-4">
                Select how you would like to pay for your FASE membership.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div 
                className="p-6 border-2 border-fase-light-gold rounded-lg hover:border-fase-navy cursor-pointer transition-colors"
                onClick={() => {
                  setIsRedirectingToPayment(true);
                  // Handle Stripe checkout
                  const handleStripeCheckout = async () => {
                    try {
                      // First, submit the application to create the member document
                      await submitApplicationSilently();
                      
                      // Then create the Stripe checkout session
                      const response = await fetch('/api/create-checkout-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          organizationName: newOrgData.organizationName || `${newOrgData.primaryContactName} (Individual)`,
                          organizationType: newOrgData.organizationType,
                          membershipType: newOrgData.membershipType,
                          grossWrittenPremiums: newOrgData.grossWrittenPremiums,
                          hasOtherAssociations: newOrgData.hasOtherAssociations,
                          otherAssociationMemberships: newOrgData.otherAssociationMemberships,
                          userEmail: user?.email,
                          userId: user?.uid
                        })
                      });
                      
                      if (!response.ok) {
                        throw new Error('Failed to create checkout session');
                      }
                      
                      const { url } = await response.json();
                      window.location.href = url;
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Failed to redirect to payment. Please try again.');
                      setIsRedirectingToPayment(false);
                    }
                  };
                  
                  handleStripeCheckout();
                }}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-fase-navy mb-2">Pay with Card</h4>
                  <p className="text-sm text-fase-black">
                    Secure payment via Stripe
                  </p>
                  {isRedirectingToPayment && (
                    <div className="mt-3 text-xs text-blue-600">
                      Redirecting to payment...
                    </div>
                  )}
                </div>
              </div>
              
              <div 
                className="p-6 border-2 border-fase-light-gold rounded-lg hover:border-fase-navy cursor-pointer transition-colors"
                onClick={() => {
                  setIsRedirectingToPayment(true);
                  // Handle invoice creation
                  const handleInvoiceCreation = async () => {
                    try {
                      // First, submit the application to create the member document
                      await submitApplicationForInvoice();
                      
                      // Then send the invoice
                      const response = await fetch('/api/send-invoice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          organizationName: newOrgData.organizationName || `${newOrgData.primaryContactName} (Individual)`,
                          organizationType: newOrgData.organizationType,
                          membershipType: newOrgData.membershipType,
                          grossWrittenPremiums: newOrgData.grossWrittenPremiums,
                          hasOtherAssociations: newOrgData.hasOtherAssociations,
                          invoicingContact: newOrgData.membershipType === 'individual' 
                            ? {
                                name: newOrgData.primaryContactName,
                                email: newOrgData.primaryContactEmail,
                                phone: newOrgData.primaryContactPhone,
                                role: newOrgData.primaryContactRole
                              }
                            : newOrgData.invoicingContact,
                          invoicingAddress: newOrgData.membershipType === 'individual'
                            ? {
                                line1: newOrgData.registeredAddress.line1,
                                line2: newOrgData.registeredAddress.line2,
                                city: newOrgData.registeredAddress.city,
                                county: newOrgData.registeredAddress.county,
                                postcode: newOrgData.registeredAddress.postcode,
                                country: newOrgData.registeredAddress.country,
                                sameAsRegistered: true
                              }
                            : newOrgData.invoicingAddress,
                          userId: user?.uid
                        })
                      });
                      
                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to send invoice');
                      }
                      
                      const invoiceData = await response.json();
                      
                      // Show success message
                      const invoiceEmail = newOrgData.membershipType === 'individual' 
                        ? newOrgData.primaryContactEmail 
                        : newOrgData.invoicingContact.email;
                      
                      alert(`Invoice sent successfully! 
                      
Invoice has been sent to: ${invoiceEmail}
Amount: €${invoiceData.amount}
Due Date: ${invoiceData.dueDate}

Your application has been submitted and will be processed once payment is received via bank transfer.`);
                      
                      // Redirect to member portal
                      router.push('/member-portal?invoice_sent=true');
                    } catch (error) {
                      console.error('Error:', error);
                      alert(`Failed to send invoice: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
                      setIsRedirectingToPayment(false);
                    }
                  };
                  
                  handleInvoiceCreation();
                }}
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="font-medium text-fase-navy mb-2">Invoice Payment</h4>
                  <p className="text-sm text-fase-black">
                    Receive an invoice and pay later
                  </p>
                  {isRedirectingToPayment && (
                    <div className="mt-3 text-xs text-blue-600">
                      Creating invoice...
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-fase-cream p-4 rounded-lg">
              <h4 className="font-medium text-fase-navy mb-2">Membership Fee Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-fase-black">Membership Type:</span>
                  <span className="text-fase-navy">
                    {newOrgData.membershipType === 'individual' 
                      ? 'Individual' 
                      : `${newOrgData.organizationType.charAt(0).toUpperCase() + newOrgData.organizationType.slice(1)}`}
                  </span>
                </div>
                {newOrgData.membershipType === 'corporate' && newOrgData.organizationType === 'MGA' && newOrgData.grossWrittenPremiums && (
                  <div className="flex justify-between">
                    <span className="text-fase-black">Premium Bracket:</span>
                    <span className="text-fase-navy">{newOrgData.grossWrittenPremiums}</span>
                  </div>
                )}
                {newOrgData.hasOtherAssociations && newOrgData.otherAssociationMemberships && newOrgData.membershipType === 'corporate' && (
                  <div className="flex justify-between">
                    <span className="text-green-600 text-sm">Association Member Discount (20%):</span>
                    <span className="text-green-600 text-sm">Applied</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t border-fase-light-gold pt-2 mt-2">
                  <span className="text-fase-navy">Annual Fee:</span>
                  <span className="text-fase-navy">
                    €{calculateAnnualFee(newOrgData.membershipType, newOrgData.organizationType, newOrgData.grossWrittenPremiums, newOrgData.hasOtherAssociations).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'submit':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">
                Review and Submit Application
              </h3>
              <p className="text-fase-black mb-6">
                Please review your membership application details before submitting.
              </p>
            </div>
            
            <div className="bg-fase-cream p-6 rounded-lg">
              <h4 className="font-medium text-fase-navy mb-4">Application Summary</h4>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <div>
                    <span className="text-fase-black font-medium">Organization:</span>
                    <p className="text-fase-navy">{newOrgData.organizationName}</p>
                  </div>
                  <div>
                    <span className="text-fase-black font-medium">Type:</span>
                    <p className="text-fase-navy">{newOrgData.membershipType === 'individual' ? 'Individual' : `${newOrgData.organizationType.charAt(0).toUpperCase() + newOrgData.organizationType.slice(1)} Corporate`}</p>
                  </div>
                  <div>
                    <span className="text-fase-black font-medium">Primary Contact:</span>
                    <p className="text-fase-navy">{newOrgData.primaryContactName}</p>
                    <p className="text-fase-black">{newOrgData.primaryContactEmail}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {newOrgData.grossWrittenPremiums && (
                    <div>
                      <span className="text-fase-black font-medium">GWP Bracket:</span>
                      <p className="text-fase-navy">{newOrgData.grossWrittenPremiums}</p>
                    </div>
                  )}
                  {newOrgData.hasOtherAssociations && newOrgData.otherAssociationMemberships && newOrgData.membershipType === 'corporate' && (
                    <div>
                      <span className="text-green-600 font-medium text-sm">Association Member Discount:</span>
                      <p className="text-green-600 font-semibold text-sm">20% Applied</p>
                    </div>
                  )}
                  <div>
                    <span className="text-fase-black font-medium">Annual Fee:</span>
                    <p className="text-fase-navy font-semibold">
                      €{calculateAnnualFee(newOrgData.membershipType, newOrgData.organizationType, newOrgData.grossWrittenPremiums, newOrgData.hasOtherAssociations).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="text-blue-800 font-medium mb-1">Next Steps</p>
                  <p className="text-blue-700">
                    After submitting your application, our team will review it within 2-3 business days. 
                    You&#39;ll receive an email confirmation once your membership is approved.
                  </p>
                </div>
              </div>
            </div>
            
            <ValidatedCheckbox
              label={<>I agree to FASE&#39;s <a href="#" className="text-fase-navy hover:underline">Terms of Service</a> and confirm that all information provided is accurate and complete.</>}
              fieldKey="termsAgreed"
              checked={termsAgreed}
              onChange={setTermsAgreed}
              required={true}
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
            />
            
            <div className="mt-8 pt-6 border-t border-fase-light-gold">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-blue-800 mb-2">Submit Options</h4>
                <p className="text-sm text-blue-700">
                  You can submit your application now for review, or proceed to payment to activate your membership immediately.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="secondary"
                  onClick={handleSubmitWithoutPayment}
                  disabled={!termsAgreed}
                  className="flex-1"
                >
                  Submit without Paying
                </Button>
                
                <Button
                  variant="primary"
                  onClick={() => {
                    // This would normally go to payment processing
                    alert('Payment integration coming soon! For now, use "Submit without Paying".');
                  }}
                  disabled={!termsAgreed}
                  className="flex-1"
                >
                  Proceed to Payment
                </Button>
              </div>
              
              <p className="text-xs text-fase-black mt-3 text-center">
                Applications submitted without payment will be reviewed and you&#39;ll receive payment instructions via email.
              </p>
            </div>
          </div>
        );

      case 'key-contacts':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Add key contacts for your organization (optional). These are the people who will have access to the Knowledge Hub and can represent your organization.
              </p>
            </div>
            
            <div className="space-y-4">
              {newOrgData.keyContacts.map((contact, index) => (
                <div key={index} className="bg-fase-cream p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <ValidatedInput
                      label="Full Name"
                      fieldKey={`keyContacts.${index}.name`}
                      value={contact.name}
                      onChange={(value) => {
                        const updatedContacts = [...newOrgData.keyContacts];
                        updatedContacts[index] = { ...contact, name: value };
                        setNewOrgData({ ...newOrgData, keyContacts: updatedContacts });
                      }}
                      placeholder="Enter contact name"
                      touchedFields={touchedFields}
                      attemptedNext={attemptedNext}
                      markFieldTouched={markFieldTouched}
                    />
                    
                    <ValidatedInput
                      label="Title"
                      fieldKey={`keyContacts.${index}.role`}
                      value={contact.role}
                      onChange={(value) => {
                        const updatedContacts = [...newOrgData.keyContacts];
                        updatedContacts[index] = { ...contact, role: value };
                        setNewOrgData({ ...newOrgData, keyContacts: updatedContacts });
                      }}
                      placeholder="Enter role or title"
                      touchedFields={touchedFields}
                      attemptedNext={attemptedNext}
                      markFieldTouched={markFieldTouched}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ValidatedInput
                      label="Email Address"
                      fieldKey={`keyContacts.${index}.email`}
                      value={contact.email}
                      onChange={(value) => {
                        const updatedContacts = [...newOrgData.keyContacts];
                        updatedContacts[index] = { ...contact, email: value };
                        setNewOrgData({ ...newOrgData, keyContacts: updatedContacts });
                      }}
                      type="email"
                      placeholder="Enter email address"
                      touchedFields={touchedFields}
                      attemptedNext={attemptedNext}
                      markFieldTouched={markFieldTouched}
                    />
                    
                    <ValidatedInput
                      label="Phone Number"
                      fieldKey={`keyContacts.${index}.phone`}
                      value={contact.phone}
                      onChange={(value) => {
                        const updatedContacts = [...newOrgData.keyContacts];
                        updatedContacts[index] = { ...contact, phone: value };
                        setNewOrgData({ ...newOrgData, keyContacts: updatedContacts });
                      }}
                      type="tel"
                      placeholder="Enter phone number"
                      touchedFields={touchedFields}
                      attemptedNext={attemptedNext}
                      markFieldTouched={markFieldTouched}
                    />
                  </div>
                  
                  {newOrgData.keyContacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updatedContacts = newOrgData.keyContacts.filter((_, i) => i !== index);
                        setNewOrgData({ ...newOrgData, keyContacts: updatedContacts });
                      }}
                      className="mt-4 text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove Contact
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  setNewOrgData({
                    ...newOrgData,
                    keyContacts: [...newOrgData.keyContacts, { name: '', role: '', email: '', phone: '' }]
                  });
                }}
                className="w-full py-3 border-2 border-dashed border-fase-light-gold hover:border-fase-navy text-fase-black hover:text-fase-navy rounded-lg transition-colors"
              >
                + Add Another Contact
              </button>
            </div>
          </div>
        );

      case 'invoicing-address':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Provide the address where invoices should be sent.
              </p>
            </div>
            
            <ValidatedCheckbox
              label="Same as registered address"
              fieldKey="invoicingAddress.sameAsRegistered"
              checked={newOrgData.invoicingAddress.sameAsRegistered}
              onChange={(checked) => {
                if (checked) {
                  setNewOrgData({
                    ...newOrgData,
                    invoicingAddress: {
                      ...newOrgData.invoicingAddress,
                      sameAsRegistered: true,
                      line1: newOrgData.registeredAddress.line1,
                      line2: newOrgData.registeredAddress.line2,
                      city: newOrgData.registeredAddress.city,
                      county: newOrgData.registeredAddress.county,
                      postcode: newOrgData.registeredAddress.postcode,
                      country: newOrgData.registeredAddress.country
                    }
                  });
                } else {
                  setNewOrgData({
                    ...newOrgData,
                    invoicingAddress: {
                      ...newOrgData.invoicingAddress,
                      sameAsRegistered: false,
                      line1: '',
                      line2: '',
                      city: '',
                      county: '',
                      postcode: '',
                      country: ''
                    }
                  });
                }
              }}
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
            />
            
            {!newOrgData.invoicingAddress.sameAsRegistered && (
              <div className="space-y-4">
                <ValidatedInput
                  label="Address Line 1"
                  fieldKey="invoicingAddress.line1"
                  value={newOrgData.invoicingAddress.line1}
                  onChange={(value) => setNewOrgData({
                    ...newOrgData,
                    invoicingAddress: { ...newOrgData.invoicingAddress, line1: value }
                  })}
                  placeholder="Enter street address"
                  required={true}
                  touchedFields={touchedFields}
                  attemptedNext={attemptedNext}
                  markFieldTouched={markFieldTouched}
                />
                
                <ValidatedInput
                  label="Address Line 2"
                  fieldKey="invoicingAddress.line2"
                  value={newOrgData.invoicingAddress.line2 || ''}
                  onChange={(value) => setNewOrgData({
                    ...newOrgData,
                    invoicingAddress: { ...newOrgData.invoicingAddress, line2: value }
                  })}
                  placeholder="Apartment, suite, etc. (optional)"
                  touchedFields={touchedFields}
                  attemptedNext={attemptedNext}
                  markFieldTouched={markFieldTouched}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ValidatedInput
                    label="City"
                    fieldKey="invoicingAddress.city"
                    value={newOrgData.invoicingAddress.city}
                    onChange={(value) => setNewOrgData({
                      ...newOrgData,
                      invoicingAddress: { ...newOrgData.invoicingAddress, city: value }
                    })}
                    placeholder="Enter city"
                    required={true}
                    touchedFields={touchedFields}
                    attemptedNext={attemptedNext}
                    markFieldTouched={markFieldTouched}
                  />
                  
                  <ValidatedInput
                    label="County/State"
                    fieldKey="invoicingAddress.county"
                    value={newOrgData.invoicingAddress.county || ''}
                    onChange={(value) => setNewOrgData({
                      ...newOrgData,
                      invoicingAddress: { ...newOrgData.invoicingAddress, county: value }
                    })}
                    placeholder="Enter county or state"
                    touchedFields={touchedFields}
                    attemptedNext={attemptedNext}
                    markFieldTouched={markFieldTouched}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ValidatedInput
                    label="Postcode / ZIP Code"
                    fieldKey="invoicingAddress.postcode"
                    value={newOrgData.invoicingAddress.postcode}
                    onChange={(value) => setNewOrgData({
                      ...newOrgData,
                      invoicingAddress: { ...newOrgData.invoicingAddress, postcode: value }
                    })}
                    placeholder="Enter postcode"
                    required={true}
                    touchedFields={touchedFields}
                    attemptedNext={attemptedNext}
                    markFieldTouched={markFieldTouched}
                  />
                  
                  <ValidatedInput
                    label="Country"
                    fieldKey="invoicingAddress.country"
                    value={newOrgData.invoicingAddress.country}
                    onChange={(value) => setNewOrgData({
                      ...newOrgData,
                      invoicingAddress: { ...newOrgData.invoicingAddress, country: value }
                    })}
                    placeholder="Enter country"
                    required={true}
                    touchedFields={touchedFields}
                    attemptedNext={attemptedNext}
                    markFieldTouched={markFieldTouched}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'invoicing-contact':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Provide contact details for invoicing and billing inquiries.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ValidatedInput
                label="Contact Name"
                fieldKey="invoicingContact.name"
                value={newOrgData.invoicingContact.name}
                onChange={(value) => setNewOrgData({
                  ...newOrgData,
                  invoicingContact: { ...newOrgData.invoicingContact, name: value }
                })}
                placeholder="Enter contact name"
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <ValidatedInput
                label="Title"
                fieldKey="invoicingContact.role"
                value={newOrgData.invoicingContact.role}
                onChange={(value) => setNewOrgData({
                  ...newOrgData,
                  invoicingContact: { ...newOrgData.invoicingContact, role: value }
                })}
                placeholder="Enter role or title"
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ValidatedInput
                label="Email Address"
                fieldKey="invoicingContact.email"
                value={newOrgData.invoicingContact.email}
                onChange={(value) => setNewOrgData({
                  ...newOrgData,
                  invoicingContact: { ...newOrgData.invoicingContact, email: value }
                })}
                type="email"
                placeholder="Enter email address"
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
              
              <ValidatedInput
                label="Phone Number"
                fieldKey="invoicingContact.phone"
                value={newOrgData.invoicingContact.phone}
                onChange={(value) => setNewOrgData({
                  ...newOrgData,
                  invoicingContact: { ...newOrgData.invoicingContact, phone: value }
                })}
                type="tel"
                placeholder="Enter phone number"
                required={true}
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            </div>
          </div>
        );

      case 'distribution':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Describe your distribution strategy and channels.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Distribution Channels
              </label>
              <div className="space-y-2">
                {['Direct to Customer', 'Broker Network', 'Digital Platforms', 'Partners/Affiliates', 'Wholesale', 'Other'].map(channel => (
                  <label key={channel} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newOrgData.distributionChannels.includes(channel)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewOrgData({
                            ...newOrgData,
                            distributionChannels: [...newOrgData.distributionChannels, channel]
                          });
                        } else {
                          setNewOrgData({
                            ...newOrgData,
                            distributionChannels: newOrgData.distributionChannels.filter(c => c !== channel)
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-fase-black">{channel}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <ValidatedInput
              label="Broker Network Description"
              fieldKey="brokerNetwork"
              value={newOrgData.brokerNetwork}
              onChange={(value) => setNewOrgData({ ...newOrgData, brokerNetwork: value })}
              placeholder="Describe your broker network (optional)"
              touchedFields={touchedFields}
              attemptedNext={attemptedNext}
              markFieldTouched={markFieldTouched}
            />
          </div>
        );


      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Additional information about your organization (optional).
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Business Plan Summary
              </label>
              <textarea
                value={newOrgData.businessPlan}
                onChange={(e) => setNewOrgData({ ...newOrgData, businessPlan: e.target.value })}
                placeholder="Provide a brief summary of your business plan and strategic objectives"
                rows={4}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Marketing Strategy
              </label>
              <textarea
                value={newOrgData.marketingStrategy}
                onChange={(e) => setNewOrgData({ ...newOrgData, marketingStrategy: e.target.value })}
                placeholder="Describe your marketing strategy and customer acquisition approach"
                rows={4}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'demographics':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-fase-black mb-4">
                Demographic information about your organization (optional).
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">
                  Employee Count
                </label>
                <select
                  value={newOrgData.employeeCount}
                  onChange={(e) => setNewOrgData({ ...newOrgData, employeeCount: e.target.value })}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                >
                  <option value="">Select employee count</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-100">51-100 employees</option>
                  <option value="101-500">101-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
              
              <ValidatedInput
                label="Year Established"
                fieldKey="yearEstablished"
                value={newOrgData.yearEstablished}
                onChange={(value) => setNewOrgData({ ...newOrgData, yearEstablished: value })}
                placeholder="Enter year established"
                type="number"
                touchedFields={touchedFields}
                attemptedNext={attemptedNext}
                markFieldTouched={markFieldTouched}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Ownership Structure
              </label>
              <select
                value={newOrgData.ownershipStructure}
                onChange={(e) => setNewOrgData({ ...newOrgData, ownershipStructure: e.target.value })}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="">Select ownership structure</option>
                <option value="private">Private Company</option>
                <option value="public">Public Company</option>
                <option value="partnership">Partnership</option>
                <option value="llp">Limited Liability Partnership</option>
                <option value="subsidiary">Subsidiary</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-fase-black">
              Step content for &quot;{currentStepData?.title}&quot; coming soon...
            </p>
          </div>
        );
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
        <div className="animate-pulse">
          <div className="h-8 bg-fase-cream rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-fase-cream rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Header */}
      <Header currentPage="member-portal" />
      

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-80 bg-white border border-fase-light-gold rounded-lg p-6 h-fit">
            <h3 className="font-noto-serif font-semibold text-fase-navy mb-4">Application Progress</h3>
            <div className="space-y-1">
              {membershipSteps.map((step, index) => {
                // Check if all previous required steps are valid
                const canAccessStep = () => {
                  if (index <= currentStep) return true;
                  
                  for (let i = 0; i < index; i++) {
                    const prevStep = membershipSteps[i];
                    if (prevStep.required) {
                      const isValid = checkStepValidation(prevStep.id);
                      if (!isValid) return false;
                    }
                  }
                  return true;
                };
                
                const isAccessible = canAccessStep();
                const isClickable = index <= currentStep;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center p-3 rounded-lg transition-colors ${
                      index === currentStep
                        ? 'bg-fase-navy text-white'
                        : index < currentStep
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                        : isAccessible
                        ? 'text-fase-black hover:bg-fase-cream cursor-pointer'
                        : 'text-fase-cream cursor-not-allowed opacity-60'
                    }`}
                    onClick={() => {
                      if (isClickable) {
                        setCurrentStep(index);
                      }
                    }}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3 ${
                      index === currentStep
                        ? 'bg-white text-fase-navy'
                        : index < currentStep
                        ? 'bg-green-500 text-white'
                        : isAccessible
                        ? 'bg-fase-light-gold text-fase-black'
                        : 'bg-gray-300 text-gray-400'
                    }`}>
                      {index < currentStep ? '✓' : index + 1}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm ${index === currentStep ? 'font-medium' : ''}`}>
                        {step.title}
                      </div>
                      {step.required && (
                        <div className="text-xs opacity-75">Required</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white border border-fase-light-gold rounded-lg p-8">
              {/* Step Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-2">
                  {membershipSteps[currentStep]?.title}
                </h2>
                <div className="flex items-center text-sm text-fase-black">
                  <span>Step {currentStep + 1} of {membershipSteps.length}</span>
                  {membershipSteps[currentStep]?.required && (
                    <span className="ml-2 text-red-600">*Required</span>
                  )}
                </div>
              </div>

              {/* Step Content */}
              <div className="mb-8">
                {renderStepContent()}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t border-fase-light-gold">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                >
                  ← Previous
                </Button>
                
                <div className="flex gap-3">
                  {currentStep < membershipSteps.length - 1 ? (
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (isCurrentStepValid()) {
                          // Reset attempt flag on successful progression
                          setAttemptedNext(false);
                          // Skip to payment if this is step 16 (demographics)
                          if (currentStep === 16) {
                            setCurrentStep(17); // Jump to payment step
                          } else {
                            setCurrentStep(currentStep + 1);
                          }
                        } else {
                          // Mark that user attempted to proceed with invalid data
                          setAttemptedNext(true);
                        }
                      }}
                      disabled={!isCurrentStepValid()}
                    >
                      {currentStep === 16 ? 'Continue to Payment →' : 'Next →'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (isCurrentStepValid()) {
                          // Reset attempt flag on successful progression
                          setAttemptedNext(false);
                          // Handle final submission based on current step
                          if (membershipSteps[currentStep]?.id === 'payment') {
                            // Move to submit step
                            setCurrentStep(currentStep + 1);
                          } else if (membershipSteps[currentStep]?.id === 'submit') {
                            // Handle final submission
                            alert('Membership application submitted! You will receive a confirmation email shortly.');
                            router.push('/member-portal');
                          }
                        } else {
                          // Mark that user attempted to proceed with invalid data
                          setAttemptedNext(true);
                        }
                      }}
                      disabled={!isCurrentStepValid()}
                    >
                      {membershipSteps[currentStep]?.id === 'payment' ? 'Continue to Review →' : 'Submit Application'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}