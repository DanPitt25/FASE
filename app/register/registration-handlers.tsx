'use client';

import { Member } from './registration-hooks';

// Domain existence check (used in step 1 validation only)
export const checkDomainExists = async (emailAddress: string): Promise<boolean> => {
  try {
    const domain = emailAddress.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../../lib/firebase');

    const accountsRef = collection(db, 'accounts');
    const domainQuery = query(accountsRef, where('email', '>=', `@${domain}`), where('email', '<=', `@${domain}\uf8ff`));

    const accountResults = await getDocs(domainQuery);

    for (const accountDoc of accountResults.docs) {
      const accountData = accountDoc.data();
      const accountEmail = accountData.email || '';
      const accountDomain = accountEmail.split('@')[1]?.toLowerCase();

      if (accountDomain === domain && accountData.isCompanyAccount) {
        const membersRef = collection(db, 'accounts', accountDoc.id, 'members');
        const membersSnapshot = await getDocs(membersRef);
        if (!membersSnapshot.empty) {
          return true;
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
    carrierOrganizationType?: string;
    isDelegatingInEurope?: string;
    numberOfMGAs?: string;
    delegatingCountries?: string[];
    frontingOptions?: string;
    considerStartupMGAs?: string;
    amBestRating?: string;
    otherRating?: string;
    reserveRendezvousPasses?: boolean;
    rendezvousPassCount?: number;
    rendezvousPassSubtotal?: number;
    rendezvousPassTotal?: number;
    rendezvousIsAsaseMember?: boolean;
    rendezvousAttendees?: { id: string; firstName: string; lastName: string; email: string; jobTitle: string; }[];
  }
) => {
  try {
    const response = await fetch('/api/register-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, status }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create account');
    }

    if (!result.success || !result.userId) {
      throw new Error('Invalid response from server');
    }

    return result.userId;

  } catch (error: any) {
    if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
        error.message?.includes('network') ||
        error.code === 'unavailable') {
      throw new Error("Connection blocked. Please disable any ad blockers or try using a different browser.");
    }
    throw error;
  }
};
