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
import { db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  personalName: string;
  organisation?: string;
  createdAt: any;
  updatedAt: any;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface Subscriber {
  id: string;
  type: 'MGA' | 'provider' | 'carrier' | 'individual' | 'internal';
  access: 'none' | 'admin' | 'subscriber';
  logo?: string; // URL to logo in Firebase Storage
  uid: string; // Link to user document
  createdAt: any;
  updatedAt: any;
  // Stripe-related fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus?: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  stripePriceId?: string;
  subscriptionCurrentPeriodEnd?: any;
  subscriptionCurrentPeriodStart?: any;
  // Organization details
  organizationName?: string;
  grossWrittenPremiums?: '<10m' | '10-20m' | '20-50m' | '50-100m' | '100-500m' | '500m+';
  annualAmount?: number; // Amount in cents
}

export interface MemberApplication {
  id: string;
  uid: string; // Link to user document
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: any;
  updatedAt: any;
  
  // Basic information
  membershipType: 'corporate' | 'individual';
  organizationName: string;
  organizationType: 'MGA' | 'carrier' | 'provider';
  
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
    organisation,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    emailVerified: false,
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

// ============== SUBSCRIBER FUNCTIONS ==============

// Create subscriber profile
export const createSubscriber = async (
  uid: string,
  type: Subscriber['type'],
  access: Subscriber['access'] = 'none',
  logo?: string
): Promise<Subscriber> => {
  const subscriberRef = doc(db, 'subscribers', uid);
  const subscriberData: Subscriber = {
    id: uid,
    type,
    access,
    logo,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(subscriberRef, subscriberData);
  return subscriberData;
};

// Get subscriber by uid
export const getSubscriber = async (uid: string): Promise<Subscriber | null> => {
  try {
    const subscriberRef = doc(db, 'subscribers', uid);
    const subscriberSnap = await getDoc(subscriberRef);
    
    if (subscriberSnap.exists()) {
      return subscriberSnap.data() as Subscriber;
    }
    return null;
  } catch (error) {
    console.error('Error getting subscriber:', error);
    return null;
  }
};

// Update subscriber profile
export const updateSubscriber = async (
  uid: string,
  updates: Partial<Omit<Subscriber, 'id' | 'uid' | 'createdAt'>>
): Promise<void> => {
  const subscriberRef = doc(db, 'subscribers', uid);
  await updateDoc(subscriberRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// Get all subscribers (for admin use)
export const getAllSubscribers = async (): Promise<Subscriber[]> => {
  try {
    const subscribersRef = collection(db, 'subscribers');
    const querySnapshot = await getDocs(subscribersRef);
    
    return querySnapshot.docs.map(doc => doc.data() as Subscriber);
  } catch (error) {
    console.error('Error getting all subscribers:', error);
    return [];
  }
};

// Get subscribers by type
export const getSubscribersByType = async (type: Subscriber['type']): Promise<Subscriber[]> => {
  try {
    const subscribersRef = collection(db, 'subscribers');
    const q = query(subscribersRef, where('type', '==', type));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data() as Subscriber);
  } catch (error) {
    console.error('Error getting subscribers by type:', error);
    return [];
  }
};

// Get subscribers by access level
export const getSubscribersByAccess = async (access: Subscriber['access']): Promise<Subscriber[]> => {
  try {
    const subscribersRef = collection(db, 'subscribers');
    const q = query(subscribersRef, where('access', '==', access));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data() as Subscriber);
  } catch (error) {
    console.error('Error getting subscribers by access:', error);
    return [];
  }
};

// ============== STRIPE-RELATED FUNCTIONS ==============

// Create subscriber with Stripe subscription data
export const createSubscriberWithStripe = async (
  uid: string,
  organizationName: string,
  type: Subscriber['type'],
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  stripeSubscriptionStatus: Subscriber['stripeSubscriptionStatus'],
  stripePriceId: string,
  subscriptionCurrentPeriodStart: any,
  subscriptionCurrentPeriodEnd: any,
  annualAmount: number,
  grossWrittenPremiums?: Subscriber['grossWrittenPremiums'],
  logo?: string
): Promise<Subscriber> => {
  const subscriberRef = doc(db, 'subscribers', uid);
  const subscriberData: Subscriber = {
    id: uid,
    type,
    access: 'subscriber', // Default to subscriber access for paid users
    logo,
    uid,
    organizationName,
    grossWrittenPremiums,
    stripeCustomerId,
    stripeSubscriptionId,
    stripeSubscriptionStatus,
    stripePriceId,
    subscriptionCurrentPeriodStart,
    subscriptionCurrentPeriodEnd,
    annualAmount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  await setDoc(subscriberRef, subscriberData);
  return subscriberData;
};

// Update subscriber Stripe status
export const updateSubscriberStripeStatus = async (
  uid: string,
  stripeSubscriptionStatus: Subscriber['stripeSubscriptionStatus'],
  subscriptionCurrentPeriodStart?: any,
  subscriptionCurrentPeriodEnd?: any
): Promise<void> => {
  const subscriberRef = doc(db, 'subscribers', uid);
  const updates: any = {
    stripeSubscriptionStatus,
    updatedAt: serverTimestamp()
  };
  
  if (subscriptionCurrentPeriodStart) {
    updates.subscriptionCurrentPeriodStart = subscriptionCurrentPeriodStart;
  }
  
  if (subscriptionCurrentPeriodEnd) {
    updates.subscriptionCurrentPeriodEnd = subscriptionCurrentPeriodEnd;
  }
  
  // Update access based on subscription status
  if (stripeSubscriptionStatus === 'active') {
    updates.access = 'subscriber';
  } else if (['canceled', 'incomplete_expired', 'unpaid'].includes(stripeSubscriptionStatus || '')) {
    updates.access = 'none';
  }
  
  await updateDoc(subscriberRef, updates);
};

// Get subscriber by Stripe customer ID
export const getSubscriberByStripeCustomerId = async (stripeCustomerId: string): Promise<Subscriber | null> => {
  try {
    const subscribersRef = collection(db, 'subscribers');
    const q = query(subscribersRef, where('stripeCustomerId', '==', stripeCustomerId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Subscriber;
    }
    return null;
  } catch (error) {
    console.error('Error getting subscriber by Stripe customer ID:', error);
    return null;
  }
};

// Get subscriber by Stripe subscription ID
export const getSubscriberByStripeSubscriptionId = async (stripeSubscriptionId: string): Promise<Subscriber | null> => {
  try {
    const subscribersRef = collection(db, 'subscribers');
    const q = query(subscribersRef, where('stripeSubscriptionId', '==', stripeSubscriptionId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Subscriber;
    }
    return null;
  } catch (error) {
    console.error('Error getting subscriber by Stripe subscription ID:', error);
    return null;
  }
};

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