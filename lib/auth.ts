import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
  reload,
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile, getUserProfile, updateUserProfile, UserProfile } from './firestore';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
}

// Send verification email before account creation
export const sendVerificationForSignup = async (email: string, personalName: string, organisation?: string): Promise<void> => {
  const actionCodeSettings = {
    url: `${window.location.origin}/verify-signup`,
    handleCodeInApp: true,
  };

  // Store registration data locally for after verification
  const registrationData = {
    email,
    personalName,
    organisation,
    timestamp: Date.now()
  };
  
  localStorage.setItem('pendingRegistration', JSON.stringify(registrationData));
  
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
};

// Complete signup after email verification
export const completeSignupAfterVerification = async (email: string, password: string): Promise<AuthUser> => {
  try {
    // Get stored registration data
    const storedData = localStorage.getItem('pendingRegistration');
    if (!storedData) {
      throw new Error('No pending registration found');
    }
    
    const registrationData = JSON.parse(storedData);
    if (registrationData.email !== email) {
      throw new Error('Email mismatch');
    }
    
    // Complete email link sign-in (this creates the account with verified email)
    const userCredential = await signInWithEmailLink(auth, email, window.location.href);
    const user = userCredential.user;
    
    // Set password for the account
    await updatePassword(user, password);
    
    // Create display name
    const displayName = registrationData.organisation 
      ? `${registrationData.personalName} (${registrationData.organisation})`
      : registrationData.personalName;
    
    // Update Firebase Auth profile
    await updateProfile(user, {
      displayName: displayName
    });

    // Create Firestore user profile with verified email
    await createUserProfile(user.uid, email, displayName, registrationData.personalName, registrationData.organisation);
    
    // Update Firestore to mark email as verified
    await updateUserProfile(user.uid, { emailVerified: true });
    
    // Clear pending registration
    localStorage.removeItem('pendingRegistration');

    return {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      emailVerified: true, // Email was verified via link
      twoFactorEnabled: false
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Check if current URL is a signup verification link
export const isSignupVerificationLink = (): boolean => {
  return isSignInWithEmailLink(auth, window.location.href);
};

// Handle signup verification link
export const handleSignupVerificationLink = async (): Promise<string | null> => {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return null;
  }
  
  const storedData = localStorage.getItem('pendingRegistration');
  if (!storedData) {
    throw new Error('No pending registration found');
  }
  
  const registrationData = JSON.parse(storedData);
  return registrationData.email;
};

// Sign in existing user
export const signIn = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user profile from Firestore
    const userProfile = await getUserProfile(user.uid);
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: userProfile?.displayName || user.displayName,
      emailVerified: user.emailVerified,
      twoFactorEnabled: userProfile?.twoFactorEnabled || false
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign out user
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Get user profile from Firestore
      const userProfile = await getUserProfile(user.uid);
      
      callback({
        uid: user.uid,
        email: user.email,
        displayName: userProfile?.displayName || user.displayName,
        emailVerified: userProfile?.emailVerified ?? user.emailVerified,
        twoFactorEnabled: userProfile?.twoFactorEnabled || false
      });
    } else {
      callback(null);
    }
  });
};

// Send email verification
export const sendVerificationEmail = async (): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('No user is currently signed in');
  }
  
  try {
    await sendEmailVerification(auth.currentUser);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Check if email is verified and refresh user
export const checkEmailVerification = async (): Promise<boolean> => {
  if (!auth.currentUser) {
    return false;
  }
  
  try {
    await reload(auth.currentUser);
    return auth.currentUser.emailVerified;
  } catch (error: any) {
    console.error('Error checking email verification:', error);
    return false;
  }
};