import { PasswordRequirements, Member, MembershipType, RegistrationState } from './types';

// Password validation function
export const validatePassword = (password: string): PasswordRequirements => {
  return {
    length: password.length >= 8,
    capital: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
};

export const isPasswordValid = (password: string): boolean => {
  const requirements = validatePassword(password);
  return Object.values(requirements).every(Boolean);
};

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Member validation
export const validateMember = (member: Member, isRegistrant = false): string[] => {
  const errors: string[] = [];
  
  if (!member.firstName?.trim()) {
    errors.push('First name is required');
  }
  
  if (!member.lastName?.trim()) {
    errors.push('Last name is required');
  }
  
  if (!member.email?.trim()) {
    errors.push('Email is required');
  } else if (!isValidEmail(member.email)) {
    errors.push('Valid email is required');
  }
  
  if (!isRegistrant && !member.phone?.trim()) {
    errors.push('Phone number is required');
  }
  
  if (!member.jobTitle?.trim()) {
    errors.push('Job title is required');
  }
  
  return errors;
};

// Step validation functions
export const validateDataNoticeStep = (dataNoticeConsent: boolean): string | null => {
  if (!dataNoticeConsent) {
    return "Please consent to our data notice to continue";
  }
  return null;
};

export const validateCodeOfConductStep = (codeOfConductConsent: boolean): string | null => {
  if (!codeOfConductConsent) {
    return "Please consent to the Code of Conduct to continue";
  }
  return null;
};

export const validateAccountInfoStep = (state: RegistrationState): string | null => {
  const { firstName, surname, email, password, confirmPassword } = state;
  
  const authRequiredFields = ['firstName', 'surname', 'email', 'password', 'confirmPassword'];
  const authFieldValues = { firstName, surname, email, password, confirmPassword };
  
  const hasAllAuthFields = authRequiredFields.every(field => 
    authFieldValues[field as keyof typeof authFieldValues].trim() !== ''
  );
  
  if (!hasAllAuthFields) {
    return "All fields are required";
  }
  
  if (!isValidEmail(email)) {
    return "Please enter a valid email address";
  }
  
  if (!isPasswordValid(password)) {
    return "Password does not meet requirements";
  }
  
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  
  return null;
};

export const validateMembershipInfoStep = (state: RegistrationState): string | null => {
  const { membershipType, organizationName, organizationType, members, firstName, surname } = state;
  
  const fullName = `${firstName} ${surname}`.trim();
  const orgName = membershipType === 'individual' ? fullName : organizationName;
  
  if (!orgName.trim()) {
    return membershipType === 'individual' 
      ? "Name is required" 
      : "Organization name is required";
  }
  
  if (membershipType === 'corporate') {
    if (!organizationType) {
      return "Organization type is required";
    }
    
    if (members.length === 0) {
      return "At least one team member is required";
    }
    
    const hasPrimaryContact = members.some(m => m.isPrimaryContact);
    if (!hasPrimaryContact) {
      return "You must designate one person as the account administrator";
    }
    
    // Validate all members
    for (const member of members) {
      const memberErrors = validateMember(member, member.id === 'registrant');
      if (memberErrors.length > 0) {
        return `${member.firstName || 'Member'}: ${memberErrors[0]}`;
      }
    }
  }
  
  return null;
};

export const validateAddressPortfolioStep = (state: RegistrationState): string | null => {
  const { 
    address,
    membershipType,
    organizationType,
    grossWrittenPremiums,
    hasOtherAssociations,
    otherAssociations 
  } = state;
  
  if (!address.line1.trim() || !address.city.trim() || !address.country) {
    return "Address information is required";
  }
  
  if (membershipType === 'corporate' && organizationType === 'MGA' && (!grossWrittenPremiums || isNaN(parseFloat(grossWrittenPremiums)))) {
    return "Gross written premiums are required for MGA memberships";
  }
  
  if (hasOtherAssociations === null) {
    return "Please specify if your organization is a member of other European MGA associations";
  }
  
  if (hasOtherAssociations && otherAssociations.length === 0) {
    return "Please select at least one European MGA association you are a member of";
  }
  
  return null;
};

// Check required fields for any object
export const hasRequiredFields = (obj: Record<string, any>, requiredFields: string[]): boolean => {
  return requiredFields.every(field => {
    const value = obj[field];
    return value !== null && value !== undefined && value.toString().trim() !== '';
  });
};

// Generic field validation
export const validateRequiredField = (value: any, fieldName: string): string | null => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
};