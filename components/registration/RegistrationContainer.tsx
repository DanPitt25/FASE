import { useState } from 'react';
import { useRegistrationFlow } from '../../lib/registration/hooks/useRegistrationFlow';
import { useEmailVerification } from '../../lib/registration/hooks/useEmailVerification';
import { usePaymentHandling } from '../../lib/registration/hooks/usePaymentHandling';
import { useMemberManagement } from '../../lib/registration/hooks/useMemberManagement';

// Step Components
import DataNoticeStep from './steps/DataNoticeStep';
import CodeOfConductStep from './steps/CodeOfConductStep';
import AccountInfoStep from './steps/AccountInfoStep';
import MembershipInfoStep from './steps/MembershipInfoStep';
import AddressPortfolioStep from './steps/AddressPortfolioStep';
import PaymentStep from './steps/PaymentStep';

// UI Components
import Button from '../Button';
import ProgressIndicator from './ProgressIndicator';

interface AccountCreationParams {
  status: 'pending_payment' | 'pending_invoice';
}

export default function RegistrationContainer() {
  const { state, actions, error, setError } = useRegistrationFlow();
  const { 
    verificationState, 
    sendVerificationCode, 
    verifyCode, 
    updateVerificationCode,
    setPendingPaymentAction,
    resetVerification 
  } = useEmailVerification();
  
  const { 
    paymentState, 
    setPaymentMethod, 
    setPaymentError, 
    calculateMembershipFee,
    getDiscountedFee,
    createStripeCheckout, 
    requestInvoice,
    resetPaymentState 
  } = usePaymentHandling();

  const memberManagement = useMemberManagement(state, actions.updateField);

  const [loading, setLoading] = useState(false);

  // Account creation function
  const createAccountAndMembership = async (status: 'pending_payment' | 'pending_invoice') => {
    try {
      setLoading(true);
      
      // Handle logo upload first if present
      let logoUrl = '';
      if (state.logoFile) {
        try {
          const fullName = `${state.firstName} ${state.surname}`.trim();
          const cleanOrgName = (state.membershipType === 'corporate' ? state.organizationName : fullName)
            .toLowerCase().replace(/[^a-z0-9]/g, '_');
          
          // This would normally import a logo upload utility
          // const uploadResult = await uploadMemberLogo(state.logoFile, cleanOrgName);
          // logoUrl = uploadResult.downloadURL;
        } catch (uploadError) {
          console.warn('Logo upload failed, continuing without logo:', uploadError);
        }
      }
      
      const { auth } = await import('@/lib/firebase');
      
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Handle company-first vs traditional structure
      if (state.membershipType === 'corporate') {
        // Use company-first structure with atomic batch write
        const { doc: firestoreDoc, setDoc, serverTimestamp, writeBatch } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const companyId = auth.currentUser.uid;
        const batch = writeBatch(db);
        
        // Create company document
        const companyRef = firestoreDoc(db, 'accounts', companyId);
        const companyRecord = {
          id: companyId,
          email: auth.currentUser.email,
          displayName: state.organizationName,
          status,
          personalName: '',
          isCompanyAccount: true,
          accountAdministratorMemberId: auth.currentUser.uid,
          paymentUserId: auth.currentUser.uid,
          membershipType: 'corporate' as const,
          organizationName: state.organizationName,
          organizationType: state.organizationType,
          accountAdministrator: (() => {
            const primaryMember = state.members.find(m => m.isPrimaryContact);
            return primaryMember ? {
              name: primaryMember.name,
              email: primaryMember.email,
              phone: primaryMember.phone,
              role: primaryMember.jobTitle
            } : {
              name: `${state.firstName} ${state.surname}`.trim(),
              email: auth.currentUser?.email || '',
              phone: '',
              role: 'Account Administrator'
            };
          })(),
          businessAddress: {
            line1: state.address.line1,
            line2: state.address.line2,
            city: state.address.city,
            county: state.address.state,
            postcode: state.address.postalCode,
            country: state.address.country
          },
          ...(state.organizationType === 'MGA' && {
            portfolio: {
              grossWrittenPremiums: calculateMembershipFee(state),
              grossWrittenPremiumsValue: parseFloat(state.grossWrittenPremiums) || 0,
              grossWrittenPremiumsCurrency: state.gwpCurrency,
              principalLines: state.principalLines.trim(),
              additionalLines: state.additionalLines.trim(),
              targetClients: state.targetClients.trim(),
              currentMarkets: state.currentMarkets.trim(),
              plannedMarkets: state.plannedMarkets.trim()
            }
          }),
          hasOtherAssociations: state.hasOtherAssociations ?? false,
          otherAssociations: state.hasOtherAssociations ? state.otherAssociations : [],
          logoUrl: logoUrl || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        batch.set(companyRef, companyRecord);
        
        // Create member documents for all members
        for (const member of state.members) {
          const memberId = member.id === 'registrant' ? auth.currentUser.uid : member.id;
          const memberRef = firestoreDoc(db, 'accounts', companyId, 'members', memberId);
          
          const memberRecord = {
            id: memberId,
            email: member.email,
            personalName: member.name,
            jobTitle: member.jobTitle,
            isPrimaryContact: member.isPrimaryContact,
            isRegistrant: member.id === 'registrant',
            accountConfirmed: member.id === 'registrant',
            joinedAt: serverTimestamp(),
            phone: member.phone
          };
          
          batch.set(memberRef, memberRecord);
        }
        
        await batch.commit();
      } else {
        // Individual membership
        const { doc: firestoreDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        
        const accountRef = firestoreDoc(db, 'accounts', auth.currentUser.uid);
        const accountRecord = {
          id: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: `${state.firstName} ${state.surname}`.trim(),
          personalName: `${state.firstName} ${state.surname}`.trim(),
          status,
          isCompanyAccount: false,
          membershipType: 'individual' as const,
          businessAddress: {
            line1: state.address.line1,
            line2: state.address.line2,
            city: state.address.city,
            county: state.address.state,
            postcode: state.address.postalCode,
            country: state.address.country
          },
          hasOtherAssociations: state.hasOtherAssociations ?? false,
          otherAssociations: state.hasOtherAssociations ? state.otherAssociations : [],
          logoUrl: logoUrl || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(accountRef, accountRecord);
      }
      
    } catch (error: any) {
      console.error('Account creation error:', error);
      throw new Error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerification = async () => {
    if (verificationState.isCheckingVerification) return;
    
    try {
      await verifyCode(state.email, verificationState.verificationCode);
      
      // Continue with pending payment action
      if (verificationState.pendingPaymentAction === 'stripe') {
        await handleStripePayment();
      } else if (verificationState.pendingPaymentAction === 'invoice') {
        await handleInvoiceRequest();
      }
    } catch (error: any) {
      setError(error.message || "Failed to verify code");
    }
  };

  const handleSendVerificationCode = async () => {
    try {
      await sendVerificationCode(state.email);
      setError('');
    } catch (error: any) {
      setError(error.message || "Failed to send verification code");
    }
  };

  const handleStripePayment = async () => {
    try {
      await createAccountAndMembership('pending_payment');
      await createStripeCheckout(state);
    } catch (error: any) {
      setPaymentError(error.message || 'Failed to start payment process');
    }
  };

  const handleInvoiceRequest = async () => {
    try {
      await requestInvoice(state);
      await createAccountAndMembership('pending_invoice');
    } catch (error: any) {
      setPaymentError(error.message || 'Failed to process invoice request');
    }
  };

  const renderCurrentStep = () => {
    const stepProps = { state, actions };
    
    switch (state.step) {
      case 0:
        return <DataNoticeStep {...stepProps} />;
      case 1:
        return <CodeOfConductStep {...stepProps} />;
      case 2:
        return <AccountInfoStep {...stepProps} />;
      case 3:
        return <MembershipInfoStep {...stepProps} />;
      case 4:
        return <AddressPortfolioStep {...stepProps} />;
      case 5:
        return (
          <PaymentStep 
            {...stepProps}
            paymentMethod={paymentState.paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onPayment={handleStripePayment}
            onInvoiceRequest={handleInvoiceRequest}
            processingPayment={paymentState.processingPayment}
          />
        );
      default:
        return <DataNoticeStep {...stepProps} />;
    }
  };

  const isLastStep = state.step === 5;
  const isFirstStep = state.step === 0;

  if (paymentState.registrationComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-xl font-noto-serif font-semibold text-green-800 mb-4">
            Registration Complete!
          </h2>
          <p className="text-green-700">
            Thank you for joining FASE. You will receive an email confirmation shortly.
          </p>
        </div>
      </div>
    );
  }

  if (verificationState.showEmailVerification) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white border border-fase-light-gold rounded-lg p-6">
          <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-4">
            Verify Your Email
          </h3>
          <p className="text-fase-black mb-4">
            We&apos;ve sent a verification code to {state.email}. Please enter it below to continue.
          </p>
          
          <div className="space-y-4">
            <input
              type="text"
              value={verificationState.verificationCode}
              onChange={(e) => updateVerificationCode(e.target.value)}
              placeholder="Enter verification code"
              className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            />
            
            <div className="flex space-x-4">
              <Button
                type="button"
                variant="primary"
                onClick={handleEmailVerification}
                disabled={verificationState.isCheckingVerification || !verificationState.verificationCode}
              >
                {verificationState.isCheckingVerification ? "Verifying..." : "Verify Code"}
              </Button>
              
              <Button
                type="button"
                variant="secondary"
                onClick={handleSendVerificationCode}
                disabled={verificationState.isSendingVerification}
              >
                {verificationState.isSendingVerification ? "Sending..." : "Resend Code"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white border border-fase-light-gold rounded-lg shadow-sm">
        {/* Progress Indicator */}
        <div className="border-b border-fase-light-gold p-6">
          <ProgressIndicator currentStep={state.step} totalSteps={6} />
        </div>

        {/* Step Content */}
        <div className="p-6">
          {renderCurrentStep()}
        </div>

        {/* Error Display */}
        {(error || paymentState.paymentError) && (
          <div className="mx-6 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error || paymentState.paymentError}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        {!isLastStep && (
          <div className="border-t border-fase-light-gold p-6">
            <div className="flex justify-between">
              {!isFirstStep ? (
                <Button 
                  type="button"
                  variant="secondary" 
                  onClick={actions.previousStep}
                >
                  Back
                </Button>
              ) : (
                <div></div>
              )}
              
              <Button 
                type="button"
                variant="primary" 
                onClick={actions.nextStep}
                disabled={loading}
              >
                {loading ? "Loading..." : state.step === 4 ? "Continue to Payment" : "Next"}
              </Button>
            </div>
            
            {/* Alternative Options - Only show on step 2 (account creation) */}
            {state.step === 2 && (
              <div className="mt-8 text-center border-t border-fase-light-gold pt-6">
                <p className="text-sm text-fase-black mb-4">Already a member?</p>
                <div className="flex justify-center">
                  <a 
                    href="/login" 
                    className="inline-flex items-center justify-center px-4 py-2 border border-fase-navy text-sm font-medium rounded-md text-fase-navy bg-white hover:bg-fase-cream transition-colors duration-200"
                  >
                    Sign in to existing account
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}