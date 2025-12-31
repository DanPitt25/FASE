'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UnifiedMember, getUnifiedMember, createUnifiedMember } from '../lib/unified-member';
import { checkAdminClaim, checkMemberClaim } from '../lib/admin-claims';
import { setAdminClaim, AccountPendingError, AccountInvoicePendingError, AccountNotFoundError, AccountNotApprovedError } from '../lib/auth';

interface UnifiedAuthContextType {
  user: User | null; // Firebase Auth user
  member: UnifiedMember | null; // Unified member data
  loading: boolean;
  isAdmin: boolean;
  hasMemberAccess: boolean;
  authError: Error | null; // Account status errors
  clearAuthError: () => void; // Clear auth error
  refreshMemberData: () => Promise<void>;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType>({
  user: null,
  member: null,
  loading: true,
  isAdmin: false,
  hasMemberAccess: false,
  authError: null,
  clearAuthError: () => {},
  refreshMemberData: async () => {},
});

export const useUnifiedAuth = () => {
  const context = useContext(UnifiedAuthContext);
  if (!context) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
};

interface UnifiedAuthProviderProps {
  children: ReactNode;
}

export const UnifiedAuthProvider = ({ children }: UnifiedAuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<UnifiedMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasMemberAccess, setHasMemberAccess] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);

  const loadMemberData = async (firebaseUser: User) => {
    try {
      setAuthError(null); // Clear any previous errors
      
      // Try to get existing unified member
      let memberData = await getUnifiedMember(firebaseUser.uid);
      
      // If no unified member exists, throw account not found error
      if (!memberData) {
        const error = new AccountNotFoundError('No account found for this email. Please contact help@fasemga.com if you think this is an error.');
        setAuthError(error);
        throw error;
      }
      
      // Check account status and sign out users with non-approved statuses
      switch (memberData.status) {
        case 'pending':
          const pendingError = new AccountPendingError('Your application is under review. You will be contacted shortly once the review is complete.');
          setAuthError(pendingError);
          await auth.signOut();
          return;
          
        case 'pending_invoice':
        case 'pending_payment':
        case 'invoice_sent':
          const invoiceError = new AccountInvoicePendingError('Your account status is pending. Please check your email for a billing invoice. For questions, contact help@fasemga.com');
          setAuthError(invoiceError);
          await auth.signOut();
          return;
          
        case 'approved':
        case 'admin':
          break;
          
        default:
          const unknownError = new AccountNotApprovedError('Your account status is under review. You will be notified when it has been processed.', memberData.status);
          setAuthError(unknownError);
          await auth.signOut();
          return;
      }
      
      setMember(memberData);
      
      // Check claims for access levels
      const [adminClaim, memberClaim] = await Promise.all([
        checkAdminClaim(),
        checkMemberClaim()
      ]);
      
      // Bootstrap: If user has admin status in database but no custom claim, set the claim
      if (memberData.status === 'admin' && !adminClaim) {
        try {
          await setAdminClaim(firebaseUser.uid);
          // Note: No reload needed since we use memberData.status as fallback
        } catch (error) {
          // Silently handle admin claim setting errors
        }
      }
      
      setIsAdmin(adminClaim || memberData.status === 'admin');
      setHasMemberAccess(memberClaim || ['approved', 'admin'].includes(memberData.status));
      
    } catch (error: any) {
      // If it's one of our custom account status errors, keep the user signed in but show the error
      if (error instanceof AccountPendingError || 
          error instanceof AccountInvoicePendingError || 
          error instanceof AccountNotApprovedError ||
          error instanceof AccountNotFoundError) {
        // Don't sign out - keep user signed in but show error message
        setMember(null);
        setIsAdmin(false);
        setHasMemberAccess(false);
        setAuthError(error);
        return;
      }
      
      // For other errors, clear everything and let the error bubble up
      setMember(null);
      setIsAdmin(false);
      setHasMemberAccess(false);
      setAuthError(new Error('Unable to verify account status. Please try again later or contact help@fasemga.com'));
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const refreshMemberData = async () => {
    if (user) {
      await loadMemberData(user);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await loadMemberData(firebaseUser);
      } else {
        setMember(null);
        setIsAdmin(false);
        setHasMemberAccess(false);
        // Don't clear authError here - let it persist to show the account status message
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    member,
    loading,
    isAdmin,
    hasMemberAccess,
    authError,
    clearAuthError,
    refreshMemberData,
  };

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};