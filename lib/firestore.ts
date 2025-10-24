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
  const userRef = doc(db, 'users', uid);
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
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (
  uid: string, 
  updates: Partial<UserProfile>
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
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
    console.log('Member application created with ID:', applicationId);
    return applicationId;
  } catch (error) {
    console.error('Error creating member application:', error);
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
    console.log('Member application created with ID:', applicationId);
    return applicationId;
  } catch (error) {
    console.error('Error creating member application:', error);
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
    console.error('Error getting member application:', error);
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
    console.error('Error getting member applications by user ID:', error);
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
    console.log('Member application status updated:', applicationId, status);
  } catch (error) {
    console.error('Error updating member application status:', error);
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
    console.error('Error getting all member applications:', error);
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
    console.error('Error getting member applications by status:', error);
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
    console.error('Error getting approved members for directory:', error);
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
      console.log('Payment status updated for member:', userId);
    } else {
      console.log('No member found with uid:', userId);
    }
  } catch (error) {
    console.error('Error updating payment status:', error);
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

// Create a new alert (admin only)
export const createAlert = async (alertData: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const alertsRef = collection(db, 'alerts');
    const alertDoc = doc(alertsRef);
    
    const alert: Alert = {
      ...alertData,
      id: alertDoc.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(alertDoc, alert);
    
    // If targeting all users or members, create user alert records for existing users
    if (alertData.targetAudience === 'all' || alertData.targetAudience === 'members') {
      await createUserAlertsForAudience(alertDoc.id, alertData.targetAudience);
    } else if (alertData.targetAudience === 'specific' && alertData.targetUsers) {
      await createUserAlertsForUsers(alertDoc.id, alertData.targetUsers);
    }
    
    return alertDoc.id;
  } catch (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
};

// Create user alert records for a specific audience
const createUserAlertsForAudience = async (alertId: string, audience: 'all' | 'members' | 'admins') => {
  try {
    const usersRef = collection(db, 'users');
    let usersQuery;
    
    if (audience === 'admins') {
      usersQuery = query(usersRef, where('access', '==', 'admin'));
    } else if (audience === 'members') {
      // Get users who have approved member applications
      const applicationsRef = collection(db, 'members');
      const approvedAppsQuery = query(applicationsRef, where('status', '==', 'approved'));
      const approvedApps = await getDocs(approvedAppsQuery);
      const memberUids = approvedApps.docs.map(doc => doc.data().uid);
      
      if (memberUids.length > 0) {
        usersQuery = query(usersRef, where('uid', 'in', memberUids));
      } else {
        return; // No approved members
      }
    } else {
      // All users
      usersQuery = query(usersRef);
    }
    
    const users = await getDocs(usersQuery);
    
    const userAlertPromises = users.docs.map(userDoc => {
      const userAlertRef = doc(collection(db, 'userAlerts'));
      const userAlert: UserAlert = {
        id: userAlertRef.id,
        alertId,
        userId: userDoc.data().uid,
        isRead: false,
        isDismissed: false,
        createdAt: serverTimestamp()
      };
      return setDoc(userAlertRef, userAlert);
    });
    
    await Promise.all(userAlertPromises);
  } catch (error) {
    console.error('Error creating user alerts for audience:', error);
    throw error;
  }
};

// Create user alert records for specific users
const createUserAlertsForUsers = async (alertId: string, userIds: string[]) => {
  try {
    const userAlertPromises = userIds.map(userId => {
      const userAlertRef = doc(collection(db, 'userAlerts'));
      const userAlert: UserAlert = {
        id: userAlertRef.id,
        alertId,
        userId,
        isRead: false,
        isDismissed: false,
        createdAt: serverTimestamp()
      };
      return setDoc(userAlertRef, userAlert);
    });
    
    await Promise.all(userAlertPromises);
  } catch (error) {
    console.error('Error creating user alerts for specific users:', error);
    throw error;
  }
};

// Get alerts for a specific user
export const getUserAlerts = async (userId: string): Promise<(Alert & UserAlert)[]> => {
  try {
    const userAlertsRef = collection(db, 'userAlerts');
    const userAlertsQuery = query(
      userAlertsRef, 
      where('userId', '==', userId),
      where('isDismissed', '==', false)
    );
    
    const userAlerts = await getDocs(userAlertsQuery);
    
    const alertsWithDetails = await Promise.all(
      userAlerts.docs.map(async (userAlertDoc) => {
        const userAlert = userAlertDoc.data() as UserAlert;
        const alertDoc = await getDoc(doc(db, 'alerts', userAlert.alertId));
        
        if (alertDoc.exists()) {
          const alert = alertDoc.data() as Alert;
          // Only return active alerts that haven't expired
          if (alert.isActive && (!alert.expiresAt || alert.expiresAt.toDate() > new Date())) {
            return { ...alert, ...userAlert };
          }
        }
        return null;
      })
    );
    
    return alertsWithDetails.filter(alert => alert !== null) as (Alert & UserAlert)[];
  } catch (error) {
    console.error('Error getting user alerts:', error);
    throw error;
  }
};

// Mark alert as read
export const markAlertAsRead = async (userAlertId: string): Promise<void> => {
  try {
    const userAlertRef = doc(db, 'userAlerts', userAlertId);
    await updateDoc(userAlertRef, {
      isRead: true,
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    throw error;
  }
};

// Dismiss alert
export const dismissAlert = async (userAlertId: string): Promise<void> => {
  try {
    const userAlertRef = doc(db, 'userAlerts', userAlertId);
    await updateDoc(userAlertRef, {
      isDismissed: true,
      dismissedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error dismissing alert:', error);
    throw error;
  }
};

// Get all alerts for admin management
export const getAllAlerts = async (): Promise<Alert[]> => {
  try {
    const alertsRef = collection(db, 'alerts');
    const alertsSnapshot = await getDocs(alertsRef);
    
    return alertsSnapshot.docs.map(doc => doc.data() as Alert);
  } catch (error) {
    console.error('Error getting all alerts:', error);
    throw error;
  }
};

// Update alert
export const updateAlert = async (alertId: string, updates: Partial<Alert>): Promise<void> => {
  try {
    const alertRef = doc(db, 'alerts', alertId);
    await updateDoc(alertRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    throw error;
  }
};

// ==========================================
// MESSAGING SYSTEM
// ==========================================

export interface Message {
  id: string;
  subject: string;
  content: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientId?: string; // For direct messages
  recipientType: 'user' | 'all_members' | 'all_admins' | 'all_users';
  messageType: 'direct' | 'announcement' | 'system';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: any;
  updatedAt: any;
  parentMessageId?: string; // For reply threads
  attachments?: string[]; // URLs to attachments
}

export interface MessageThread {
  id: string;
  participants: string[]; // Array of user IDs
  lastMessage: string;
  lastMessageAt: any;
  createdAt: any;
  updatedAt: any;
  subject: string;
  isActive: boolean;
}

export interface UserMessage {
  id: string;
  messageId: string;
  userId: string;
  isRead: boolean;
  readAt?: any;
  isDeleted: boolean;
  deletedAt?: any;
  createdAt: any;
}

// Send a message
export const sendMessage = async (messageData: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const messagesRef = collection(db, 'messages');
    const messageDoc = doc(messagesRef);
    
    const message: Message = {
      ...messageData,
      id: messageDoc.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(messageDoc, message);
    
    // Create user message records based on recipient type
    await createUserMessagesForRecipients(messageDoc.id, messageData.recipientType, messageData.recipientId);
    
    return messageDoc.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Create user message records for recipients
const createUserMessagesForRecipients = async (messageId: string, recipientType: string, recipientId?: string) => {
  try {
    let recipientIds: string[] = [];
    
    if (recipientType === 'user' && recipientId) {
      recipientIds = [recipientId];
    } else if (recipientType === 'all_members') {
      // Get all approved members
      const applicationsRef = collection(db, 'members');
      const approvedAppsQuery = query(applicationsRef, where('status', '==', 'approved'));
      const approvedApps = await getDocs(approvedAppsQuery);
      const memberUids = approvedApps.docs.map(doc => doc.data().uid);
      
      // Also include admins (they have member portal access)
      const usersRef = collection(db, 'users');
      const adminsQuery = query(usersRef, where('access', '==', 'admin'));
      const admins = await getDocs(adminsQuery);
      const adminUids = admins.docs.map(doc => doc.data().uid);
      
      // Combine and deduplicate
      recipientIds = Array.from(new Set([...memberUids, ...adminUids]));
    } else if (recipientType === 'all_admins') {
      // Get all admin users
      const usersRef = collection(db, 'users');
      const adminsQuery = query(usersRef, where('access', '==', 'admin'));
      const admins = await getDocs(adminsQuery);
      recipientIds = admins.docs.map(doc => doc.data().uid);
    } else if (recipientType === 'all_users') {
      // Get all users
      const usersRef = collection(db, 'users');
      const users = await getDocs(usersRef);
      recipientIds = users.docs.map(doc => doc.data().uid);
    }
    
    const userMessagePromises = recipientIds.map(userId => {
      const userMessageRef = doc(collection(db, 'userMessages'));
      const userMessage: UserMessage = {
        id: userMessageRef.id,
        messageId,
        userId,
        isRead: false,
        isDeleted: false,
        createdAt: serverTimestamp()
      };
      return setDoc(userMessageRef, userMessage);
    });
    
    await Promise.all(userMessagePromises);
  } catch (error) {
    console.error('Error creating user messages for recipients:', error);
    throw error;
  }
};

// Get messages for a specific user
export const getUserMessages = async (userId: string): Promise<(Message & UserMessage)[]> => {
  try {
    const userMessagesRef = collection(db, 'userMessages');
    const userMessagesQuery = query(
      userMessagesRef,
      where('userId', '==', userId),
      where('isDeleted', '==', false)
    );
    
    const userMessages = await getDocs(userMessagesQuery);
    
    const messagesWithDetails = await Promise.all(
      userMessages.docs.map(async (userMessageDoc) => {
        const userMessage = userMessageDoc.data() as UserMessage;
        const messageDoc = await getDoc(doc(db, 'messages', userMessage.messageId));
        
        if (messageDoc.exists()) {
          const message = messageDoc.data() as Message;
          return { 
            ...message, 
            ...userMessage,
            userMessageId: userMessage.id  // Keep track of userMessage ID for updates
          };
        }
        return null;
      })
    );
    
    return messagesWithDetails.filter(message => message !== null) as (Message & UserMessage)[];
  } catch (error) {
    console.error('Error getting user messages:', error);
    throw error;
  }
};

// Mark message as read
export const markMessageAsRead = async (userMessageId: string): Promise<void> => {
  try {
    const userMessageRef = doc(db, 'userMessages', userMessageId);
    await updateDoc(userMessageRef, {
      isRead: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

// Delete message for user
export const deleteMessageForUser = async (userMessageId: string): Promise<void> => {
  try {
    const userMessageRef = doc(db, 'userMessages', userMessageId);
    await updateDoc(userMessageRef, {
      isDeleted: true,
      deletedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting message for user:', error);
    throw error;
  }
};

// Get sent messages for a user
export const getSentMessages = async (userId: string): Promise<Message[]> => {
  try {
    const messagesRef = collection(db, 'messages');
    const sentMessagesQuery = query(messagesRef, where('senderId', '==', userId));
    const sentMessages = await getDocs(sentMessagesQuery);
    
    return sentMessages.docs.map(doc => doc.data() as Message);
  } catch (error) {
    console.error('Error getting sent messages:', error);
    throw error;
  }
};

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
    console.error('Error getting members by organization type:', error);
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
    console.error('Error searching members by organization name:', error);
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
    console.error('Error getting user IDs for member criteria:', error);
    throw error;
  }
};

