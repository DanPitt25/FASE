'use client';

import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Button from "../../components/Button";
import EmailVerification from "../../components/EmailVerification";
import Modal from "../../components/Modal";
import OrganizationLogo from "../../components/OrganizationLogo";
import UtilityPage from "../../components/UtilityPage";
import { getUserProfile, UserProfile, getMemberApplicationsByUserId, MemberApplication } from "../../lib/firestore";
import { uploadMemberLogo, validateLogoFile } from "../../lib/storage";

export default function MemberContent() {
  const authContext = useAuth();
  const { user, loading } = authContext || { user: null, loading: true };
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [memberData, setMemberData] = useState<MemberApplication | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showLogoUploadModal, setShowLogoUploadModal] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && user && !user.emailVerified) {
      // Redirect unverified users to verification
      setShowEmailVerification(true);
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        const [profile, applications] = await Promise.all([
          getUserProfile(user.uid),
          getMemberApplicationsByUserId(user.uid)
        ]);
        setUserProfile(profile);
        setMemberData(applications.length > 0 ? applications[0] : null);
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleLinkToOrganization = (orgId: string) => {
    // TODO: Implement organization verification and linking
    alert(`Linking to organization ${orgId} - verification system coming soon`);
    setShowLinkModal(false);
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !user?.uid) {
      setLogoUploadError('Please select a file');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError('');

    try {
      // Validate the file
      validateLogoFile(logoFile);

      // Upload to Firebase Storage - this will save to graphics/logos/[uid]-logo.[ext]
      const uploadResult = await uploadMemberLogo(logoFile, user.uid);

      // Update Firestore member document with new logo URL
      const { updateDoc, doc, collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      
      const membersRef = collection(db, 'members');
      const q = query(membersRef, where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const memberDoc = querySnapshot.docs[0];
        await updateDoc(memberDoc.ref, {
          logoURL: uploadResult.downloadURL,
          updatedAt: new Date()
        });

        // Update local state
        if (memberData) {
          setMemberData({ ...memberData, logoURL: uploadResult.downloadURL });
        }
      }

      // Reset form and close modal
      setLogoFile(null);
      setShowLogoUploadModal(false);
      alert('Logo updated successfully!');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      setLogoUploadError(error.message || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        validateLogoFile(file);
        setLogoFile(file);
        setLogoUploadError('');
      } catch (error: any) {
        setLogoUploadError(error.message);
        setLogoFile(null);
      }
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

  // Create logo element for UtilityPage
  const logoElement = (
    <div className="relative group">
      <div 
        className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setShowSubscriptionModal(true)}
        title="Manage subscription"
      >
        {memberData ? (
          <div className="w-20 h-20 bg-white/10 rounded-lg p-2 relative">
            {memberData.logoURL ? (
              <Image
                src={memberData.logoURL}
                alt={`${memberData.organizationName} logo`}
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full bg-white/20 rounded flex items-center justify-center">
                <span className="text-white font-semibold text-2xl">
                  {(memberData.organizationName || 'O').charAt(0)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center">
            <span className="text-white font-semibold text-2xl">
              {userProfile?.personalName?.charAt(0) || user.email?.charAt(0) || 'M'}
            </span>
          </div>
        )}
      </div>
      
      {/* Logo Edit Button */}
      {memberData && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowLogoUploadModal(true);
          }}
          className="absolute -bottom-1 -right-1 w-6 h-6 bg-fase-navy hover:bg-fase-dark-blue text-white rounded-full flex items-center justify-center shadow-lg transition-colors group-hover:scale-110 transition-transform"
          title="Update logo"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  );

  // Create status badge element for UtilityPage
  const statusBadge = (
    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
      <div className="text-sm text-white/70 mb-1">Status</div>
      <div className="text-lg font-semibold text-white">
        {memberData?.status === 'approved' ? (
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
            <span>Active Member</span>
          </div>
        ) : memberData?.status === 'invoice_sent' ? (
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
            <span>Invoice Sent</span>
          </div>
        ) : memberData ? (
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full"></span>
            <span>Application Pending</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
            <span>Setup Required</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <UtilityPage
        title={userProfile?.personalName ? `Welcome, ${userProfile.personalName}` : "Member Portal"}
        subtitle={memberData?.organizationName || user.email || undefined}
        logoElement={logoElement}
        statusBadge={statusBadge}
        currentPage="member-portal"
      >

        {/* Alerts Section */}
        <div className="space-y-4 mb-8">
          {/* Incomplete Setup Alert */}
          {!memberData && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-orange-400 mt-0.5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-orange-800 mb-2">Membership Setup Incomplete</h3>
                  <p className="text-sm text-orange-700">
                    Complete your membership setup to access all FASE member benefits and resources.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Sent Alert */}
          {memberData?.status === 'invoice_sent' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Invoice Sent</h3>
                  <p className="text-sm text-blue-700">
                    Your invoice has been sent to your billing contact. Once payment is received, your membership will be activated automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Member News/Alerts */}
          {memberData?.status === 'approved' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Member Updates</h3>
                  <p className="text-sm text-blue-700">
                    New regulatory guidelines published. Check the Knowledge Base for the latest compliance updates.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Actions - Horizontal Cards */}
        <div className="space-y-4 mb-8">
          {memberData?.status === 'approved' ? (
            <>
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
                    href="/knowledge-base-webinars"
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
                    variant="primary" 
                    size="medium"
                    className="flex-shrink-0"
                    onClick={() => alert('Events coming soon')}
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-1">Member Directory</h3>
                      <p className="text-fase-black">Connect and network with FASE members across Europe</p>
                    </div>
                  </div>
                  <Button 
                    variant="primary" 
                    size="medium"
                    className="flex-shrink-0"
                    onClick={() => router.push('/directory')}
                  >
                    Browse Members
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Set up membership for non-approved users */
            <div className="bg-white rounded-lg border border-fase-light-gold hover:border-fase-navy transition-colors duration-200 p-6 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-fase-gold to-fase-orange rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-1">Set Up Membership</h3>
                    <p className="text-fase-black">Complete your FASE membership application to access all member benefits</p>
                  </div>
                </div>
                <Button 
                  variant="primary" 
                  size="medium"
                  className="flex-shrink-0"
                  onClick={() => router.push('/member-portal/apply')}
                >
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </div>
      </UtilityPage>
      
      {/* Link to Existing Subscription Modal */}
      <Modal 
        isOpen={showLinkModal} 
        onClose={() => setShowLinkModal(false)} 
        title="My Company is Already a Member"
        maxWidth="lg"
      >
        <div className="space-y-6">
          <p className="text-fase-black">
            If your company already has a FASE membership, please contact our support team to be added to your organization's account.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">Contact Support</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Email <a href="mailto:info@fasemga.com" className="underline">info@fasemga.com</a> with your company name and we'll help you get connected to your organization's membership.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-fase-light-gold">
            <p className="text-xs text-fase-black">
              Don't have a company membership yet? <button 
                onClick={() => {
                  setShowLinkModal(false);
                  router.push('/member-portal/apply');
                }}
                className="text-fase-navy hover:underline"
              >
                Start a new membership application
              </button>.
            </p>
          </div>
        </div>
      </Modal>

      {/* Subscription Management Modal */}
      <Modal 
        isOpen={showSubscriptionModal} 
        onClose={() => setShowSubscriptionModal(false)} 
        title={memberData?.status === 'approved' ? "Manage Subscription" : "Account Settings"}
        maxWidth="lg"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              memberData?.status === 'approved' 
                ? 'bg-fase-light-blue' 
                : 'bg-gray-400'
            }`}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">
              {memberData?.organizationName || userProfile?.personalName || 'Your Account'}
            </h3>
            <div className="flex items-center justify-center space-x-2 mb-4">
              {memberData?.status === 'approved' ? (
                <>
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                  <span className="text-sm text-fase-black">Active Membership</span>
                </>
              ) : memberData?.status === 'invoice_sent' ? (
                <>
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                  <span className="text-sm text-fase-black">Invoice Sent</span>
                </>
              ) : memberData ? (
                <>
                  <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <span className="text-sm text-fase-black">Application Pending</span>
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span className="text-sm text-fase-black">No Membership</span>
                </>
              )}
            </div>
          </div>

          {memberData?.status === 'approved' ? (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-fase-navy mb-3">Membership Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-fase-black">Plan:</span>
                    <span className="font-medium">FASE Annual Membership</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fase-black">Status:</span>
                    <span className="text-green-600 font-medium">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fase-black">Billing:</span>
                    <span className="font-medium">Annual</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fase-black">Next renewal:</span>
                    <span className="font-medium">
                      {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  className="w-full flex items-center justify-center px-4 py-2 border border-fase-navy text-fase-navy bg-white hover:bg-fase-navy hover:text-white transition-colors rounded-md"
                  onClick={() => alert('Invoice download coming soon')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Invoices
                </button>

                <button 
                  className="w-full flex items-center justify-center px-4 py-2 border border-fase-navy text-fase-navy bg-white hover:bg-fase-navy hover:text-white transition-colors rounded-md"
                  onClick={() => alert('Payment method update coming soon')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Update Payment Method
                </button>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Need Help?</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        For subscription changes or billing inquiries, contact our support team at{' '}
                        <a href="mailto:billing@fasemga.com" className="underline">billing@fasemga.com</a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-fase-navy mb-3">Account Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-fase-black">Email:</span>
                    <span className="font-medium">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fase-black">Account Status:</span>
                    <span className="font-medium">
                      {memberData ? 'Application Pending' : 'Setup Required'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">
                      {memberData ? 'Application Under Review' : 'Get Started'}
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {memberData 
                        ? 'Your membership application is being reviewed. You'll receive an email once approved.'
                        : 'Complete your membership application to access all FASE member benefits and resources.'
                      }
                    </p>
                    {!memberData && (
                      <button 
                        className="mt-3 inline-flex items-center text-sm font-medium text-blue-800 hover:text-blue-900"
                        onClick={() => {
                          setShowSubscriptionModal(false);
                          router.push('/member-portal/apply');
                        }}
                      >
                        Start Application
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Logo Upload Modal */}
      <Modal 
        isOpen={showLogoUploadModal} 
        onClose={() => {
          setShowLogoUploadModal(false);
          setLogoFile(null);
          setLogoUploadError('');
        }} 
        title="Update Organization Logo"
        maxWidth="md"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
              {logoFile ? (
                <img 
                  src={URL.createObjectURL(logoFile)} 
                  alt="Logo preview" 
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : memberData?.logoURL ? (
                <Image
                  src={memberData.logoURL}
                  alt="Current logo"
                  fill
                  className="object-contain rounded-lg"
                />
              ) : (
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload a new logo for {memberData?.organizationName}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Logo File
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-fase-light-blue file:text-white hover:file:bg-fase-navy transition-colors"
            />
            <p className="text-xs text-gray-500 mt-2">
              Supported formats: PNG, JPG, SVG, WebP (max 5MB)
            </p>
          </div>

          {logoUploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{logoUploadError}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              onClick={() => {
                setShowLogoUploadModal(false);
                setLogoFile(null);
                setLogoUploadError('');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors rounded-md"
              disabled={isUploadingLogo}
            >
              Cancel
            </button>
            <button
              onClick={handleLogoUpload}
              disabled={!logoFile || isUploadingLogo}
              className="flex-1 px-4 py-2 bg-fase-navy text-white hover:bg-fase-dark-blue transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isUploadingLogo ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                'Update Logo'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
