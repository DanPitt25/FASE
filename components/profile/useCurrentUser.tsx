import { useMemo } from 'react';
import type { User } from 'firebase/auth';

interface Member {
  id: string;
  email: string;
  personalName: string;
  jobTitle?: string;
  isAccountAdministrator: boolean;
  joinedAt: any;
  addedBy?: string;
  createdAt: any;
  updatedAt: any;
  accountConfirmed?: boolean;
}

export function useCurrentUser(user: User | null, members: Member[]) {
  return useMemo(() => {
    if (!user?.uid) return null;
    return members.find(m => m.id === user.uid);
  }, [user?.uid, members]);
}

export function useIsCurrentUserAdmin(user: User | null, members: Member[]) {
  const currentUser = useCurrentUser(user, members);
  return currentUser?.isAccountAdministrator || false;
}