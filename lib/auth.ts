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

// Create account and send verification email
export const createAccountWithVerification = async (email: string, password: string, personalName: string, organisation?: string): Promise<void> => {
  // Create the account first
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Create display name
  const displayName = organisation 
    ? `${personalName} (${organisation})`
    : personalName;
  
  // Update Firebase Auth profile
  await updateProfile(user, {
    displayName: displayName
  });

  // Create Firestore user profile (emailVerified will be false initially)
  await createUserProfile(user.uid, email, displayName, personalName, organisation);
  
  // Send verification email with custom redirect
  const actionCodeSettings = {
    url: `${window.location.origin}/login?verified=true`,
    handleCodeInApp: false,
  };
  
  await sendEmailVerification(user, actionCodeSettings);
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
        emailVerified: user.emailVerified, // Always use Firebase Auth as source of truth
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