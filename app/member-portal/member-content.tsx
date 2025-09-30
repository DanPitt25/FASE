'use client';

import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "../../components/Button";
import EmailVerification from "../../components/EmailVerification";
import Modal from "../../components/Modal";
import { getUserProfile, UserProfile, getSubscriber, createSubscriber, updateSubscriber, Subscriber } from "../../lib/firestore";

export default function MemberContent() {
  const { user, loading } = useAuth();
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    type: 'individual' as Subscriber['type'],
    logo: ''
  });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
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
        const [profile, subscriberData] = await Promise.all([
          getUserProfile(user.uid),
          getSubscriber(user.uid)
        ]);
        setUserProfile(profile);
        setSubscriber(subscriberData);
        
        // Set form data if subscriber exists
        if (subscriberData) {
          setFormData({
            type: subscriberData.type,
            logo: subscriberData.logo || ''
          });
        }
      }
    };
    
    fetchUserData();
  }, [user]);

  // Search for existing subscriptions (placeholder - will query actual subscribers collection)
  const searchSubscriptions = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // TODO: Replace with actual Firestore query when subscribers collection exists
    // For now, return mock data
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    
    const mockResults = [
      { id: '1', name: 'Acme Insurance Group', type: 'MGA', location: 'London, UK' },
      { id: '2', name: 'European Risk Partners', type: 'Provider', location: 'Amsterdam, NL' },
      { id: '3', name: 'Continental Underwriters', type: 'Carrier', location: 'Frankfurt, DE' }
    ].filter(org => 
      org.name.toLowerCase().includes(query.toLowerCase()) ||
      org.location.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(mockResults);
    setIsSearching(false);
  };

  // Handle search input with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSubscriptions(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLinkToOrganization = (orgId: string) => {
    // TODO: Implement organization verification and linking
    alert(`Linking to organization ${orgId} - verification system coming soon`);
    setShowLinkModal(false);
  };

  const handleSaveSubscriber = async () => {
    if (!user?.uid) return;
    
    try {
      if (subscriber) {
        // Update existing subscriber (preserve access level)
        await updateSubscriber(user.uid, {
          type: formData.type,
          logo: formData.logo || undefined
        });
        const updatedSubscriber = await getSubscriber(user.uid);
        setSubscriber(updatedSubscriber);
      } else {
        // Create new subscriber (access defaults to 'none')
        const newSubscriber = await createSubscriber(
          user.uid, 
          formData.type, 
          'none',
          formData.logo || undefined
        );
        setSubscriber(newSubscriber);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving subscriber:', error);
      alert('Error saving subscriber data. Please try again.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-noto-serif font-bold text-fase-navy">
          {userProfile?.personalName ? `${userProfile.personalName}'s Portal` : "Member Portal"}
        </h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Account Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-fase-light-gold p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy">Account Information</h2>
            <div className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
              ✓ Verified
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-fase-black font-medium">Name</label>
              <p className="text-fase-navy">{userProfile?.personalName || "Not set"}</p>
            </div>
            
            {userProfile?.organisation && (
              <div>
                <label className="text-sm text-fase-black font-medium">Organisation</label>
                <p className="text-fase-navy">{userProfile.organisation}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm text-fase-black font-medium">Email Address</label>
              <p className="text-fase-navy">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Member Subscription Card */}
        <div className="bg-white rounded-lg shadow-sm border border-fase-light-gold p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-noto-serif font-semibold text-fase-navy">Member Subscription</h2>
          </div>

          {subscriber ? (
            // Has Subscription - Display Mode
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-700">Active Subscription</span>
              </div>
              
              <div>
                <label className="text-sm text-fase-black font-medium">Organization Type</label>
                <p className="text-fase-navy capitalize">{subscriber.type}</p>
              </div>
              
              <div>
                <label className="text-sm text-fase-black font-medium">Access Level</label>
                <p className="text-fase-navy capitalize">{subscriber.access}</p>
              </div>
              
              {subscriber.logo && (
                <div>
                  <label className="text-sm text-fase-black font-medium">Organization Logo</label>
                  <div className="mt-2 w-24 h-16 border border-fase-light-gold rounded-lg flex items-center justify-center bg-fase-cream overflow-hidden">
                    <img 
                      src={subscriber.logo} 
                      alt="Organization Logo" 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = 'block';
                        }
                      }}
                    />
                    <span className="text-xs text-fase-black hidden">No logo</span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-fase-light-gold">
                <Button variant="secondary" size="small" onClick={() => {
                  // TODO: Handle subscription management
                  alert('Subscription management coming soon');
                }}>
                  Manage Subscription
                </Button>
              </div>
            </div>
          ) : (
            // No Subscription - Setup Mode
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="w-16 h-16 bg-fase-navy bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-fase-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 7h10M7 10h10M7 13h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-fase-navy mb-2">Set Up Your Membership</h3>
                <p className="text-fase-black mb-6">
                  Join an existing company membership or register your company as a new FASE member
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="primary" 
                  size="medium" 
                  className="w-full"
                  onClick={() => router.push('/member-portal/apply')}
                >
                  Start New Membership
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-fase-light-gold"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-fase-black">or</span>
                  </div>
                </div>

                <Button 
                  variant="secondary" 
                  size="medium" 
                  className="w-full"
                  onClick={() => setShowLinkModal(true)}
                >
                  My Company is Already a Member
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-fase-light-gold">
                <p className="text-xs text-fase-black">
                  Need help? <a href="mailto:support@fase.org" className="text-fase-navy hover:underline">Contact support</a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Member Resources - Only show if user has active subscription */}
      {subscriber && subscriber.access === 'subscriber' && (
        <div className="bg-white rounded-lg shadow-sm border border-fase-light-gold p-6">
          <h2 className="text-xl font-noto-serif font-semibold text-fase-navy mb-4">Member Resources</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-fase-light-gold rounded-lg hover:border-fase-navy transition-colors">
              <h3 className="font-medium text-fase-navy mb-2">Events & Conferences</h3>
              <p className="text-sm text-fase-black">Access upcoming FASE events and conference materials</p>
            </div>
            <div className="p-4 border border-fase-light-gold rounded-lg hover:border-fase-navy transition-colors">
              <h3 className="font-medium text-fase-navy mb-2">Knowledge Hub</h3>
              <p className="text-sm text-fase-black">Browse industry insights and educational resources</p>
            </div>
            <div className="p-4 border border-fase-light-gold rounded-lg hover:border-fase-navy transition-colors">
              <h3 className="font-medium text-fase-navy mb-2">Member Directory</h3>
              <p className="text-sm text-fase-black">Connect with other FASE members and partners</p>
            </div>
          </div>
        </div>
      )}

      {/* Link to Existing Subscription Modal */}
      <Modal 
        isOpen={showLinkModal} 
        onClose={() => {
          setShowLinkModal(false);
          setSearchQuery('');
          setSearchResults([]);
        }} 
        title="My Company is Already a Member"
        maxWidth="lg"
      >
        <div className="space-y-6">
          <p className="text-fase-black">
            Search for your company&apos;s existing FASE membership to join their subscription.
          </p>

          <div>
            <label className="block text-sm font-medium text-fase-navy mb-2">
              Search Organizations
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter organization name or location..."
              className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            />
          </div>

          {isSearching ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto"></div>
              <p className="text-fase-black mt-2">Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-fase-navy mb-3">Search Results</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((org) => (
                  <div 
                    key={org.id}
                    className="p-3 border border-fase-light-gold rounded-lg hover:border-fase-navy cursor-pointer transition-colors"
                    onClick={() => handleLinkToOrganization(org.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-fase-navy">{org.name}</h4>
                        <p className="text-sm text-fase-black">{org.type} • {org.location}</p>
                      </div>
                      <svg className="w-5 h-5 text-fase-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : searchQuery && !isSearching ? (
            <div className="text-center py-8 text-fase-black">
              <p>No organizations found matching &quot;{searchQuery}&quot;</p>
              <p className="text-sm mt-2">Try a different search term or create a new subscription.</p>
            </div>
          ) : null}

          <div className="pt-4 border-t border-fase-light-gold">
            <p className="text-xs text-fase-black">
              Can&apos;t find your organization? You may need to <button 
                onClick={() => {
                  setShowLinkModal(false);
                  router.push('/member-portal/apply');
                }}
                className="text-fase-navy hover:underline"
              >
                create a new subscription
              </button> or <a href="mailto:support@fase.org" className="text-fase-navy hover:underline">contact support</a>.
            </p>
          </div>
        </div>
      </Modal>


    </div>
  );
}
