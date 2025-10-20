import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  DocumentData 
} from 'firebase/firestore';
import { db, auth } from './firebase';

// Unified member interface that replaces both UserProfile and MemberApplication
export interface UnifiedMember {
  id: string; // Same as Firebase Auth uid
  email: string; // Synced from Firebase Auth
  displayName: string; // Synced from Firebase Auth
  status: 'guest' | 'pending' | 'approved' | 'admin';
  
  // Core profile data (always present)
  personalName: string;
  organisation?: string;
  createdAt: any;
  updatedAt: any;
  
  // Membership application data (optional - only for actual members/applicants)
  membershipType?: 'corporate' | 'individual';
  organizationName?: string;
  organizationType?: 'MGA' | 'carrier' | 'provider';
  logoURL?: string;
  
  // Privacy agreements
  privacyAgreed?: boolean;
  dataProcessingAgreed?: boolean;
  
  // Primary contact
  primaryContact?: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  
  // Organization details
  organizationDetails?: {
    tradingName?: string;
    registeredNumber: string;
    vatNumber?: string;
    websiteUrl?: string;
  };
  
  // Regulatory information
  regulatory?: {
    fcarNumber?: string;
    authorizedActivities: string[];
    regulatoryBody?: string;
  };
  
  // Registered address
  registeredAddress?: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
  
  // Senior leadership
  seniorLeadership?: Array<{
    name: string;
    role: string;
    email: string;
  }>;
  
  // Key contacts (optional)
  keyContacts?: Array<{
    name: string;
    role: string;
    email: string;
    phone: string;
  }>;
  
  // Invoicing details
  invoicingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
    sameAsRegistered: boolean;
  };
  
  invoicingContact?: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  
  // Business information
  distributionStrategy?: {
    channels: string[];
    brokerNetwork?: string;
  };
  
  technology?: {
    managementSystem?: string;
    dataAnalytics?: string;
    technicalPartners: string[];
  };
  
  // Portfolio information
  portfolio?: {
    grossWrittenPremiums?: '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+';
    portfolioMix: Record<string, number>;
  };
  
  productLines?: {
    lines: string[];
    targetMarkets: string[];
  };
  
  claimsModel?: {
    handling?: string;
    partners: string[];
  };
  
  // Additional information
  generalInformation?: {
    businessPlan?: string;
    marketingStrategy?: string;
  };
  
  demographics?: {
    employeeCount?: string;
    yearEstablished?: string;
    ownership?: string;
  };
  
  // Terms agreement
  termsAgreed?: boolean;
  
  // Additional fields
  hasOtherAssociations?: boolean;
  otherAssociations?: string[];
}

// Helper function to determine access level
export const hasAccess = (member: UnifiedMember | null, requiredLevel: 'guest' | 'member' | 'admin'): boolean => {
  if (!member) return requiredLevel === 'guest';
  
  switch (requiredLevel) {
    case 'guest':
      return true; // Everyone has guest access
    case 'member':
      return ['approved', 'admin'].includes(member.status);
    case 'admin':
      return member.status === 'admin';
    default:
      return false;
  }
};

