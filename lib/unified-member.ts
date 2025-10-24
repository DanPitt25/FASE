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
  DocumentData,
  orderBy 
} from 'firebase/firestore';
import { db, auth } from './firebase';

// Join request interface for company membership requests
export interface JoinRequest {
  id: string;
  email: string;
  fullName: string;
  jobTitle?: string;
  message?: string;
  requestedAt: any; // Firestore timestamp
  status: 'pending' | 'approved' | 'rejected';
  companyId: string;
  companyName: string;
  // Admin processing fields
  processedAt?: any;
  processedBy?: string; // Admin user ID
  adminNotes?: string;
}

// Corporate member interface for subcollection members (NEW - for company-first structure)
export interface CompanyMember {
  id: string; // Firebase Auth uid
  email: string;
  personalName: string;
  jobTitle?: string;
  isPrimaryContact: boolean;
  joinedAt: any; // Firestore timestamp
  addedBy?: string; // Admin who added them
  // Keep basic profile info
  createdAt: any;
  updatedAt: any;
}

// Unified member interface that replaces both UserProfile and MemberApplication
export interface UnifiedMember {
  id: string; // Same as Firebase Auth uid
  email: string; // Synced from Firebase Auth
  displayName: string; // Synced from Firebase Auth
  status: 'guest' | 'pending' | 'approved' | 'admin' | 'pending_invoice' | 'pending_payment';
  
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
  
  // NEW: Company-first structure support
  isCompanyAccount?: boolean; // True if this is a company record (not individual person)
  primaryContactMemberId?: string; // Points to the primary contact in members subcollection
  
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
  status: 'guest' | 'pending' | 'approved' | 'admin' | 'pending_invoice' | 'pending_payment' = 'guest'
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
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as UnifiedMember));
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
    
    const approved = approvedSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as UnifiedMember));
    const admins = adminSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as UnifiedMember));
    
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
      .map(doc => ({
        ...doc.data(),
        id: doc.id
      } as UnifiedMember))
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

// === COMPANY-FIRST STRUCTURE FUNCTIONS (NEW) ===

// Create a company account with the registrant as a member
export const createCompanyWithMember = async (
  companyData: Partial<UnifiedMember>,
  memberData: Omit<CompanyMember, 'createdAt' | 'updatedAt' | 'joinedAt'>
): Promise<{ companyId: string; memberId: string }> => {
  try {
    // Generate a unique company ID
    const companyId = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the company account
    const companyRef = doc(db, 'accounts', companyId);
    const companyRecord: UnifiedMember = {
      id: companyId,
      email: memberData.email, // Use primary contact email for company
      displayName: companyData.organizationName || 'Company Account',
      status: 'pending',
      personalName: '', // Empty for company accounts
      isCompanyAccount: true,
      primaryContactMemberId: memberData.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...companyData
    };
    
    await setDoc(companyRef, companyRecord);
    
    // Add the member to the company's members subcollection
    const memberRef = doc(db, 'accounts', companyId, 'members', memberData.id);
    const memberRecord: CompanyMember = {
      ...memberData,
      joinedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(memberRef, memberRecord);
    
    return { companyId, memberId: memberData.id };
  } catch (error) {
    console.error('Error creating company with member:', error);
    throw error;
  }
};

// Get company members
export const getCompanyMembers = async (companyId: string): Promise<CompanyMember[]> => {
  try {
    const membersRef = collection(db, 'accounts', companyId, 'members');
    const querySnapshot = await getDocs(membersRef);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as CompanyMember[];
  } catch (error) {
    console.error('Error getting company members:', error);
    return [];
  }
};

// Check if a UnifiedMember uses the new company-first structure
export const isCompanyFirstStructure = (member: UnifiedMember): boolean => {
  return member.isCompanyAccount === true;
};

// === JOIN REQUEST MANAGEMENT ===

// Get all join requests for a specific company
export const getJoinRequestsForCompany = async (companyId: string): Promise<JoinRequest[]> => {
  try {
    const joinRequestsRef = collection(db, 'accounts', companyId, 'join_requests');
    const q = query(joinRequestsRef, orderBy('requestedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as JoinRequest[];
  } catch (error) {
    console.error('Error getting join requests for company:', error);
    return [];
  }
};

// Get all pending join requests across all companies (for admin)
export const getAllPendingJoinRequests = async (): Promise<(JoinRequest & { companyData?: UnifiedMember })[]> => {
  try {
    const approvedMembers = await getMembersByStatus('approved');
    const allRequests: (JoinRequest & { companyData?: UnifiedMember })[] = [];
    
    for (const company of approvedMembers) {
      if (company.membershipType === 'corporate') {
        const requests = await getJoinRequestsForCompany(company.id);
        const pendingRequests = requests
          .filter(req => req.status === 'pending')
          .map(req => ({ ...req, companyData: company }));
        allRequests.push(...pendingRequests);
      }
    }
    
    return allRequests.sort((a, b) => b.requestedAt?.toDate?.() - a.requestedAt?.toDate?.());
  } catch (error) {
    console.error('Error getting all pending join requests:', error);
    return [];
  }
};

// Approve a join request and create user account
export const approveJoinRequest = async (
  companyId: string, 
  requestId: string, 
  adminUserId: string,
  adminNotes?: string
): Promise<void> => {
  try {
    const requestRef = doc(db, 'accounts', companyId, 'join_requests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Join request not found');
    }
    
    const requestData = requestDoc.data() as JoinRequest;
    
    // Update the join request status
    await updateDoc(requestRef, {
      status: 'approved',
      processedAt: serverTimestamp(),
      processedBy: adminUserId,
      adminNotes: adminNotes || null
    });
    
    // Send notification email to the user
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const sendNotification = httpsCallable(functions, 'sendJoinRequestNotification');
      
      await sendNotification({
        email: requestData.email,
        fullName: requestData.fullName,
        companyName: requestData.companyName,
        status: 'approved',
        adminNotes: adminNotes
      });
    } catch (emailError) {
      console.error('Error sending approval notification:', emailError);
      // Don't throw - the approval was successful even if email failed
    }
    
    // TODO: Create individual user account for the approved person
    // This will need to be implemented when we decide how to handle
    // multiple users per company membership
    
  } catch (error) {
    console.error('Error approving join request:', error);
    throw error;
  }
};

// Reject a join request
export const rejectJoinRequest = async (
  companyId: string, 
  requestId: string, 
  adminUserId: string,
  adminNotes?: string
): Promise<void> => {
  try {
    const requestRef = doc(db, 'accounts', companyId, 'join_requests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Join request not found');
    }
    
    const requestData = requestDoc.data() as JoinRequest;
    
    await updateDoc(requestRef, {
      status: 'rejected',
      processedAt: serverTimestamp(),
      processedBy: adminUserId,
      adminNotes: adminNotes || null
    });
    
    // Send notification email to the user
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const sendNotification = httpsCallable(functions, 'sendJoinRequestNotification');
      
      await sendNotification({
        email: requestData.email,
        fullName: requestData.fullName,
        companyName: requestData.companyName,
        status: 'rejected',
        adminNotes: adminNotes
      });
    } catch (emailError) {
      console.error('Error sending rejection notification:', emailError);
      // Don't throw - the rejection was successful even if email failed
    }
  } catch (error) {
    console.error('Error rejecting join request:', error);
    throw error;
  }
};