// Registration form types and interfaces

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // computed field for backward compatibility
  email: string;
  phone: string;
  jobTitle: string;
  isPrimaryContact: boolean;
}

export interface PasswordRequirements {
  length: boolean;
  capital: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export interface TouchedFields {
  [key: string]: boolean;
}

export type MembershipType = 'individual' | 'corporate';
export type OrganizationType = 'MGA' | 'carrier' | 'provider';
export type PaymentMethod = 'stripe' | 'invoice';
export type PaymentAction = 'stripe' | 'invoice' | null;

export interface GWPInputs {
  billions: string;
  millions: string;
  thousands: string;
  hundreds: string;
}

export interface AddressInfo {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface RegistrationState {
  // Step tracking
  step: number;
  touchedFields: TouchedFields;
  attemptedNext: boolean;
  
  // Personal info
  firstName: string;
  surname: string;
  email: string;
  password: string;
  confirmPassword: string;
  
  // Membership info
  membershipType: MembershipType;
  organizationName: string;
  organizationType: string;
  members: Member[];
  
  // Address
  address: AddressInfo;
  
  // Portfolio (MGAs)
  gwpInputs: GWPInputs;
  grossWrittenPremiums: string;
  gwpCurrency: string;
  principalLines: string;
  additionalLines: string;
  targetClients: string;
  currentMarkets: string;
  plannedMarkets: string;
  
  // Other associations
  hasOtherAssociations: boolean | null;
  otherAssociations: string[];
  
  // File upload
  logoFile: File | null;
  
  // Loading states
  error: string;
  loading: boolean;
  showPasswordReqs: boolean;
  registrationComplete: boolean;
  showPaymentStep: boolean;
  processingPayment: boolean;
  paymentError: string;
  paymentMethod: PaymentMethod;
  
  // Email verification
  showEmailVerification: boolean;
  verificationCode: string;
  isCheckingVerification: boolean;
  isSendingVerification: boolean;
  pendingPaymentAction: PaymentAction;
  
  // Consent
  dataNoticeConsent: boolean;
  codeOfConductConsent: boolean;
  
  // Admin
  isAdminTest: boolean;
}

export interface RegistrationActions {
  // Step navigation
  nextStep: () => boolean;
  previousStep: () => void;
  goToStep: (step: number) => void;
  
  // Field updates
  updateField: <K extends keyof RegistrationState>(field: K, value: RegistrationState[K]) => void;
  markFieldTouched: (fieldKey: string) => void;
  
  // Form management
  resetForm: () => void;
  
  // Member management
  addMember: () => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  removeMember: (id: string) => void;
  setPrimaryContact: (id: string) => void;
  
  // API actions
  createAccountAndMembership: (status: string) => Promise<void>;
  handlePayment: () => Promise<void>;
  handleInvoiceRequest: () => Promise<void>;
  handleVerification: () => Promise<void>;
  resendVerificationCode: () => Promise<void>;
  
  // Utilities
  calculateMembershipFee: () => number;
  resetForm: () => void;
}

export interface StepComponentProps {
  state: RegistrationState;
  actions: RegistrationActions;
}