import { useState } from 'react';

interface EmailVerificationState {
  showEmailVerification: boolean;
  verificationCode: string;
  isCheckingVerification: boolean;
  isSendingVerification: boolean;
  pendingPaymentAction: 'stripe' | 'invoice' | null;
}

export function useEmailVerification() {
  const [verificationState, setVerificationState] = useState<EmailVerificationState>({
    showEmailVerification: false,
    verificationCode: '',
    isCheckingVerification: false,
    isSendingVerification: false,
    pendingPaymentAction: null
  });

  const sendVerificationCode = async (email: string): Promise<void> => {
    setVerificationState(prev => ({ ...prev, isSendingVerification: true }));
    
    try {
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send verification code');
      }

      setVerificationState(prev => ({
        ...prev,
        showEmailVerification: true,
        isSendingVerification: false
      }));
    } catch (error: any) {
      setVerificationState(prev => ({ ...prev, isSendingVerification: false }));
      throw error;
    }
  };

  const verifyCode = async (email: string, code: string): Promise<boolean> => {
    setVerificationState(prev => ({ ...prev, isCheckingVerification: true }));

    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();
      
      if (response.ok && data.verified) {
        setVerificationState(prev => ({
          ...prev,
          isCheckingVerification: false,
          showEmailVerification: false,
          verificationCode: ''
        }));
        return true;
      } else {
        setVerificationState(prev => ({ ...prev, isCheckingVerification: false }));
        throw new Error(data.error || 'Invalid verification code');
      }
    } catch (error: any) {
      setVerificationState(prev => ({ ...prev, isCheckingVerification: false }));
      throw error;
    }
  };

  const updateVerificationCode = (code: string) => {
    setVerificationState(prev => ({ ...prev, verificationCode: code }));
  };

  const setPendingPaymentAction = (action: 'stripe' | 'invoice' | null) => {
    setVerificationState(prev => ({ ...prev, pendingPaymentAction: action }));
  };

  const resetVerification = () => {
    setVerificationState({
      showEmailVerification: false,
      verificationCode: '',
      isCheckingVerification: false,
      isSendingVerification: false,
      pendingPaymentAction: null
    });
  };

  return {
    verificationState,
    sendVerificationCode,
    verifyCode,
    updateVerificationCode,
    setPendingPaymentAction,
    resetVerification
  };
}