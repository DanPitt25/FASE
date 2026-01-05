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
  isPrimaryContact?: boolean; // Legacy field
  isAccountAdministrator?: boolean; // New field
  accountConfirmed?: boolean;
  isRegistrant?: boolean;
  joinedAt: any; // Firestore timestamp
  addedBy?: string; // Admin who added them
  // Keep basic profile info
  createdAt: any;
  updatedAt: any;
}

// Company summary interface for bio management with admin approval
export interface CompanySummary {
  text: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  submittedAt?: any; // Firestore timestamp
  reviewedAt?: any; 
  reviewedBy?: string; // Admin user ID
  rejectionReason?: string;
}

// Organization-level interface for main accounts documents
export interface OrganizationAccount {
  id: string; // Company account ID
  organizationName: string;
  organizationType?: 'MGA' | 'carrier' | 'provider';
  status: 'guest' | 'pending' | 'approved' | 'admin' | 'pending_invoice' | 'pending_payment' | 'invoice_sent';
  
  // Organization data only - NO personal identifiers
  createdAt: any;
  updatedAt: any;
  
  // Company bio
  companySummary?: CompanySummary;
  
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
  
  logoURL?: string;
  hasOtherAssociations?: boolean;
  otherAssociations?: string[];
  linesOfBusiness?: string[];
  termsAgreed?: boolean;
  privacyAgreed?: boolean;
  dataProcessingAgreed?: boolean;
}

// Member-level interface - combines personal data with organization context
export interface UnifiedMember {
  id: string; // Firebase Auth uid
  email: string; // Synced from Firebase Auth
  
  // Member personal data (from subdocument or individual account)
  personalName: string;
  jobTitle?: string;
  isPrimaryContact?: boolean; // Only for corporate members
  memberJoinedAt?: any;
  
  // Organization context (for corporate members)
  organizationId?: string; // Points to the organization account
  organizationName?: string;
  organizationType?: 'MGA' | 'carrier' | 'provider';
  
  // Access control - inherited from organization for corporate members
  status: 'guest' | 'pending' | 'approved' | 'admin' | 'pending_invoice' | 'pending_payment' | 'invoice_sent' | 'flagged';
  
  // Organization data (populated from organization account for corporate members)
  portfolio?: {
    grossWrittenPremiums?: '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+';
    portfolioMix: Record<string, number>;
  };
  hasOtherAssociations?: boolean;
  primaryContact?: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  registeredAddress?: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
  businessAddress?: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
  
  // Additional organization data
  logoURL?: string;
  companySummary?: CompanySummary;
  linesOfBusiness?: string[];
  
