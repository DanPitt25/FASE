'use client';

import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { checkAdminClaim } from '../lib/admin-claims';

export const useAdmin = () => {
  const { user, loading: authLoading } = useUnifiedAuth();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading) {
        return;
      }

      if (user?.uid) {
        try {
          const adminStatus = await checkAdminClaim();
          setIsAdminUser(adminStatus);
        } catch (error) {
          setIsAdminUser(false);
        }
      } else {
        setIsAdminUser(false);
      }
      setLoading(false);
    };

    checkAdminStatus();
  }, [user, authLoading]);

  return { isAdmin: isAdminUser, loading };
};