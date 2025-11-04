'use client';

import { Member } from './registration-hooks';
import { validatePassword } from './form-components';

// Step validation functions
export const validateStep1 = (
  firstName: string,
  surname: string,
  email: string,
  password: string,
  confirmPassword: string
): string | null => {
  if (!firstName.trim()) return "First name is required";
  if (!surname.trim()) return "Surname is required";
  if (!email.trim()) return "Email is required";
  if (!password) return "Password is required";
  if (!confirmPassword) return "Please confirm your password";
  
  const { isValid } = validatePassword(password);
  if (!isValid) return "Password does not meet requirements";
  
  if (password !== confirmPassword) return "Passwords do not match";
  
  return null;
};

export const validateStep2 = (
  membershipType: 'individual' | 'corporate',
  organizationName: string,
  organizationType: string | undefined,
  members: Member[],
  firstName?: string,
  surname?: string
): string | null => {
  const fullName = firstName && surname ? `${firstName} ${surname}`.trim() : '';
  const orgName = membershipType === 'individual' ? fullName : organizationName;
  
  if (!orgName.trim()) return "Organization name is required";
  
  if (membershipType === 'corporate' && !organizationType) {
    return "Organization type is required for corporate memberships";
  }
  
  // Validate members for corporate membership
  if (membershipType === 'corporate') {
    if (members.length === 0) {
      return "At least one team member is required";
    }
    
    const hasPrimaryContact = members.some(m => m.isPrimaryContact);
    if (!hasPrimaryContact) {
      return "You must designate one person as the account administrator";
    }
    
    // Validate each member
    for (const member of members) {
      if (!member.firstName.trim() || !member.lastName.trim()) {
        return "All team members must have first and last names";
      }
      if (!member.email.trim()) {
        return "All team members must have email addresses";
      }
      if (!member.jobTitle.trim()) {
        return "All team members must have job titles";
      }
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(member.email)) {
        return `Invalid email format for ${member.firstName} ${member.lastName}`;
      }
    }
    
    // Check for duplicate emails
    const emails = members.map(m => m.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      return "Each team member must have a unique email address";
    }
  }
  
  return null;
};

export const validateStep3 = (
  membershipType: 'individual' | 'corporate',
  organizationType: string | undefined,
  addressLine1: string,
  city: string,
  country: string,
  grossWrittenPremiums: string,
  hasOtherAssociations: boolean | null,
  otherAssociations: string[],
  gwpBillions?: string,
  gwpMillions?: string,
  gwpThousands?: string,
  // Carrier-specific fields
  carrierOrganizationType?: string,
  isDelegatingInEurope?: string,
  numberOfMGAs?: string,
  delegatingCountries?: string[],
  frontingOptions?: string,
  considerStartupMGAs?: string,
  // Service provider fields
  servicesProvided?: string[]
): string | null => {
  // Address validation
  if (!addressLine1.trim() || !city.trim() || !country.trim()) {
    return "Address information is required";
  }
  
  if (membershipType === 'corporate' && organizationType === 'MGA') {
    // Check if GWP is entered using the separate fields or the total field
    const hasGwpInput = gwpBillions || gwpMillions || gwpThousands || (grossWrittenPremiums && !isNaN(parseFloat(grossWrittenPremiums)) && parseFloat(grossWrittenPremiums) > 0);
    if (!hasGwpInput) {
      return "Gross written premiums are required for MGA memberships";
    }
  }
  
  if (hasOtherAssociations === null) {
    return "Please specify if your organization is a member of other European MGA associations";
  }
  
  if (hasOtherAssociations && otherAssociations.length === 0) {
    return "Please select at least one European MGA association you are a member of";
  }
  
  // Carrier validation - only for specific organization types
  if (membershipType === 'corporate' && organizationType === 'carrier') {
    // Only validate delegating/fronting/startup fields for specific carrier types
    if (carrierOrganizationType === 'insurance_company' || 
        carrierOrganizationType === 'reinsurance_company' || 
        carrierOrganizationType === 'lloyds_managing_agency') {
      
      if (!isDelegatingInEurope) {
        return "Europe delegation status is required";
      }
      
      if (isDelegatingInEurope === 'Yes') {
        if (!numberOfMGAs) {
          return "Number of MGAs is required";
        }
        if (!delegatingCountries || delegatingCountries.length === 0) {
          return "European delegation countries are required";
        }
      }
      
      if (!frontingOptions) {
        return "Fronting options selection is required";
      }
      
      if (!considerStartupMGAs) {
        return "Startup MGA consideration is required";
      }
    }
  }
  
  // Service provider validation (from git history)
  if (membershipType === 'corporate' && organizationType === 'provider') {
    if (!servicesProvided || servicesProvided.length === 0) {
      return "Service selection is required";
    }
  }
  
  return null;
};

// Individual field validators
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Basic phone validation - at least 10 digits
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10;
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

// Complex validation helpers
export const validateMemberData = (member: Member): string[] => {
  const errors: string[] = [];
  
  if (!validateRequired(member.firstName)) {
    errors.push('First name is required');
  }
  
  if (!validateRequired(member.lastName)) {
    errors.push('Last name is required');
  }
  
  if (!validateRequired(member.email)) {
    errors.push('Email is required');
  } else if (!validateEmail(member.email)) {
    errors.push('Invalid email format');
  }
  
  if (!validateRequired(member.jobTitle)) {
    errors.push('Job title is required');
  }
  
  if (member.phone && !validatePhone(member.phone)) {
    errors.push('Invalid phone number format');
  }
  
  return errors;
};

export const validateAllMembers = (members: Member[]): Record<string, string[]> => {
  const memberErrors: Record<string, string[]> = {};
  
  members.forEach(member => {
    const errors = validateMemberData(member);
    if (errors.length > 0) {
      memberErrors[member.id] = errors;
    }
  });
  
  return memberErrors;
};