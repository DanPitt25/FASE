import { useState, useEffect } from 'react';
import { RegistrationState, RegistrationActions, Member, Address, GWPInputs } from '../types';
import { 
  validateDataNoticeStep, 
  validateCodeOfConductStep, 
  validateAccountInfoStep, 
  validateMembershipInfoStep, 
  validateAddressPortfolioStep 
} from '../validation';

const initialState: RegistrationState = {
  step: 0,
  touchedFields: {},
  attemptedNext: false,
  
  // Auth fields
  firstName: '',
  surname: '',
  email: '',
  password: '',
  confirmPassword: '',
  
  // Membership fields
  membershipType: 'corporate',
  organizationName: '',
  organizationType: '',
  members: [],
  
  // Address fields
  address: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  },
  
  // Portfolio fields
  gwpInputs: {
    billions: '',
    millions: '',
    thousands: '',
    hundreds: ''
  },
  gwpCurrency: 'EUR',
  grossWrittenPremiums: '',
  principalLines: '',
  additionalLines: '',
  targetClients: '',
  currentMarkets: '',
  plannedMarkets: '',
  
  // Structured business fields
  selectedLinesOfBusiness: [],
  selectedMarkets: [],
  
  // Other fields
  hasOtherAssociations: null,
  otherAssociations: [],
  isAdminTest: false,
  logoFile: null,
  
  // Consent states
  dataNoticeConsent: false,
  codeOfConductConsent: false,
  
  // Loading states
  error: '',
  loading: false,
  showPasswordReqs: false,
  registrationComplete: false,
  showPaymentStep: false,
  processingPayment: false,
  paymentError: '',
  paymentMethod: 'paypal',
  
  // Email verification
  showEmailVerification: false,
  verificationCode: '',
  isCheckingVerification: false,
  isSendingVerification: false,
  pendingPaymentAction: null
};

export function useRegistrationFlow() {
  const [state, setState] = useState<RegistrationState>(initialState);
  const [error, setError] = useState<string>('');

  // Initialize members when switching to corporate membership
  useEffect(() => {
    if (state.membershipType === 'corporate' && state.members.length === 0) {
      const fullName = `${state.firstName} ${state.surname}`.trim();
      if (fullName && state.email) {
        updateField('members', [{
          id: 'registrant',
          firstName: state.firstName,
          lastName: state.surname,
          name: fullName,
          email: state.email,
          phone: '',
          jobTitle: '',
          isPrimaryContact: true
        }]);
      }
    }
  }, [state.membershipType, state.firstName, state.surname, state.email, state.members.length]);

  // Calculate total GWP when inputs change
  useEffect(() => {
    const calculateTotalGWP = () => {
      const billions = parseFloat(state.gwpInputs.billions) || 0;
      const millions = parseFloat(state.gwpInputs.millions) || 0;
      const thousands = parseFloat(state.gwpInputs.thousands) || 0;
      const hundreds = parseFloat(state.gwpInputs.hundreds) || 0;
      
      // Calculate the actual EUR value (not in millions)
      const totalInEUR = (billions * 1000000000) + (millions * 1000000) + (thousands * 1000) + hundreds;
      return totalInEUR;
    };

    const total = calculateTotalGWP();
    if (state.grossWrittenPremiums !== total.toString()) {
      setState(prev => ({ ...prev, grossWrittenPremiums: total.toString() }));
    }
  }, [state.gwpInputs, state.grossWrittenPremiums]);

  const updateField = <K extends keyof RegistrationState>(
    field: K, 
    value: RegistrationState[K]
  ) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const markFieldTouched = (field: string) => {
    setState(prev => ({
      ...prev,
      touchedFields: { ...prev.touchedFields, [field]: true }
    }));
  };

  const validateCurrentStep = (): string | null => {
    switch (state.step) {
      case 0:
        return validateDataNoticeStep(state.dataNoticeConsent);
      case 1:
        return validateCodeOfConductStep(state.codeOfConductConsent);
      case 2:
        return validateAccountInfoStep(state);
      case 3:
        return validateMembershipInfoStep(state);
      case 4:
        return validateAddressPortfolioStep(state);
      default:
        return null;
    }
  };

  const nextStep = () => {
    setState(prev => ({ ...prev, attemptedNext: true }));
    
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return false;
    }

    setError('');
    setState(prev => ({ 
      ...prev, 
      step: prev.step + 1, 
      attemptedNext: false 
    }));
    return true;
  };

  const previousStep = () => {
    if (state.step > 0) {
      setState(prev => ({ ...prev, step: prev.step - 1 }));
      setError('');
    }
  };

  const goToStep = (step: number) => {
    setState(prev => ({ ...prev, step }));
    setError('');
  };

  const resetForm = () => {
    setState(initialState);
    setError('');
  };

  const actions: RegistrationActions = {
    updateField,
    markFieldTouched,
    nextStep,
    previousStep,
    goToStep,
    resetForm
  };

  return {
    state,
    actions,
    error,
    setError,
    validateCurrentStep
  };
}