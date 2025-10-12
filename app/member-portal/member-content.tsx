'use client';

import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "../../components/Button";
import UtilityPage from "../../components/UtilityPage";
// Removed Firestore imports - using Firebase Auth only
import { sendVerificationEmail, checkEmailVerification } from "../../lib/auth";

export default function MemberContent() {
  const { user, loading } = useAuth();
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Removed Firestore user profile fetching - using Firebase Auth data only

  const handleSendVerificationEmail = async () => {
    try {
      await sendVerificationEmail();
      setEmailVerificationSent(true);
    } catch (error: any) {
      console.error('Error sending verification email:', error);
    }
  };

  const handleCheckVerification = async () => {
    setIsCheckingVerification(true);
    try {
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error checking verification:', error);
    } finally {
      setIsCheckingVerification(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
        <div className="animate-pulse">
          <div className="h-8 bg-fase-cream rounded w-1/3 mx-auto mb-4"></div>
          <div className="h-4 bg-fase-cream rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // Create logo element for UtilityPage
  const logoElement = (
    <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center">
      <span className="text-white font-semibold text-2xl">
        {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'M'}
      </span>
    </div>
  );

  // Create status badge element for UtilityPage
  const statusBadge = (
    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
      <div className="text-sm text-white/70 mb-1">Status</div>
      <div className="text-lg font-semibold text-white">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
          <span>Signed In</span>
        </div>
      </div>
    </div>
  );

  return (
    <UtilityPage
      title={user?.displayName ? `Welcome, ${user.displayName}` : "Member Portal"}
      subtitle={user?.email || undefined}
      logoElement={logoElement}
      statusBadge={statusBadge}
      currentPage="member-portal"
    >
      {/* Email Verification Alert */}
      {user && !user.emailVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-amber-400 mt-0.5 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-800 mb-2">Email Verification Required</h3>
              <p className="text-sm text-amber-700 mb-4">
                Please verify your email address to access all member features and ensure you receive important updates.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                {!emailVerificationSent ? (
                  <button
                    onClick={handleSendVerificationEmail}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors"
                  >
                    Send Verification Email
                  </button>
                ) : (
                  <>
                    <div className="flex items-center text-sm text-amber-700">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Verification email sent!
                    </div>
                    <button
                      onClick={handleCheckVerification}
                      disabled={isCheckingVerification}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-amber-800 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 transition-colors"
                    >
                      {isCheckingVerification ? 'Checking...' : 'I\'ve Verified My Email'}
                    </button>
                    <button
                      onClick={handleSendVerificationEmail}
                      className="inline-flex items-center px-4 py-2 border border-amber-300 text-sm font-medium rounded-md text-amber-700 bg-white hover:bg-amber-50 transition-colors"
                    >
                      Resend Email
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-green-400 mt-0.5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-green-800 mb-2">Welcome to FASE!</h3>
            <p className="text-sm text-green-700">
              Access all the member benefits and resources available to you.
            </p>
          </div>
        </div>
      </div>

      {/* Member Resources */}
      <div className="space-y-4">
        {/* Knowledge Base */}
        <div className="bg-white rounded-lg border border-fase-light-gold hover:border-fase-navy transition-colors duration-200 p-6 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-fase-light-blue to-fase-navy rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-1">Knowledge Base</h3>
                <p className="text-fase-black">Access industry insights, regulatory updates, and educational resources</p>
              </div>
            </div>
            <Button 
              href="/knowledge"
              variant="primary" 
              size="medium"
              className="flex-shrink-0"
            >
              Browse Resources
            </Button>
          </div>
        </div>

        {/* Events */}
        <div className="bg-white rounded-lg border border-fase-light-gold hover:border-fase-navy transition-colors duration-200 p-6 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-fase-gold rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-1">Events & Conferences</h3>
                <p className="text-fase-black">Join upcoming FASE events, conferences, and networking opportunities</p>
              </div>
            </div>
            <Button 
              href="/events"
              variant="primary" 
              size="medium"
              className="flex-shrink-0"
            >
              View Events
            </Button>
          </div>
        </div>

        {/* Directory */}
        <div className="bg-white rounded-lg border border-fase-light-gold hover:border-fase-navy transition-colors duration-200 p-6 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-fase-navy rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-1">Member Directory</h3>
                <p className="text-fase-black">Connect and network with FASE members across Europe</p>
              </div>
            </div>
            <Button 
              href="/about/membership-directory"
              variant="primary" 
              size="medium"
              className="flex-shrink-0"
            >
              Browse Members
            </Button>
          </div>
        </div>
      </div>
    </UtilityPage>
  );
}