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
  refreshMemberData: () => Promise<void>;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType>({
  user: null,
  member: null,
  loading: true,
  isAdmin: false,
  hasMemberAccess: false,
  authError: null,
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
      console.log('[AUTH DEBUG] Loading member data for user:', firebaseUser.uid);
      setAuthError(null); // Clear any previous errors
      
      // Try to get existing unified member
      let memberData = await getUnifiedMember(firebaseUser.uid);
      console.log('[AUTH DEBUG] Member data loaded:', memberData?.status || 'No member found');
      
      // If no unified member exists, throw account not found error
      if (!memberData) {
        console.log('[AUTH DEBUG] No member data found - throwing AccountNotFoundError');
        const error = new AccountNotFoundError('No account found for this email. Please contact help@fasemga.com if you think this is an error.');
        setAuthError(error);
        throw error;
      }
      
      // Check account status and throw appropriate errors for specific statuses
      switch (memberData.status) {
        case 'pending':
          console.log('[AUTH DEBUG] Account pending - throwing AccountPendingError');
          const pendingError = new AccountPendingError('Your application is under review. You will be contacted shortly once the review is complete.');
          setAuthError(pendingError);
          throw pendingError;
          
        case 'invoice_sent':
          console.log('[AUTH DEBUG] Invoice sent - throwing AccountInvoicePendingError');
          const invoiceError = new AccountInvoicePendingError('Your account status is pending. Please check your email for a billing invoice. For questions, contact help@fasemga.com');
          setAuthError(invoiceError);
          throw invoiceError;
          
        case 'rejected':
          console.log('[AUTH DEBUG] Account rejected - throwing AccountNotApprovedError');
          const rejectedError = new AccountNotApprovedError('Your application has been declined. For more information, please contact help@fasemga.com', 'rejected');
          setAuthError(rejectedError);
          throw rejectedError;
          
        case 'approved':
        case 'admin':
          console.log('[AUTH DEBUG] Account approved/admin - proceeding with normal flow');
          break;
          
        default:
          console.log('[AUTH DEBUG] Unknown status:', memberData.status, '- throwing generic error');
          const unknownError = new AccountNotApprovedError('Your account status is under review. You will be notified when it has been processed.', memberData.status);
          setAuthError(unknownError);
          throw unknownError;
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
          // Reload the user to get the new claims
          await firebaseUser.reload();
        } catch (error) {
          console.log('[AUTH DEBUG] Failed to set admin claim:', error);
        }
      }
      
      setIsAdmin(adminClaim || memberData.status === 'admin');
      setHasMemberAccess(memberClaim || ['approved', 'admin'].includes(memberData.status));
      
    } catch (error: any) {
      console.log('[AUTH DEBUG] Error in loadMemberData:', error?.name, error?.message);
      
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
        setAuthError(null);
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
    refreshMemberData,
  };

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};