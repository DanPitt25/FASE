import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  twoFactorEnabled?: boolean;
}

export class AccountPendingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountPendingError';
  }
}

export class AccountNotApprovedError extends Error {
  constructor(message: string, public status: string) {
    super(message);
    this.name = 'AccountNotApprovedError';
  }
}

export class AccountInvoicePendingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountInvoicePendingError';
  }
}

export class AccountNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountNotFoundError';
  }
}



// Sign in existing user - now checks member status before allowing login
export const signIn = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Account status checking moved to UnifiedAuthContext after authentication
    // This allows the user to sign in first, then we check their account status with proper permissions
    
    return {
      uid: user.uid,
      email: user.email,
      twoFactorEnabled: false
    };
  } catch (error: any) {
    throw error;
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
        twoFactorEnabled: false
      });
    } else {
      callback(null);
    }
  });
};


// Set admin claim for a user
export const setAdminClaim = async (targetUserId: string): Promise<void> => {
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const functions = getFunctions();
    const setAdminClaimFunction = httpsCallable(functions, 'setAdminClaim');
    
    const result = await setAdminClaimFunction({ targetUserId });
  } catch (error: any) {
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
  } catch (error: any) {
    throw new Error(error.message || 'Failed to remove admin claim');
  }
};

// Send password reset email via Firebase Function (using Resend)
export const sendPasswordReset = async (email: string, locale?: string): Promise<void> => {
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('./firebase');

    const sendPasswordResetFunction = httpsCallable(functions, 'sendPasswordReset');
    const result = await sendPasswordResetFunction({ email, locale: locale || 'en' });

    if (!result.data || !(result.data as any).success) {
      throw new Error('Failed to send password reset email');
    }
  } catch (error: any) {
    throw error;
  }
};

// Validate password reset token via Firebase Function
export const validatePasswordResetToken = async (email: string, token: string): Promise<boolean> => {
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('./firebase');
    
    const validateTokenFunction = httpsCallable(functions, 'validatePasswordResetToken');
    const result = await validateTokenFunction({ email, token });
    
    return !!(result.data as any)?.success;
  } catch (error: any) {
    return false;
  }
};

// Reset password with new password (after token validation)
export const resetPassword = async (email: string, token: string, newPassword: string): Promise<void> => {
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('./firebase');

    const resetPasswordFunction = httpsCallable(functions, 'resetPasswordWithToken');
    const result = await resetPasswordFunction({ email, token, newPassword });

    if (!result.data || !(result.data as any).success) {
      throw new Error('Failed to reset password');
    }
  } catch (error: any) {
    throw error;
  }
};