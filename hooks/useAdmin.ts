'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkAdminClaim } from '../lib/admin-claims';

export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      // Wait for auth to complete first
      if (authLoading) {
        console.log('Auth still loading, waiting...');
        return;
      }

      if (user?.uid) {
        console.log('Checking admin status for user:', user.uid);
        try {
          const adminStatus = await checkAdminClaim();
          console.log('Admin status result:', adminStatus);
          setIsAdminUser(adminStatus);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdminUser(false);
        }
      } else {
        console.log('No user found, setting admin to false');
        setIsAdminUser(false);
      }
      setLoading(false);
    };

    checkAdminStatus();
  }, [user, authLoading]);

  return { isAdmin: isAdminUser, loading };
};