// Create or update unified member record
export const createUnifiedMember = async (
  uid: string,
  email: string,
  displayName: string,
  personalName: string,
  organisation?: string,
  status: 'guest' | 'pending' | 'approved' | 'admin' = 'guest'
): Promise<UnifiedMember> => {
  const memberRef = doc(db, 'accounts', uid);
  const memberData: UnifiedMember = {
    id: uid,
    email,
    displayName,
    personalName,
    status,
    ...(organisation && { organisation }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(memberRef, memberData);
  return memberData;
};

// Get unified member record
export const getUnifiedMember = async (uid: string): Promise<UnifiedMember | null> => {
  try {
    // First check if they have an individual account
    const memberRef = doc(db, 'accounts', uid);
    const memberSnap = await getDoc(memberRef);
    
    if (memberSnap.exists()) {
      const data = memberSnap.data();
      // If it's an individual membership or old data, return as-is
      if (data.membershipType === 'individual' || !data.membershipType) {
        return { id: uid, ...data } as UnifiedMember;
      }
    }
    
    // If not found as individual, search in organization members subcollections
    const accountsRef = collection(db, 'accounts');
    const orgQuery = query(accountsRef, where('membershipType', '==', 'corporate'));
    const orgSnapshot = await getDocs(orgQuery);
    
    for (const orgDoc of orgSnapshot.docs) {
      const memberRef = doc(db, 'accounts', orgDoc.id, 'members', uid);
      const memberSnap = await getDoc(memberRef);
      
      if (memberSnap.exists()) {
        const memberData = memberSnap.data();
        const orgData = orgDoc.data();
        
        // Combine member data with organization context
        return {
          id: uid,
          email: memberData.email,
          displayName: memberData.displayName,
          personalName: memberData.name,
          organisation: orgData.organizationName,
          status: orgData.status || 'approved',
          membershipType: 'corporate',
          organizationName: orgData.organizationName,
          organizationType: orgData.organizationType,
          primaryContact: orgData.primaryContact,
          registeredAddress: orgData.registeredAddress,
          portfolio: orgData.portfolio,
          // Member-specific data
          memberRole: memberData.role,
          memberJoinedAt: memberData.joinedAt,
          // Organization data
          createdAt: orgData.createdAt,
          updatedAt: orgData.updatedAt
        } as UnifiedMember;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting unified member:', error);
    return null;
  }
};

// Update unified member record
export const updateUnifiedMember = async (
  uid: string,
  updates: Partial<UnifiedMember>
): Promise<void> => {
  const memberRef = doc(db, 'accounts', uid);
  await updateDoc(memberRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// Update member status
export const updateMemberStatus = async (
  uid: string,
  status: UnifiedMember['status']
): Promise<void> => {
  await updateUnifiedMember(uid, { status });
};

// Get all members by status
export const getMembersByStatus = async (status: UnifiedMember['status']): Promise<UnifiedMember[]> => {
  try {
    const membersRef = collection(db, 'accounts');
    const q = query(membersRef, where('status', '==', status));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data() as UnifiedMember);
  } catch (error) {
    console.error('Error getting members by status:', error);
    return [];
  }
};

// Get all approved members for directory
export const getApprovedMembersForDirectory = async (): Promise<UnifiedMember[]> => {
  return getMembersByStatus('approved');
};

// Get members with member portal access (approved + admin)
export const getMembersWithPortalAccess = async (): Promise<UnifiedMember[]> => {
  try {
    const membersRef = collection(db, 'accounts');
    const approvedQuery = query(membersRef, where('status', '==', 'approved'));
    const adminQuery = query(membersRef, where('status', '==', 'admin'));
    
    const [approvedSnapshot, adminSnapshot] = await Promise.all([
      getDocs(approvedQuery),
      getDocs(adminQuery)
    ]);
    
    const approved = approvedSnapshot.docs.map(doc => doc.data() as UnifiedMember);
    const admins = adminSnapshot.docs.map(doc => doc.data() as UnifiedMember);
    
    return [...approved, ...admins];
  } catch (error) {
    console.error('Error getting members with portal access:', error);
    return [];
  }
};

// Get members by organization type (for filtering)
export const getMembersByOrganizationType = async (organizationType: 'MGA' | 'carrier' | 'provider'): Promise<UnifiedMember[]> => {
  try {
    const membersRef = collection(db, 'accounts');
    const q = query(
      membersRef,
      where('status', 'in', ['approved', 'admin']),
      where('organizationType', '==', organizationType)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data() as UnifiedMember);
  } catch (error) {
    console.error('Error getting members by organization type:', error);
    return [];
  }
};

// Search members by organization name
export const searchMembersByOrganizationName = async (searchTerm: string): Promise<UnifiedMember[]> => {
  try {
    const membersRef = collection(db, 'accounts');
    const q = query(membersRef, where('status', 'in', ['approved', 'admin']));
    const querySnapshot = await getDocs(q);
    
    // Filter by organization name on client side (Firestore doesn't support case-insensitive search)
    const filteredMembers = querySnapshot.docs
      .map(doc => doc.data() as UnifiedMember)
      .filter(member => 
        member.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return filteredMembers;
  } catch (error) {
    console.error('Error searching members by organization name:', error);
    return [];
  }
};

// Get user IDs for member criteria (for messaging)
export const getUserIdsForMemberCriteria = async (criteria: {
  organizationType?: 'MGA' | 'carrier' | 'provider';
  organizationNames?: string[];
}): Promise<string[]> => {
  try {
    let members: UnifiedMember[] = [];
    
    if (criteria.organizationType) {
      members = await getMembersByOrganizationType(criteria.organizationType);
    } else {
      // Get all members with portal access
      members = await getMembersWithPortalAccess();
    }
    
    // Filter by organization names if provided
    if (criteria.organizationNames && criteria.organizationNames.length > 0) {
      members = members.filter(member => 
        criteria.organizationNames!.includes(member.organizationName || '')
      );
    }
    
    return members.map(member => member.id);
  } catch (error) {
    console.error('Error getting user IDs for member criteria:', error);
    return [];
  }
};