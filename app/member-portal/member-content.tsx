'use client';

import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "../../components/Button";
import EmailVerification from "../../components/EmailVerification";
import { getUserProfile, UserProfile, getSubscriber, createSubscriber, updateSubscriber, Subscriber } from "../../lib/firestore";

export default function MemberContent() {
  const { user, loading } = useAuth();
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    type: 'individual' as Subscriber['type'],
    access: 'none' as Subscriber['access'],
    logo: ''
  });
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
            access: subscriberData.access,
            logo: subscriberData.logo || ''
          });
        }
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleSaveSubscriber = async () => {
    if (!user?.uid) return;
    
    try {
      if (subscriber) {
        // Update existing subscriber
        await updateSubscriber(user.uid, formData);
        const updatedSubscriber = await getSubscriber(user.uid);
        setSubscriber(updatedSubscriber);
      } else {
        // Create new subscriber
        const newSubscriber = await createSubscriber(
          user.uid, 
          formData.type, 
          formData.access,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-futura font-bold text-fase-navy mb-2">Member Portal</h1>
        <p className="text-fase-steel">
          Welcome{userProfile?.personalName ? `, ${userProfile.personalName}` : ""}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Account Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-fase-silver p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-futura font-semibold text-fase-navy">Account Information</h2>
            <div className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
              ✓ Verified
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-fase-steel font-medium">Name</label>
              <p className="text-fase-navy">{userProfile?.personalName || "Not set"}</p>
            </div>
            
            {userProfile?.organisation && (
              <div>
                <label className="text-sm text-fase-steel font-medium">Organisation</label>
                <p className="text-fase-navy">{userProfile.organisation}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm text-fase-steel font-medium">Email Address</label>
              <p className="text-fase-navy">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Member Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-fase-silver p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-futura font-semibold text-fase-navy">Member Profile</h2>
            <Button 
              variant={isEditing ? "secondary" : "primary"} 
              size="small"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? "Cancel" : subscriber ? "Edit" : "Setup"}
            </Button>
          </div>

          {!isEditing ? (
            // Display Mode
            <div className="space-y-4">
              {subscriber ? (
                <>
                  <div>
                    <label className="text-sm text-fase-steel font-medium">Organization Type</label>
                    <p className="text-fase-navy capitalize">{subscriber.type}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-fase-steel font-medium">Access Level</label>
                    <p className="text-fase-navy capitalize">{subscriber.access}</p>
                  </div>
                  
                  {subscriber.logo && (
                    <div>
                      <label className="text-sm text-fase-steel font-medium">Organization Logo</label>
                      <div className="mt-2 w-24 h-16 border border-fase-silver rounded-lg flex items-center justify-center bg-fase-pearl overflow-hidden">
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
                        <span className="text-xs text-fase-steel hidden">No logo</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-fase-steel">
                  <p className="mb-4">Complete your member profile to access additional features</p>
                </div>
              )}
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-1">
                  Organization Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as Subscriber['type']})}
                  className="w-full px-3 py-2 border border-fase-silver rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                >
                  <option value="individual">Individual</option>
                  <option value="MGA">MGA</option>
                  <option value="provider">Provider</option>
                  <option value="carrier">Carrier</option>
                  <option value="internal">Internal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-1">
                  Access Level
                </label>
                <select
                  value={formData.access}
                  onChange={(e) => setFormData({...formData, access: e.target.value as Subscriber['access']})}
                  className="w-full px-3 py-2 border border-fase-silver rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                >
                  <option value="none">None</option>
                  <option value="subscriber">Subscriber</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-1">
                  Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.logo}
                  onChange={(e) => setFormData({...formData, logo: e.target.value})}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-fase-silver rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="primary" size="medium" onClick={handleSaveSubscriber}>
                  {subscriber ? "Save Changes" : "Create Profile"}
                </Button>
                <Button variant="secondary" size="medium" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional sections can be added here */}
      <div className="bg-white rounded-lg shadow-sm border border-fase-silver p-6">
        <h2 className="text-xl font-futura font-semibold text-fase-navy mb-4">Member Resources</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-fase-silver rounded-lg hover:border-fase-navy transition-colors">
            <h3 className="font-medium text-fase-navy mb-2">Events & Conferences</h3>
            <p className="text-sm text-fase-steel">Access upcoming FASE events and conference materials</p>
          </div>
          <div className="p-4 border border-fase-silver rounded-lg hover:border-fase-navy transition-colors">
            <h3 className="font-medium text-fase-navy mb-2">Knowledge Hub</h3>
            <p className="text-sm text-fase-steel">Browse industry insights and educational resources</p>
          </div>
          <div className="p-4 border border-fase-silver rounded-lg hover:border-fase-navy transition-colors">
            <h3 className="font-medium text-fase-navy mb-2">Member Directory</h3>
            <p className="text-sm text-fase-steel">Connect with other FASE members and partners</p>
          </div>
        </div>
      </div>
    </div>
  );
}