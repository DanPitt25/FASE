'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UnifiedMember, getUnifiedMember, createUnifiedMember } from '../lib/unified-member';
import { checkAdminClaim, checkMemberClaim } from '../lib/admin-claims';
import { setAdminClaim } from '../lib/auth';

interface UnifiedAuthContextType {
  user: User | null; // Firebase Auth user
  member: UnifiedMember | null; // Unified member data
  loading: boolean;
  isAdmin: boolean;
  hasMemberAccess: boolean;
  refreshMemberData: () => Promise<void>;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType>({
  user: null,
  member: null,
  loading: true,
  isAdmin: false,
  hasMemberAccess: false,
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

  const loadMemberData = async (firebaseUser: User) => {
    try {
      // Try to get existing unified member
      let memberData = await getUnifiedMember(firebaseUser.uid);
      
      // If no unified member exists, create one with basic data
      // BUT don't overwrite existing accounts that might have been created during registration
      if (!memberData) {
        // Don't create a basic profile - let the registration process handle account creation
        return;
      }
      
      // SECURITY: Allow approved members and admins to access member portal
      if (!['approved', 'admin'].includes(memberData.status)) {
        // Force logout for non-approved accounts
        await auth.signOut();
        setMember(null);
        setIsAdmin(false);
        setHasMemberAccess(false);
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
          // Reload the user to get the new claims
          await firebaseUser.reload();
        } catch (error) {
        }
      }
      
      setIsAdmin(adminClaim || memberData.status === 'admin');
      setHasMemberAccess(memberClaim || ['approved', 'admin'].includes(memberData.status));
      
    } catch (error) {
      setMember(null);
      setIsAdmin(false);
      setHasMemberAccess(false);
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
    refreshMemberData,
  };

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
};