  // Timestamps
  createdAt: any;
  updatedAt: any;
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

// Create or update unified member record (for individual accounts)
export const createUnifiedMember = async (
  uid: string,
  email: string,
  personalName: string,
  organizationName?: string,
  organizationType?: 'MGA' | 'carrier' | 'provider',
  status: 'guest' | 'pending' | 'approved' | 'admin' | 'pending_invoice' | 'pending_payment' = 'guest'
): Promise<UnifiedMember> => {
  const memberRef = doc(db, 'accounts', uid);
  const memberData: UnifiedMember = {
    id: uid,
    email,
    personalName,
    organizationName,
    organizationType,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(memberRef, memberData);
  
  // Create welcome message for new user (async, don't wait for completion)
  try {
    const { createWelcomeMessage } = await import('./unified-messaging');
    createWelcomeMessage(uid).catch(error => {
      console.error('Failed to create welcome message:', error);
    });
  } catch (error) {
    console.error('Failed to import welcome message function:', error);
  }
  
  return memberData;
};

// Get unified member record - SIMPLIFIED VERSION
// After migration, all accounts use Firebase Auth UIDs as document IDs
export const getUnifiedMember = async (uid: string): Promise<UnifiedMember | null> => {
  try {
    // Step 1: Direct lookup by Firebase Auth UID
    const accountRef = doc(db, 'accounts', uid);
    const accountSnap = await getDoc(accountRef);
    
    if (accountSnap.exists()) {
      const data = accountSnap.data();
      
      // All accounts are corporate - check if this is a primary contact account
      // Check if this user exists in the members subcollection by querying the 'id' field
      const membersRef = collection(db, 'accounts', uid, 'members');
      const memberQuery = query(membersRef, where('id', '==', uid));
      const memberSnapshot = await getDocs(memberQuery);
      
      if (!memberSnapshot.empty) {
        const memberDoc = memberSnapshot.docs[0];
        const memberData = memberDoc.data();
        
        return {
          id: uid,
          email: memberData.email,
          personalName: memberData.personalName || memberData.name || 'Unknown',
          jobTitle: memberData.jobTitle,
          isPrimaryContact: memberData.isPrimaryContact,
          memberJoinedAt: memberData.joinedAt,
          organizationId: uid, // Account ID = Primary Contact UID after migration
          organizationName: data.organizationName,
          organizationType: data.organizationType,
          status: data.status || 'approved',
          // Organization data (from main accounts document)
          portfolio: data.portfolio,
          hasOtherAssociations: data.hasOtherAssociations,
          primaryContact: data.primaryContact,
          registeredAddress: data.registeredAddress,
          logoURL: data.logoURL,
          linesOfBusiness: data.linesOfBusiness,
          createdAt: memberData.createdAt,
          updatedAt: memberData.updatedAt
        } as UnifiedMember;
      }
    }
    
    // Step 2: Fallback - search as team member in other corporate accounts
    // This handles team members who are not primary contacts
    const accountsRef = collection(db, 'accounts');
    const corporateQuery = query(accountsRef);
    const corporateSnapshot = await getDocs(corporateQuery);
    
    // First, collect all matching memberships to implement priority logic
    const matchingMemberships: Array<{
      memberData: any;
      orgData: any;
      orgDocId: string;
      isEmailMatch: boolean;
    }> = [];
    
    for (const orgDoc of corporateSnapshot.docs) {
      // Query members subcollection by the 'id' field (Firebase Auth UID)
      const membersRef = collection(db, 'accounts', orgDoc.id, 'members');
      const memberQuery = query(membersRef, where('id', '==', uid));
      const memberSnapshot = await getDocs(memberQuery);
      
      if (!memberSnapshot.empty) {
        const memberDoc = memberSnapshot.docs[0];
        const memberData = memberDoc.data();
        const orgData = orgDoc.data();
        
        // Check if user's email matches the main account email (primary contact)
        const isEmailMatch = orgData.email === memberData.email;
        
        matchingMemberships.push({
          memberData,
          orgData,
          orgDocId: orgDoc.id,
          isEmailMatch
        });
      }
    }
    
    // Apply priority logic: 
    // 1. Prioritize accounts where user's email matches the main account email
    // 2. If multiple email matches (shouldn't happen), take the first
    // 3. If no email matches, take the first membership found
    let selectedMembership = matchingMemberships.find(m => m.isEmailMatch) || matchingMemberships[0];
    
    if (selectedMembership) {
      const { memberData, orgData, orgDocId } = selectedMembership;
      
      return {
        id: uid,
        email: memberData.email,
        personalName: memberData.personalName || memberData.name || 'Unknown',
        jobTitle: memberData.jobTitle,
        isPrimaryContact: memberData.isPrimaryContact,
        memberJoinedAt: memberData.joinedAt,
        organizationId: orgDocId, // This will be primary contact's Firebase UID after migration
        organizationName: orgData.organizationName,
        organizationType: orgData.organizationType,
        status: orgData.status || 'approved',
        // Organization data (from main accounts document)
        portfolio: orgData.portfolio,
        hasOtherAssociations: orgData.hasOtherAssociations,
        primaryContact: orgData.primaryContact,
        registeredAddress: orgData.registeredAddress,
        logoURL: orgData.logoURL,
        linesOfBusiness: orgData.linesOfBusiness,
        createdAt: memberData.createdAt,
        updatedAt: memberData.updatedAt
      } as UnifiedMember;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting unified member:', error);
    return null;
  }
};

// Get organization data for a member
export const getOrganizationForMember = async (member: UnifiedMember): Promise<OrganizationAccount | null> => {
  // All accounts are corporate
  if (!member.organizationId) {
    return null;
  }
  
  try {
    const orgRef = doc(db, 'accounts', member.organizationId);
    const orgSnap = await getDoc(orgRef);
    
    if (orgSnap.exists()) {
      return { id: member.organizationId, ...orgSnap.data() } as OrganizationAccount;
    }
  } catch (error) {
    console.error('Error getting organization data:', error);
  }
  
  return null;
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
    console.log(`🔍 getMembersByStatus: Querying for status '${status}'...`);
    const allMembers: UnifiedMember[] = [];
    
    // Get corporate accounts with matching status and their members
    const accountsRef = collection(db, 'accounts');
    console.log('🔍 getMembersByStatus: Running corporate accounts query...');
    // All accounts are corporate now - query by status only
    const corporateQuery = query(accountsRef, where('status', '==', status));
    const corporateSnapshot = await getDocs(corporateQuery);
    console.log(`🔍 getMembersByStatus: Found ${corporateSnapshot.docs.length} corporate accounts with status '${status}'`);
    
    for (const orgDoc of corporateSnapshot.docs) {
      const orgData = orgDoc.data();
      console.log(`🔍 getMembersByStatus: Processing corporate account ${orgDoc.id} (${orgData.organizationName})`);
      const membersRef = collection(db, 'accounts', orgDoc.id, 'members');
      const membersSnapshot = await getDocs(membersRef);
      console.log(`🔍 getMembersByStatus: Found ${membersSnapshot.docs.length} members in corporate account ${orgDoc.id}`);
      
      membersSnapshot.docs.forEach(memberDoc => {
        const memberData = memberDoc.data();
        allMembers.push({
          id: memberDoc.id, // This is the Firebase Auth UID used as document ID
          email: memberData.email,
          personalName: memberData.personalName || memberData.name || 'Unknown',
          jobTitle: memberData.jobTitle,
          isPrimaryContact: memberData.isPrimaryContact,
          memberJoinedAt: memberData.joinedAt,
            organizationId: orgDoc.id,
          organizationName: orgData.organizationName,
          organizationType: orgData.organizationType,
          status: orgData.status,
          // Organization data from main accounts document
          portfolio: orgData.portfolio,
          hasOtherAssociations: orgData.hasOtherAssociations,
          primaryContact: orgData.primaryContact,
          registeredAddress: orgData.registeredAddress,
          businessAddress: orgData.businessAddress,
          logoURL: orgData.logoURL,
          linesOfBusiness: orgData.linesOfBusiness,
          website: orgData.website,
          carrierInfo: orgData.carrierInfo,
          createdAt: memberData.createdAt,
          updatedAt: memberData.updatedAt
        } as UnifiedMember);
      });
    }
    
    console.log(`🔍 getMembersByStatus: Total members found with status '${status}':`, {
      total: allMembers.length,
      withLocation: allMembers.filter(m => m.registeredAddress?.country).length
    });
    
    return allMembers;
  } catch (error) {
    console.error('Error getting members by status:', error);
    return [];
  }
};

// Get accounts by status (for admin portal - returns account-level data only)
export const getAccountsByStatus = async (status: UnifiedMember['status']): Promise<UnifiedMember[]> => {
  try {
    const allAccounts: UnifiedMember[] = [];
    const accountsRef = collection(db, 'accounts');

    // Get all accounts (individual + corporate) with matching status
    const accountsQuery = query(accountsRef, where('status', '==', status));
    const accountsSnapshot = await getDocs(accountsQuery);
    
    accountsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      allAccounts.push({
        id: doc.id, // This is the account ID, not member ID
        email: data.email,
        personalName: data.personalName || data.displayName || 'Unknown',
        status: data.status,
        organizationName: data.organizationName,
        organizationType: data.organizationType,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        // Include organization data
        portfolio: data.portfolio,
        hasOtherAssociations: data.hasOtherAssociations,
        primaryContact: data.primaryContact,
        registeredAddress: data.registeredAddress,
        // Include the actual business address and markets from the account document
        ...(data.businessAddress && { businessAddress: data.businessAddress }),
        markets: data.portfolio?.markets || [], // Markets are in portfolio.markets
        // Include other account fields that might be needed
        linesOfBusiness: data.linesOfBusiness,
        accountAdministrator: data.accountAdministrator,
        website: data.website,
        carrierInfo: data.carrierInfo
      } as UnifiedMember & { businessAddress?: any; markets?: string[]; website?: string; carrierInfo?: any });
    });
    
    
    return allAccounts;
  } catch (error) {
    console.error('Error getting accounts by status:', error);
    return [];
  }
};

