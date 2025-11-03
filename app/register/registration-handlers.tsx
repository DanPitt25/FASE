'use client';

import { sendVerificationCode, verifyCode, submitApplication } from "../../lib/auth";
import { handleAuthError } from "../../lib/auth-errors";
import { auth } from "../../lib/firebase";
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

// Create account and membership
export const createAccountAndMembership = async (
  status: 'pending_payment' | 'pending_invoice' | 'pending' | 'draft',
  formData: {
    email: string;
    password: string;
    firstName: string;
    surname: string;
    membershipType: 'individual' | 'corporate';
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
    isDelegatingInEurope?: string;
    numberOfMGAs?: string;
    delegatingCountries?: string[];
    frontingOptions?: string;
    considerStartupMGAs?: string;
    amBestRating?: string;
    otherRating?: string;
  }
) => {
  let userToCleanup: any = null;

  try {
    // Check if domain already exists before creating account
    const domainExists = await checkDomainExists(formData.email);
    if (domainExists) {
      throw new Error('An organization with this email domain is already registered. Please contact us if you believe this is an error.');
    }

    // Step 1: Create Firebase Auth account first
    const { createUserWithEmailAndPassword, updateProfile, deleteUser } = await import('firebase/auth');
    const { auth } = await import('../../lib/firebase');
    
    const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    const user = userCredential.user;
    userToCleanup = user;
    
    // Create display name
    const fullName = `${formData.firstName} ${formData.surname}`.trim();
    const orgForAuth = formData.membershipType === 'corporate' ? formData.organizationName : undefined;
    const displayName = orgForAuth && orgForAuth.trim()
      ? `${fullName} (${orgForAuth})`
      : fullName;
    
    await updateProfile(user, { displayName });

    // Small delay to ensure auth state propagates to Firestore
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 2: Create Firestore documents
    try {
      if (formData.membershipType === 'corporate') {
        const { doc: firestoreDoc, setDoc, serverTimestamp, writeBatch } = await import('firebase/firestore');
        const { db } = await import('../../lib/firebase');
        
        const companyId = user.uid;
        const batch = writeBatch(db);
        
        // Find primary contact
        const primaryContactMember = formData.members.find(m => m.isPrimaryContact);
        if (!primaryContactMember) {
          throw new Error("No account administrator designated");
        }
        
        // Create company document
        const companyRef = firestoreDoc(db, 'accounts', companyId);
        const companyRecord = {
          id: companyId,
          email: user.email,
          displayName: formData.organizationName,
          status,
          personalName: '',
          isCompanyAccount: true,
          primaryContactMemberId: user.uid,
          paymentUserId: user.uid,
          membershipType: 'corporate' as const,
          organizationName: formData.organizationName,
          organizationType: formData.organizationType as 'MGA' | 'carrier' | 'provider',
          accountAdministrator: {
            name: primaryContactMember.name,
            email: primaryContactMember.email,
            phone: primaryContactMember.phone,
            role: primaryContactMember.jobTitle
          },
          businessAddress: {
            line1: formData.addressLine1,
            line2: formData.addressLine2,
            city: formData.city,
            county: formData.state,
            postcode: formData.postalCode,
            country: formData.country
          },
          ...(formData.organizationType === 'MGA' && {
            portfolio: {
              grossWrittenPremiums: getGWPBand(convertToEUR(parseFloat(formData.grossWrittenPremiums) || 0, formData.gwpCurrency)),
              grossWrittenPremiumsValue: parseFloat(formData.grossWrittenPremiums) || 0,
              grossWrittenPremiumsCurrency: formData.gwpCurrency,
              grossWrittenPremiumsEUR: convertToEUR(parseFloat(formData.grossWrittenPremiums) || 0, formData.gwpCurrency),
              linesOfBusiness: formData.selectedLinesOfBusiness,
              otherLinesOfBusiness: {
                other1: formData.otherLineOfBusiness1.trim(),
                other2: formData.otherLineOfBusiness2.trim(),
                other3: formData.otherLineOfBusiness3.trim()
              },
              markets: formData.selectedMarkets
            }
          }),
          hasOtherAssociations: formData.hasOtherAssociations ?? false,
          otherAssociations: formData.hasOtherAssociations ? formData.otherAssociations : [],
          // Service provider specific fields
          ...(formData.organizationType === 'provider' && {
            servicesProvided: formData.servicesProvided
          }),
          logoUrl: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        batch.set(companyRef, companyRecord);
        
        // Create member documents
        for (const member of formData.members) {
          const memberId = member.id === 'registrant' ? user.uid : member.id;
          const memberRef = firestoreDoc(db, 'accounts', companyId, 'members', memberId);
          
          const memberRecord = {
            id: memberId,
            email: member.email,
            personalName: member.name,
            jobTitle: member.jobTitle,
            isAccountAdministrator: member.isPrimaryContact,
            isRegistrant: member.id === 'registrant',
            accountConfirmed: member.id === 'registrant',
            joinedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          batch.set(memberRef, memberRecord);
        }
        
        await batch.commit();
        
      } else {
        // Individual membership
        const { doc: firestoreDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../../lib/firebase');
        
        const accountRef = firestoreDoc(db, 'accounts', user.uid);
        
        const dataToWrite = {
          email: user.email,
          displayName: user.displayName,
          status,
          membershipType: formData.membershipType,
          personalName: fullName,
          organizationName: fullName,
          paymentUserId: user.uid,
          accountAdministrator: {
            name: fullName,
            email: user.email!,
            phone: '',
            role: 'Individual Member'
          },
          businessAddress: {
            line1: formData.addressLine1,
            line2: formData.addressLine2,
            city: formData.city,
            county: formData.state,
            postcode: formData.postalCode,
            country: formData.country
          },
          hasOtherAssociations: formData.hasOtherAssociations ?? false,
          otherAssociations: formData.hasOtherAssociations ? formData.otherAssociations : [],
          logoUrl: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(accountRef, dataToWrite);
      }

      // Welcome message creation would go here if needed
      
      // Return the user ID for draft storage
      return user.uid;
      
    } catch (firestoreError) {
      // Cleanup auth account if Firestore fails
      
      if (userToCleanup) {
        try {
          await deleteUser(userToCleanup);
        } catch (cleanupError) {
        }
      }
      
      throw firestoreError;
    }
    
  } catch (error: any) {
    // Check for network/connection errors
    if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
        error.message?.includes('network') || 
        error.code === 'unavailable') {
      throw new Error("Connection blocked. Please disable any ad blockers or try using a different browser.");
    } else {
      throw new Error(handleAuthError(error));
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
    const orgName = formData.membershipType === 'individual' ? fullName : formData.organizationName;
    
    const response = await fetch('/api/create-paypal-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationName: orgName,
        organizationType: formData.membershipType === 'individual' ? 'individual' : formData.organizationType,
        membershipType: formData.membershipType,
        grossWrittenPremiums: formData.membershipType === 'corporate' && formData.organizationType === 'MGA' ? getGWPBand(convertToEUR(parseFloat(formData.grossWrittenPremiums) || 0, formData.gwpCurrency)) : undefined,
        userEmail: formData.email,
        userId: auth.currentUser.uid,
        testPayment: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
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