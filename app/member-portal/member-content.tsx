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
    <div className="text-center">
      <h2 className="text-3xl font-futura font-bold text-fase-navy mb-6">
        Welcome{userProfile?.personalName ? `, ${userProfile.personalName}` : ""} to Your Member Portal
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
            <strong>Member ID:</strong> {user.uid.substring(0, 8)}…
          </p>
          <p className="text-fase-steel">
            <strong>Email Status:</strong> 
            <span className="ml-2 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              ✓ Verified
            </span>
          </p>
        </div>
      </div>

      <div className="border-t border-fase-silver pt-8 mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-futura font-semibold text-fase-navy">Subscriber Profile</h4>
          <Button 
            variant={isEditing ? "secondary" : "primary"} 
            size="small"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancel" : subscriber ? "Edit" : "Create Profile"}
          </Button>
        </div>

        {!isEditing ? (
          // Display Mode
          <div className="space-y-4 text-left">
            {subscriber ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-fase-steel font-medium">Organization Type</p>
                    <p className="text-fase-navy capitalize">{subscriber.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-fase-steel font-medium">Access Level</p>
                    <p className="text-fase-navy capitalize">{subscriber.access}</p>
                  </div>
                </div>
                
                {subscriber.logo && (
                  <div>
                    <p className="text-sm text-fase-steel font-medium mb-2">Organization Logo</p>
                    <div className="w-32 h-20 border border-fase-silver rounded flex items-center justify-center bg-fase-pearl">
                      <img 
                        src={subscriber.logo} 
                        alt="Organization Logo" 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling.style.display = 'block';
                        }}
                      />
                      <span className="text-xs text-fase-steel hidden">Logo unavailable</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 text-xs text-fase-steel">
                  <p>Last updated: {subscriber.updatedAt ? new Date(subscriber.updatedAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</p>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-fase-steel mb-4">
                  No subscriber profile found. Create your profile to access member features.
                </p>
              </div>
            )}
          </div>
        ) : (
          // Edit Mode
          <div className="space-y-6 text-left">
            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Organization Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as Subscriber['type']})}
                className="w-full px-3 py-2 border border-fase-silver rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy"
              >
                <option value="individual">Individual</option>
                <option value="MGA">MGA</option>
                <option value="provider">Provider</option>
                <option value="carrier">Carrier</option>
                <option value="internal">Internal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Access Level *
              </label>
              <select
                value={formData.access}
                onChange={(e) => setFormData({...formData, access: e.target.value as Subscriber['access']})}
                className="w-full px-3 py-2 border border-fase-silver rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy"
              >
                <option value="none">None</option>
                <option value="subscriber">Subscriber</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">
                Logo URL
              </label>
              <input
                type="url"
                value={formData.logo}
                onChange={(e) => setFormData({...formData, logo: e.target.value})}
                placeholder="gs://fase-site.firebasestorage.app/graphics/logos/your-logo.png"
                className="w-full px-3 py-2 border border-fase-silver rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy"
              />
              <p className="text-xs text-fase-steel mt-1">
                Upload logos to Firebase Storage under /graphics/logos/ and paste the URL here
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="primary" size="medium" onClick={handleSaveSubscriber}>
                {subscriber ? "Update Profile" : "Create Profile"}
              </Button>
              <Button variant="secondary" size="medium" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}