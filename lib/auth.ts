import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reload,
  User
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  twoFactorEnabled?: boolean;
}



// Sign in existing user - simplified to only use Firebase Auth data
export const signIn = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      twoFactorEnabled: false
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

// Auth state observer - simplified to only use Firebase Auth data
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        twoFactorEnabled: false
      });
    } else {
      callback(null);
    }
  });
};


// Generate and send verification code (works without authentication)
export const sendVerificationCode = async (email: string): Promise<void> => {
  try {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Call Firebase Function to handle both Firestore write and email sending
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('./firebase');
    
    const sendEmailFunction = httpsCallable(functions, 'sendVerificationCode');
    const result = await sendEmailFunction({ email, code });
    
    if (!result.data || !(result.data as any).success) {
      throw new Error('Failed to send verification email');
    }
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    console.error('Error details:', error.message, error.code);
    throw new Error('Failed to send verification code');
  }
};

// Verify the code (works without authentication)
export const verifyCode = async (email: string, code: string): Promise<boolean> => {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    const docRef = doc(db, 'verification_codes', email);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Invalid verification code');
    }
    
    const data = docSnap.data();
    
    // Check if code matches
    if (data.code !== code) {
      throw new Error('Invalid verification code');
    }
    
    // Check if code is expired
    if (new Date() > data.expiresAt.toDate()) {
      throw new Error('Verification code has expired');
    }
    
    // Check if code was already used
    if (data.used) {
      throw new Error('Verification code has already been used');
    }
    
    // Delete the verification code after successful use
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(docRef);
    
    // Don't create any accounts here - just verify the code
    // Account creation happens later during payment/invoice selection
    
    return true;
  } catch (error: any) {
    console.error('Error verifying code:', error);
    throw new Error(error.message || 'Failed to verify code');
  }
};

// Set admin claim for a user
export const setAdminClaim = async (targetUserId: string): Promise<void> => {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const setAdminClaimFunction = httpsCallable(functions, 'setAdminClaim');
    
    const result = await setAdminClaimFunction({ targetUserId });
    console.log('Admin claim set:', result.data);
  } catch (error: any) {
    console.error('Error setting admin claim:', error);
    throw new Error(error.message || 'Failed to set admin claim');
  }
};

// Remove admin claim for a user
export const removeAdminClaim = async (targetUserId: string): Promise<void> => {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const removeAdminClaimFunction = httpsCallable(functions, 'removeAdminClaim');
    
    const result = await removeAdminClaimFunction({ targetUserId });
    console.log('Admin claim removed:', result.data);
  } catch (error: any) {
    console.error('Error removing admin claim:', error);
    throw new Error(error.message || 'Failed to remove admin claim');
  }
};