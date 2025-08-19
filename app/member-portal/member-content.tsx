'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import EmailVerification from '../../components/EmailVerification';
import { getUserProfile, UserProfile } from '../../lib/firestore';

export default function MemberContent() {
  const { user, loading } = useAuth();
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && !user.emailVerified) {
      // Redirect unverified users to verification
      setShowEmailVerification(true);
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.uid) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
        <div className="animate-pulse">
          <div className="h-8 bg-fase-pearl rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-fase-pearl rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // Show email verification if needed
  if (showEmailVerification || (user && !user.emailVerified)) {
    return (
      <EmailVerification 
        onVerified={() => {
          setShowEmailVerification(false);
          // Refresh the page to update user state
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="text-center">
      <h2 className="text-3xl font-futura font-bold text-fase-navy mb-6">
        Welcome{userProfile?.personalName ? `, ${userProfile.personalName}` : ''} to Your Member Portal
      </h2>
      
      <div className="mb-8">
        <h3 className="text-xl font-futura font-semibold text-fase-navy mb-4">Your Account</h3>
        <div className="space-y-2 text-left max-w-md mx-auto">
          <p className="text-fase-steel">
            <strong>Personal Name:</strong> {userProfile?.personalName || "Not set"}
          </p>
          <p className="text-fase-steel">
            <strong>Organisation:</strong> {userProfile?.organisation || "Not specified"}
          </p>
          <p className="text-fase-steel">
            <strong>Email:</strong> {user.email}
          </p>
          <p className="text-fase-steel">
            <strong>Member ID:</strong> {user.uid.substring(0, 8)}...
          </p>
          <p className="text-fase-steel">
            <strong>Email Status:</strong> 
            <span className="ml-2 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              ✓ Verified
            </span>
          </p>
        </div>
      </div>

      <div className="border-t border-fase-silver pt-8 mx-auto max-w-md">
        <h4 className="text-lg font-futura font-semibold text-fase-navy mb-4">Member Resources</h4>
        <p className="text-fase-steel">
          Your member dashboard is being developed. Additional features and resources will be available soon as FASE continues to grow and expand our digital platform.
        </p>
      </div>
    </div>
  );
}