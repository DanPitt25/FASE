'use client';

import { calculateMembershipFee, getDiscountedFee, calculateTotalGWP, convertToEUR, getGWPBand } from './registration-utils';
import { Member } from './registration-hooks';

// Domain existence check
export const checkDomainExists = async (emailAddress: string): Promise<boolean> => {
  try {
    const domain = emailAddress.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../../lib/firebase');

    // Check for existing accounts with the same domain
    const accountsRef = collection(db, 'accounts');
    const domainQuery = query(accountsRef, where('email', '>=', `@${domain}`), where('email', '<=', `@${domain}\uf8ff`));
    
    const accountResults = await getDocs(domainQuery);
    
    for (const accountDoc of accountResults.docs) {
      const accountData = accountDoc.data();
      const accountEmail = accountData.email || '';
      const accountDomain = accountEmail.split('@')[1]?.toLowerCase();
      
      if (accountDomain === domain) {
        // Check if this is a company account with members
        if (accountData.isCompanyAccount) {
          try {
            const membersRef = collection(db, 'accounts', accountDoc.id, 'members');
            const membersSnapshot = await getDocs(membersRef);
            
            if (!membersSnapshot.empty) {
              return true;
            }
          } catch (error) {
          }
        }
      }
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Create account and membership using server-side API
export const createAccountAndMembership = async (
  status: 'pending_payment' | 'pending_invoice' | 'pending' | 'draft',
  formData: {
    email: string;
    password: string;
    firstName: string;
    surname: string;
    organizationName: string;
    organizationType: 'MGA' | 'carrier' | 'provider';
    members: Member[];
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    grossWrittenPremiums: string;
    gwpCurrency: string;
    selectedLinesOfBusiness: string[];
    otherLineOfBusiness1: string;
    otherLineOfBusiness2: string;
    otherLineOfBusiness3: string;
    selectedMarkets: string[];
    hasOtherAssociations: boolean | null;
    otherAssociations: string[];
    servicesProvided: string[];
    // Carrier-specific fields (optional)
    carrierOrganizationType?: string;
    isDelegatingInEurope?: string;
    numberOfMGAs?: string;
    delegatingCountries?: string[];
    frontingOptions?: string;
    considerStartupMGAs?: string;
    amBestRating?: string;
    otherRating?: string;
    // MGA Rendezvous fields (optional)
    reserveRendezvousPasses?: boolean;
    rendezvousPassCount?: number;
    rendezvousPassTotal?: number;
    rendezvousAttendees?: { id: string; firstName: string; lastName: string; email: string; jobTitle: string; }[];
  }
) => {
  try {
    // Check if domain already exists before creating account
    const domainExists = await checkDomainExists(formData.email);
    if (domainExists) {
      throw new Error('An organization with this email domain is already registered. Please contact us if you believe this is an error.');
    }

    // Call server-side API to create account atomically
    const response = await fetch('/api/register-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData,
        status
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create account');
    }

    if (!result.success || !result.userId) {
      throw new Error('Invalid response from server');
    }

    // Sign in the user after successful account creation
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const { auth } = await import('../../lib/firebase');
    
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
    } catch (signInError) {
      console.error('Auto sign-in failed:', signInError);
      // Don't throw here - account was created successfully
    }

    // Return the user ID
    return result.userId;
    
  } catch (error: any) {
    // Check for network/connection errors
    if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
        error.message?.includes('network') || 
        error.code === 'unavailable') {
      throw new Error("Connection blocked. Please disable any ad blockers or try using a different browser.");
    } else {
      // Preserve original error message for better debugging
      console.error('Full createAccountAndMembership error:', error);
      throw error; // Don't wrap it in handleAuthError to preserve the real error
    }
  }
};

// Continue with PayPal payment
export const continueWithPayPalPayment = async (formData: any) => {
  try {
    const { auth } = await import('../../lib/firebase');
    if (!auth.currentUser) {
      throw new Error('No authenticated user');
    }
    
    const fullName = `${formData.firstName} ${formData.surname}`.trim();
    const orgName = formData.organizationName; // All memberships are corporate
    
    const response = await fetch('/api/create-paypal-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationName: orgName,
        organizationType: formData.organizationType, // All memberships are corporate
        grossWrittenPremiums: formData.organizationType === 'MGA' ? getGWPBand(convertToEUR(parseFloat(formData.grossWrittenPremiums) || 0, formData.gwpCurrency)) : undefined, // All memberships are corporate
        userEmail: formData.email,
        userId: auth.currentUser.uid,
        testPayment: false
      }),
    });

    if (!response.ok) {
      await response.text(); // Read response to clear buffer
      throw new Error(`Payment processing failed (${response.status}). Please try again.`);
    }

    const data = await response.json();
    
    // Redirect to PayPal
    if (data.approvalUrl) {
      window.location.href = data.approvalUrl;
    } else {
      throw new Error('No approval URL received from PayPal');
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to start payment process');
  }
};