// Get all approved members for directory (including invoice_sent status)
export const getApprovedMembersForDirectory = async (): Promise<UnifiedMember[]> => {
  try {
    const [approvedMembers, invoiceSentMembers] = await Promise.all([
      getAccountsByStatus('approved'),
      getAccountsByStatus('invoice_sent')
    ]);
    
    return [...approvedMembers, ...invoiceSentMembers];
  } catch (error) {
    console.error('Error getting approved members for directory:', error);
    return [];
  }
};

// Get all approved organizations with their subcollection members for directory (optimized)
export const getApprovedMembersWithSubcollections = async (): Promise<{
  organizations: UnifiedMember[];
  allMembers: Array<UnifiedMember & { companyName: string; companyId: string }>;
}> => {
  try {
    console.time('getApprovedMembersWithSubcollections');
    
    // Get approved and invoice_sent organizations in parallel
    const [approvedOrgs, invoiceSentOrgs] = await Promise.all([
      getAccountsByStatus('approved'),
      getAccountsByStatus('invoice_sent')
    ]);
    
    const allOrgs = [...approvedOrgs, ...invoiceSentOrgs];
    console.log(`📊 Found ${allOrgs.length} approved organizations`);
    
    // All organizations are corporate - fetch subcollection members in parallel
    const memberPromises = allOrgs.map(async (org) => {
      try {
        const membersRef = collection(db, 'accounts', org.id, 'members');
        const membersSnapshot = await getDocs(membersRef);
        
        return membersSnapshot.docs.map(memberDoc => {
          const memberData = memberDoc.data() as CompanyMember;
          
          // Create a UnifiedMember object for the subcollection member
          const unifiedMember: UnifiedMember & { companyName: string; companyId: string } = {
            id: memberData.id,
            email: memberData.email,
            personalName: memberData.personalName,
            organizationName: org.organizationName, // Use organization name
            organizationType: org.organizationType,
            status: org.status,
            createdAt: memberData.createdAt,
            updatedAt: memberData.updatedAt,
            jobTitle: memberData.jobTitle,
            isPrimaryContact: memberData.isPrimaryContact,
            companyName: org.organizationName || '',
            companyId: org.id,
            // Include organization-level data for context
            linesOfBusiness: org.linesOfBusiness,
            businessAddress: org.businessAddress
          };
          
          return unifiedMember;
        });
      } catch (error) {
        console.error(`Error fetching subcollection members for organization ${org.id}:`, error);
        return [];
      }
    });
    
    // Wait for all member fetches to complete
    const memberArrays = await Promise.all(memberPromises);
    const allMembers = memberArrays.flat(); // Flatten the arrays
    
    console.log(`📊 Found ${allMembers.length} total members across ${allOrgs.length} organizations`);
    console.timeEnd('getApprovedMembersWithSubcollections');
    
    return {
      organizations: allOrgs,
      allMembers
    };
  } catch (error) {
    console.error('Error getting approved members with subcollections:', error);
    console.timeEnd('getApprovedMembersWithSubcollections');
    return {
      organizations: [],
      allMembers: []
    };
  }
};

