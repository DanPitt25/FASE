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

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  personalName: string;
  organisation?: string;
  createdAt: any;
  updatedAt: any;
  twoFactorEnabled: boolean;
  access?: 'none' | 'admin' | 'subscriber'; // Add admin access to users
  markets?: string[]; // Array of country codes for MGA markets
  marketLinesOfBusiness?: {[countryCode: string]: string[]}; // Lines of business per market
}


export interface MemberApplication {
  id: string;
  uid: string; // Link to user document
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'invoice_sent';
  createdAt: any;
  updatedAt: any;
  
  // Basic information
  membershipType: 'corporate' | 'individual';
  organizationName: string;
  organizationType: 'MGA' | 'carrier' | 'provider';
  logoURL?: string; // URL to uploaded logo
  
  // Privacy agreements
  privacyAgreed: boolean;
  dataProcessingAgreed: boolean;
  
  // Primary contact
  primaryContact: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  
  // Organization details
  organizationDetails: {
    tradingName?: string;
    registeredNumber: string;
    vatNumber?: string;
    websiteUrl?: string;
  };
  
  // Regulatory information
  regulatory: {
    fcarNumber?: string;
    authorizedActivities: string[];
    regulatoryBody?: string;
  };
  
  // Registered address
  registeredAddress: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
  
