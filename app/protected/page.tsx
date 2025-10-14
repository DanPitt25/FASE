'use client';

import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen bg-black">
        <div className="w-screen h-screen flex justify-center items-center text-white">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="flex h-screen bg-black">
      <div className="w-screen h-screen flex flex-col space-y-5 justify-center items-center text-white">
        You are logged in as {user.email}
        <SignOut />
      </div>
    </div>
  );
}

function SignOut() {
  const router = useRouter();
  
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <button 
      onClick={handleSignOut}
      className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
    >
      Sign out
    </button>
  );
}