// Get members with member portal access (approved + admin)
export const getMembersWithPortalAccess = async (): Promise<UnifiedMember[]> => {
  try {
    const [approvedMembers, adminMembers] = await Promise.all([
      getMembersByStatus('approved'),
      getMembersByStatus('admin')
    ]);
    
    return [...approvedMembers, ...adminMembers];
  } catch (error) {
    console.error('Error getting members with portal access:', error);
    return [];
  }
};

// Get all members (regardless of status) - for messaging system
export const getAllMembers = async (): Promise<UnifiedMember[]> => {
  try {
    const [guests, pending, pendingInvoice, pendingPayment, approved, admins] = await Promise.all([
      getMembersByStatus('guest'),
      getMembersByStatus('pending'),
      getMembersByStatus('pending_invoice'),
      getMembersByStatus('pending_payment'),
      getMembersByStatus('approved'),
      getMembersByStatus('admin')
    ]);
    
    return [...guests, ...pending, ...pendingInvoice, ...pendingPayment, ...approved, ...admins];
  } catch (error) {
    console.error('Error getting all members:', error);
    return [];
  }
};

// Get members by organization type (for filtering)
export const getMembersByOrganizationType = async (organizationType: 'MGA' | 'carrier' | 'provider'): Promise<UnifiedMember[]> => {
  try {
    const allMembers = await getMembersWithPortalAccess();
    return allMembers.filter(member => member.organizationType === organizationType);
  } catch (error) {
    console.error('Error getting members by organization type:', error);
    return [];
  }
};

// Search members by organization name
export const searchMembersByOrganizationName = async (searchTerm: string): Promise<UnifiedMember[]> => {
  try {
    const allMembers = await getMembersWithPortalAccess();
    
    // Filter by organization name on client side (Firestore doesn't support case-insensitive search)
    return allMembers.filter(member => 
      member.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
  companyData: Partial<OrganizationAccount>,
  memberData: Omit<CompanyMember, 'createdAt' | 'updatedAt' | 'joinedAt'>
): Promise<{ companyId: string; memberId: string }> => {
  try {
    // Use primary contact's Firebase Auth UID as company ID
    const companyId = memberData.id; // This should be the Firebase Auth UID
    
    // Create the company account (NO personal data)
    const companyRef = doc(db, 'accounts', companyId);
    const companyRecord: OrganizationAccount = {
      id: companyId,
      organizationName: companyData.organizationName || 'Company Account',
      organizationType: companyData.organizationType,
      status: 'pending',
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

// Check if a UnifiedMember is part of a corporate account
// All members are now corporate
export const isCorporateMember = (member: UnifiedMember): boolean => {
  return true;
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
      // All companies are corporate
      const requests = await getJoinRequestsForCompany(company.id);
      const pendingRequests = requests
        .filter(req => req.status === 'pending')
        .map(req => ({ ...req, companyData: company }));
      allRequests.push(...pendingRequests);
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