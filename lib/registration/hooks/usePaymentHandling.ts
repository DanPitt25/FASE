import { useState } from 'react';
import { RegistrationState } from '../types';

interface PaymentState {
  paymentMethod: 'stripe' | 'invoice';
  processingPayment: boolean;
  paymentError: string;
  registrationComplete: boolean;
}

export function usePaymentHandling() {
  const [paymentState, setPaymentState] = useState<PaymentState>({
    paymentMethod: 'stripe',
    processingPayment: false,
    paymentError: '',
    registrationComplete: false
  });

  const setPaymentMethod = (method: 'stripe' | 'invoice') => {
    setPaymentState(prev => ({ ...prev, paymentMethod: method }));
  };

  const setPaymentError = (error: string) => {
    setPaymentState(prev => ({ ...prev, paymentError: error }));
  };

  const calculateMembershipFee = (state: RegistrationState): number => {
    if (state.isAdminTest) {
      return 0.01; // 1 cent for admin test
    }
    
    if (state.membershipType === 'individual') {
      return 500;
    } else if (state.membershipType === 'corporate' && state.organizationType === 'MGA') {
      const gwpValue = parseFloat(state.grossWrittenPremiums) || 0;
      
      // Currency conversion rates
      const currencyRates = { EUR: 1.0, GBP: 1.17, USD: 0.92 };
      const convertToEUR = (value: number, currency: string): number => {
        const rate = currencyRates[currency as keyof typeof currencyRates] || 1;
        return value * rate;
      };
      
      // Convert to EUR for band calculation
      const eurValue = convertToEUR(gwpValue, state.gwpCurrency);
      const eurValueInMillions = eurValue / 1000000;
      
      if (eurValueInMillions < 10) return 900;
      if (eurValueInMillions < 20) return 1100;
      if (eurValueInMillions < 50) return 1300;
      if (eurValueInMillions < 100) return 1500;
      if (eurValueInMillions < 500) return 1700;
      return 2000;
    } else {
      // Other corporate types (carrier, provider)
      return 900;
    }
  };

  const getDiscountedFee = (state: RegistrationState): number => {
    const baseFee = calculateMembershipFee(state);
    if (state.membershipType === 'corporate' && state.hasOtherAssociations) {
      return Math.round(baseFee * 0.8); // 20% discount
    }
    return baseFee;
  };

  const createStripeCheckout = async (state: RegistrationState): Promise<void> => {
    setPaymentState(prev => ({ ...prev, processingPayment: true, paymentError: '' }));

    try {
      const { auth } = await import('@/lib/firebase');
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      const fullName = `${state.firstName} ${state.surname}`.trim();
      const orgName = state.membershipType === 'individual' ? fullName : state.organizationName;
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: orgName,
          organizationType: state.membershipType === 'individual' ? 'individual' : state.organizationType,
          membershipType: state.membershipType,
          grossWrittenPremiums: state.membershipType === 'corporate' && state.organizationType === 'MGA' 
            ? calculateMembershipFee(state) 
            : undefined,
          userEmail: state.email,
          userId: auth.currentUser.uid,
          testPayment: state.isAdminTest
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Payment processing failed (${response.status}). Please try again.`);
      }

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      setPaymentState(prev => ({ 
        ...prev, 
        processingPayment: false, 
        paymentError: error.message || 'Failed to start payment process' 
      }));
      throw error;
    }
  };

  const requestInvoice = async (state: RegistrationState): Promise<void> => {
    setPaymentState(prev => ({ ...prev, processingPayment: true, paymentError: '' }));

    try {
      const { auth } = await import('@/lib/firebase');
      if (!auth.currentUser) {
        throw new Error('User must be authenticated');
      }

      const fullName = `${state.firstName} ${state.surname}`.trim();
      const token = await auth.currentUser.getIdToken();

      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          membershipData: {
            membershipType: state.membershipType,
            organizationName: state.membershipType === 'corporate' ? state.organizationName : fullName,
            organizationType: state.membershipType === 'corporate' ? state.organizationType : 'individual',
            grossWrittenPremiums: state.membershipType === 'corporate' && state.organizationType === 'MGA' 
              ? calculateMembershipFee(state) 
              : undefined,
            primaryContact: (() => {
              if (state.membershipType === 'corporate') {
                const primaryMember = state.members.find(m => m.isPrimaryContact);
                return primaryMember ? {
                  name: primaryMember.name,
                  email: primaryMember.email,
                  phone: primaryMember.phone,
                  role: primaryMember.jobTitle
                } : {
                  name: fullName,
                  email: state.email,
                  phone: '',
                  role: 'Account Administrator'
                };
              } else {
                return {
                  name: fullName,
                  email: state.email,
                  phone: '',
                  role: 'Individual Member'
                };
              }
            })(),
            registeredAddress: {
              line1: state.address.line1,
              line2: state.address.line2,
              city: state.address.city,
              state: state.address.state,
              postalCode: state.address.postalCode,
              country: state.address.country
            },
            hasOtherAssociations: state.hasOtherAssociations ?? false,
            otherAssociations: state.hasOtherAssociations ? state.otherAssociations : []
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
      
      setPaymentState(prev => ({ 
        ...prev, 
        processingPayment: false, 
        registrationComplete: true 
      }));
      
    } catch (error: any) {
      setPaymentState(prev => ({ 
        ...prev, 
        processingPayment: false, 
        paymentError: error.message || 'Failed to process invoice request' 
      }));
      throw error;
    }
  };

  const resetPaymentState = () => {
    setPaymentState({
      paymentMethod: 'stripe',
      processingPayment: false,
      paymentError: '',
      registrationComplete: false
    });
  };

  return {
    paymentState,
    setPaymentMethod,
    setPaymentError,
    calculateMembershipFee,
    getDiscountedFee,
    createStripeCheckout,
    requestInvoice,
    resetPaymentState
  };
}