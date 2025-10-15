'use client';

import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';

export const useUnifiedAdmin = () => {
  const { member, isAdmin, loading } = useUnifiedAuth();
  
  return {
    isAdmin,
    loading,
    member
  };
};