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
  User,
  applyActionCode,
  checkActionCode
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
}



// Sign in existing user - simplified to only use Firebase Auth data
export const signIn = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // TODO: Re-enable email verification check in production
    // For now, allow unverified emails for development/preview
    // if (!user.emailVerified) {
    //   await firebaseSignOut(auth);
    //   throw new Error('Please verify your email address before signing in. Check your inbox for a verification email.');
    // }
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      twoFactorEnabled: false // Default to false since we don't store this in Firestore anymore
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
        emailVerified: user.emailVerified,
        twoFactorEnabled: false // Default to false since we don't store this in Firestore anymore
      });
    } else {
      callback(null);
    }
  });
};

// Send email verification to current user
export const sendVerificationEmail = async (): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('No user is currently signed in');
  }
  
  try {
    const actionCodeSettings = {
      url: `${typeof window !== 'undefined' ? window.location.origin : 'https://fase-site.vercel.app'}/register?verified=true`,
      handleCodeInApp: false,
    };
    
    await sendEmailVerification(auth.currentUser, actionCodeSettings);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Resend verification email for a specific user (without staying signed in)
export const resendVerificationEmail = async (email: string, password: string): Promise<void> => {
  try {
    // Temporarily sign in to send verification email
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if (user.emailVerified) {
      throw new Error('Email is already verified. You can sign in normally.');
    }
    
    const actionCodeSettings = {
      url: `${typeof window !== 'undefined' ? window.location.origin : 'https://fase-site.vercel.app'}/login?verified=true`,
      handleCodeInApp: false,
    };
    
    await sendEmailVerification(user, actionCodeSettings);
    
    // Sign out immediately after sending verification
    await firebaseSignOut(auth);
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

// Generate and send verification code (works without authentication)
export const sendVerificationCode = async (email: string): Promise<void> => {
  try {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code in Firestore with expiration (20 minutes)
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes from now
    
    await setDoc(doc(db, 'verification_codes', email), {
      code,
      email,
      expiresAt,
      createdAt: new Date(),
      used: false
    });
    
    // Send email via Firebase function (unauthenticated call)
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