  // Senior leadership
  seniorLeadership: Array<{
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
  
  // Service provider specific fields
  servicesProvided?: string[];
  
  // Terms agreement
  termsAgreed: boolean;
  
  // Additional fields
  hasOtherAssociations?: boolean;
  otherAssociations?: string[];
}

// Create user profile in Firestore
export const createUserProfile = async (
  uid: string, 
  email: string, 
  displayName: string,
  personalName: string,
  organisation?: string
): Promise<UserProfile> => {
  const userRef = doc(db, 'accounts', uid);
  const userData: UserProfile = {
    uid,
    email,
    displayName,
    personalName,
    ...(organisation && { organisation }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    twoFactorEnabled: false
  };
  
  await setDoc(userRef, userData);
  return userData;
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'accounts', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (
  uid: string, 
  updates: Partial<UserProfile>
): Promise<void> => {
  const userRef = doc(db, 'accounts', uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// Update display name
export const updateDisplayName = async (
  uid: string, 
  displayName: string
): Promise<void> => {
  await updateUserProfile(uid, { displayName });
};


// ============== DIRECTORY MEMBER INTERFACE ==============

export interface DirectoryMember {
  id: string;
  organizationName: string;
  organizationType: string;
  country: string;
  memberSince: string; // Year as string
  linesOfBusiness: Array<{ name: string; percentage: number }>;
  logoURL?: string; // Will be null for now
  website?: string; // Not available in current data structure
}

// ============== MEMBER APPLICATION FUNCTIONS ==============

// Create member application
export const createMemberApplication = async (
  uid: string,
  applicationData: Omit<MemberApplication, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    const applicationId = doc(collection(db, 'members')).id;
    const applicationRef = doc(db, 'members', applicationId);
    
    const memberApplication: MemberApplication = {
      id: applicationId,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...applicationData
    };
    
    await setDoc(applicationRef, memberApplication);
    return applicationId;
  } catch (error) {
    throw error;
  }
};

// Simplified version for integrated registration flow
export const createMemberApplicationSimple = async (
  membershipData: {
    membershipType: 'individual' | 'corporate';
    organizationName: string;
    organizationType?: string;
    primaryContact: {
      name: string;
      email: string;
      phone: string;
      jobTitle?: string;
    };
    registeredAddress: {
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    portfolio?: {
      grossWrittenPremiums?: string;
      portfolioMix?: {[key: string]: number};
    };
    hasOtherAssociations?: boolean;
    otherAssociations?: string[];
    logoUrl?: string;
  }
): Promise<string> => {
  // This will be called after createAccountWithVerification, so we need to get the current user
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('No authenticated user found');
  }
  
  try {
    const applicationId = doc(collection(db, 'members')).id;
    const applicationRef = doc(db, 'members', applicationId);
    
    // Convert to full MemberApplication format
    const memberApplication: MemberApplication = {
      id: applicationId,
      uid: currentUser.uid,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      
      // Basic information
      membershipType: membershipData.membershipType,
      organizationName: membershipData.organizationName,
      organizationType: (membershipData.organizationType as 'MGA' | 'carrier' | 'provider') || 'MGA',
      ...(membershipData.logoUrl && { logoURL: membershipData.logoUrl }),
      
      // Privacy agreements (default to true for integrated flow)
      privacyAgreed: true,
      dataProcessingAgreed: true,
      
      // Primary contact
      primaryContact: {
        name: membershipData.primaryContact.name,
        email: membershipData.primaryContact.email,
        phone: membershipData.primaryContact.phone,
        role: membershipData.primaryContact.jobTitle || 'Contact'
      },
      
      // Organization details (simplified for integrated flow)
      organizationDetails: {
        registeredNumber: '', // Not collected in simplified flow
        vatNumber: '',
        websiteUrl: ''
      },
      
      // Addresses
      registeredAddress: {
        line1: membershipData.registeredAddress.line1,
        line2: membershipData.registeredAddress.line2 || '',
        city: membershipData.registeredAddress.city,
        county: membershipData.registeredAddress.state || '',
        postcode: membershipData.registeredAddress.postalCode || '',
        country: membershipData.registeredAddress.country
      },
      
      // For simplicity, use same address for invoicing (can be different in full flow)
      invoicingAddress: {
        line1: membershipData.registeredAddress.line1,
        line2: membershipData.registeredAddress.line2 || '',
        city: membershipData.registeredAddress.city,
        county: membershipData.registeredAddress.state || '',
        postcode: membershipData.registeredAddress.postalCode || '',
        country: membershipData.registeredAddress.country,
        sameAsRegistered: true
      },
      
      // Portfolio information (for MGAs)
      ...(membershipData.portfolio && {
        portfolio: {
          grossWrittenPremiums: membershipData.portfolio.grossWrittenPremiums as '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+',
          portfolioMix: membershipData.portfolio.portfolioMix || {}
        }
      }),
      
      // Required but not collected in simplified flow
      regulatory: {
        fcarNumber: '',
        authorizedActivities: [],
        regulatoryBody: ''
      },
      
      // Simplified - use primary contact as senior leadership
      seniorLeadership: [{
        name: membershipData.primaryContact.name,
        role: membershipData.primaryContact.jobTitle || 'Contact',
        email: membershipData.primaryContact.email
      }],
      
      // Terms agreed (default to true for integrated flow)
      termsAgreed: true,
      
      // Additional fields
      hasOtherAssociations: membershipData.hasOtherAssociations || false,
      otherAssociations: membershipData.otherAssociations || []
    };
    
    await setDoc(applicationRef, memberApplication);
    return applicationId;
  } catch (error) {
    throw error;
  }
};

// Get member application by ID
export const getMemberApplication = async (applicationId: string): Promise<MemberApplication | null> => {
  try {
    const applicationRef = doc(db, 'members', applicationId);
    const applicationDoc = await getDoc(applicationRef);
    
    if (applicationDoc.exists()) {
      return applicationDoc.data() as MemberApplication;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Get member applications by user ID
export const getMemberApplicationsByUserId = async (uid: string): Promise<MemberApplication[]> => {
  try {
    const applicationsRef = collection(db, 'members');
    const q = query(applicationsRef, where('uid', '==', uid));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data() as MemberApplication);
  } catch (error) {
    return [];
  }
};

// Update member application status
export const updateMemberApplicationStatus = async (
  applicationId: string, 
  status: MemberApplication['status']
): Promise<void> => {
  try {
    const applicationRef = doc(db, 'members', applicationId);
    await updateDoc(applicationRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

// Get all member applications (for admin use)
export const getAllMemberApplications = async (): Promise<MemberApplication[]> => {
  try {
    const applicationsRef = collection(db, 'members');
    const querySnapshot = await getDocs(applicationsRef);
    
    return querySnapshot.docs.map(doc => doc.data() as MemberApplication);
  } catch (error) {
    return [];
  }
};

// Get member applications by status
export const getMemberApplicationsByStatus = async (status: MemberApplication['status']): Promise<MemberApplication[]> => {
  try {
    const applicationsRef = collection(db, 'members');
    const q = query(applicationsRef, where('status', '==', status));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data() as MemberApplication);
  } catch (error) {
    return [];
  }
};

// Get all approved members for directory
export const getApprovedMembersForDirectory = async (): Promise<DirectoryMember[]> => {
  try {
    const membersRef = collection(db, 'members');
    const q = query(membersRef, where('status', '==', 'approved'));
    const querySnapshot = await getDocs(q);
    
    const directoryMembers: DirectoryMember[] = [];
    
    querySnapshot.docs.forEach(doc => {
      const memberData = doc.data() as MemberApplication;
      
      // Extract year from createdAt timestamp
      let memberSince = 'Unknown';
      if (memberData.createdAt && memberData.createdAt.toDate) {
        memberSince = memberData.createdAt.toDate().getFullYear().toString();
      }
      
      // Process portfolio mix into lines of business
      const linesOfBusiness: Array<{ name: string; percentage: number }> = [];
      if (memberData.portfolio?.portfolioMix) {
        Object.entries(memberData.portfolio.portfolioMix).forEach(([line, percentage]) => {
          if (typeof percentage === 'number' && percentage > 0) {
            linesOfBusiness.push({ name: line, percentage });
          }
        });
      }
      
      const directoryMember: DirectoryMember = {
        id: doc.id,
        organizationName: memberData.organizationName || 'Unknown Organization',
        organizationType: memberData.organizationType || 'Unknown',
        country: memberData.registeredAddress?.country || 'Unknown',
        memberSince,
        linesOfBusiness,
        logoURL: memberData.logoURL, // Use logo URL from member application
        website: memberData.organizationDetails?.websiteUrl
      };
      
      directoryMembers.push(directoryMember);
    });
    
    // Sort by organization name
    return directoryMembers.sort((a, b) => a.organizationName.localeCompare(b.organizationName));
  } catch (error) {
    return [];
  }
};

// Update member payment status
export const updateMemberApplicationPaymentStatus = async (
  userId: string,
  paymentStatus: 'pending' | 'paid' | 'failed',
  paymentMethod?: string,
  paymentId?: string
) => {
  try {
    const membersRef = collection(db, 'members');
    const q = query(membersRef, where('uid', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      await updateDoc(doc.ref, {
        status: paymentStatus === 'paid' ? 'approved' : paymentStatus,
        paymentStatus,
        paymentMethod: paymentMethod || null,
        paymentId: paymentId || null,
        updatedAt: new Date()
      });
    } else {
    }
  } catch (error) {
    throw error;
  }
};

// ==========================================
// ALERTS SYSTEM
// ==========================================

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetAudience: 'all' | 'members' | 'admins' | 'specific';
  targetUsers?: string[]; // Array of user IDs if targetAudience is 'specific'
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  createdBy: string; // Admin user ID
  expiresAt?: any; // Optional expiration date
  actionRequired: boolean;
  actionUrl?: string; // Optional URL for action button
  actionText?: string; // Text for action button
}

export interface UserAlert {
  id: string;
  alertId: string;
  userId: string;
  isRead: boolean;
  isDismissed: boolean;
  readAt?: any;
  dismissedAt?: any;
  createdAt: any;
}


// ==========================================
// MEMBER FILTERING FUNCTIONS
// ==========================================

// Get members by organization type
export const getMembersByOrganizationType = async (organizationType: 'MGA' | 'carrier' | 'provider'): Promise<MemberApplication[]> => {
  try {
    const membersRef = collection(db, 'members');
    const membersQuery = query(
      membersRef, 
      where('status', '==', 'approved'),
      where('organizationType', '==', organizationType)
    );
    const members = await getDocs(membersQuery);
    
    return members.docs.map(doc => doc.data() as MemberApplication);
  } catch (error) {
    throw error;
  }
};

// Search members by organization name
export const searchMembersByOrganizationName = async (searchTerm: string): Promise<MemberApplication[]> => {
  try {
    const membersRef = collection(db, 'members');
    const membersQuery = query(membersRef, where('status', '==', 'approved'));
    const members = await getDocs(membersQuery);
    
    // Filter by organization name on client side (Firestore doesn't support case-insensitive search)
    const filteredMembers = members.docs
      .map(doc => doc.data() as MemberApplication)
      .filter(member => 
        member.organizationName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return filteredMembers;
  } catch (error) {
    throw error;
  }
};

// Get user IDs for members matching criteria
export const getUserIdsForMemberCriteria = async (criteria: {
  organizationType?: 'MGA' | 'carrier' | 'provider';
  organizationNames?: string[];
}): Promise<string[]> => {
  try {
    let members: MemberApplication[] = [];
    
    if (criteria.organizationType) {
      members = await getMembersByOrganizationType(criteria.organizationType);
    } else {
      // Get all approved members
      const membersRef = collection(db, 'members');
      const membersQuery = query(membersRef, where('status', '==', 'approved'));
      const allMembers = await getDocs(membersQuery);
      members = allMembers.docs.map(doc => doc.data() as MemberApplication);
    }
    
    // Filter by organization names if provided
    if (criteria.organizationNames && criteria.organizationNames.length > 0) {
      members = members.filter(member => 
        criteria.organizationNames!.includes(member.organizationName)
      );
    }
    
    return members.map(member => member.uid);
  } catch (error) {
    throw error;
  }
};

