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