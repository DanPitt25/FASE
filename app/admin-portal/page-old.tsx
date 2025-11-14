'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';
// Note: MemberApplication type no longer used after UnifiedMember migration
import { getUserAlerts, getUserMessages, markAlertAsRead, dismissAlert, markMessageAsRead, deleteMessageForUser, createAlert, sendMessage } from '../../lib/unified-messaging';
import { searchMembersByOrganizationName, getUserIdsForMemberCriteria, UnifiedMember, getMembersByStatus, updateMemberStatus, getAllPendingJoinRequests, approveJoinRequest, rejectJoinRequest, getOrganizationForMember, OrganizationAccount } from '../../lib/unified-member';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { JoinRequest } from '../../lib/unified-member';
import type { Alert, UserAlert, Message, UserMessage } from '../../lib/unified-messaging';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

// Simple function to get all account documents (not individual members)
const getAllAccounts = async () => {
  try {
    const accountsRef = collection(db, 'accounts');
    const snapshot = await getDocs(accountsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all accounts:', error);
    return [];
  }
};

// Email form component
function EmailsTab({ prefilledData = null }: { prefilledData?: any }) {
  const [formData, setFormData] = useState({
    email: prefilledData?.accountAdministrator?.email || prefilledData?.email || '',
    cc: '',
    fullName: prefilledData?.accountAdministrator?.name || prefilledData?.personalName || '',
    greeting: '',
    gender: 'm',
    organizationName: prefilledData?.organizationName || '',
    membershipType: prefilledData?.membershipType || 'corporate',
    organizationType: prefilledData?.organizationType || 'MGA',
    hasOtherAssociations: prefilledData?.hasOtherAssociations || false,
    userLocale: 'en',
    address: {
      line1: prefilledData?.businessAddress?.line1 || prefilledData?.registeredAddress?.line1 || '',
      line2: prefilledData?.businessAddress?.line2 || prefilledData?.registeredAddress?.line2 || '',
      city: prefilledData?.businessAddress?.city || prefilledData?.registeredAddress?.city || '',
      county: prefilledData?.businessAddress?.county || prefilledData?.registeredAddress?.county || '',
      postcode: prefilledData?.businessAddress?.postcode || prefilledData?.registeredAddress?.postcode || '',
      country: prefilledData?.businessAddress?.country || prefilledData?.registeredAddress?.country || ''
    }
  });

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Calculate pricing automatically
  const calculateOriginalAmount = () => {
    if (formData.membershipType === 'individual') {
      return 500;
    } else if (formData.organizationType === 'MGA') {
      // Use prefilledData GWP if available, otherwise default to lowest tier
      const gwp = prefilledData?.portfolio?.grossWrittenPremiums;
      switch (gwp) {
        case '<10m': return 900;
        case '10-20m': return 1500;
        case '20-50m': return 2200;
        case '50-100m': return 2800;
        case '100-500m': return 4200;
        case '500m+': return 7000;
        default: return 900;
      }
    } else if (formData.organizationType === 'carrier') {
      return 4000;
    } else if (formData.organizationType === 'provider') {
      return 5000;
    }
    return 900;
  };

  const originalAmount = calculateOriginalAmount();
  const finalAmount = formData.hasOtherAssociations ? Math.round(originalAmount * 0.8) : originalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-membership-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalAmount: finalAmount,
          exactTotalAmount: finalAmount, // Use exact calculated amount for PayPal
          originalAmount: originalAmount.toString(),
          discountAmount: formData.hasOtherAssociations ? (originalAmount - finalAmount).toString() : '0',
          discountReason: formData.hasOtherAssociations ? 'Multi-Association Member Discount (20%)' : '',
          userId: `FASE-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}` // Generate safe random ID for PayPal tracking
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-6">Send Membership Email</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Language Selection */}
          <div className="border-b pb-6">
            <h4 className="text-md font-semibold mb-4 text-fase-navy">Language</h4>
            <div className="w-1/3">
              <select
                value={formData.userLocale}
                onChange={(e) => setFormData({...formData, userLocale: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent w-full"
              >
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="es">Spanish</option>
                <option value="it">Italian</option>
                <option value="nl">Nederlands</option>
              </select>
            </div>
          </div>

          {/* Email Recipients */}
          <div className="border-b pb-6">
            <h4 className="text-md font-semibold mb-4 text-fase-navy">Email Recipients</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="email"
                placeholder="Primary Email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              />
              <input
                type="email"
                placeholder="CC Email (optional)"
                value={formData.cc}
                onChange={(e) => setFormData({...formData, cc: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="border-b pb-6">
            <h4 className="text-md font-semibold mb-4 text-fase-navy">Contact Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Greeting (Mr. Smith)"
                value={formData.greeting}
                onChange={(e) => setFormData({...formData, greeting: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
              <select
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="m">Masculine/Male</option>
                <option value="f">Feminine/Female</option>
              </select>
              <input
                type="text"
                placeholder="Organization Name"
                value={formData.organizationName}
                onChange={(e) => setFormData({...formData, organizationName: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Address */}
          <div className="border-b pb-6">
            <h4 className="text-md font-semibold mb-4 text-fase-navy">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Address Line 1"
                value={formData.address.line1}
                onChange={(e) => setFormData({...formData, address: {...formData.address, line1: e.target.value}})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Address Line 2"
                value={formData.address.line2}
                onChange={(e) => setFormData({...formData, address: {...formData.address, line2: e.target.value}})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
              <input
                type="text"
                placeholder="City"
                value={formData.address.city}
                onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="County/State"
                value={formData.address.county}
                onChange={(e) => setFormData({...formData, address: {...formData.address, county: e.target.value}})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Postcode"
                value={formData.address.postcode}
                onChange={(e) => setFormData({...formData, address: {...formData.address, postcode: e.target.value}})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              />
              <input
                type="text"
                placeholder="Country"
                value={formData.address.country}
                onChange={(e) => setFormData({...formData, address: {...formData.address, country: e.target.value}})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Membership & Pricing */}
          <div className="border-b pb-6">
            <h4 className="text-md font-semibold mb-4 text-fase-navy">Membership & Pricing</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={formData.membershipType}
                onChange={(e) => setFormData({...formData, membershipType: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
              </select>
              <select
                value={formData.organizationType}
                onChange={(e) => setFormData({...formData, organizationType: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="MGA">MGA</option>
                <option value="carrier">Carrier</option>
                <option value="provider">Service Provider</option>
              </select>
              <div className="bg-gray-50 border border-gray-300 rounded px-3 py-2">
                <label className="text-xs text-gray-600 block">Original Amount</label>
                <span className="text-lg font-semibold text-gray-900">€{originalAmount.toLocaleString()}</span>
              </div>
              <div className={`border border-gray-300 rounded px-3 py-2 ${formData.hasOtherAssociations ? 'bg-green-50' : 'bg-gray-50'}`}>
                <label className="text-xs text-gray-600 block">Final Amount</label>
                <span className="text-lg font-semibold text-gray-900">€{finalAmount.toLocaleString()}</span>
                {formData.hasOtherAssociations && (
                  <div className="text-xs text-green-700 mt-1">20% Multi-Association Discount Applied</div>
                )}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="border-b pb-6">
            <h4 className="text-md font-semibold mb-4 text-fase-navy">Settings</h4>
            <div className="grid grid-cols-1 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.hasOtherAssociations}
                  onChange={(e) => setFormData({...formData, hasOtherAssociations: e.target.checked})}
                  className="rounded border-gray-300 text-fase-navy focus:ring-fase-navy"
                />
                <span className="text-sm text-gray-700">Has Other Associations (20% discount)</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={sending}
              variant="primary"
              size="medium"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </form>

        {/* Result */}
        {result && (
          <div className={`mt-6 p-4 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {result.success ? 'Email sent successfully!' : `Error: ${result.error}`}
          </div>
        )}
      </div>
    </div>
  );
}

// Pricing calculation function (member includes organization data)
const calculateMembershipFee = (member: UnifiedMember): number => {
  let baseFee = 0;
  
  if (member.membershipType === 'individual') {
    baseFee = 500;
  } else if (member.organizationType === 'MGA' && member.portfolio?.grossWrittenPremiums) {
    // MGA pricing based on GWP tiers
    switch (member.portfolio.grossWrittenPremiums) {
      case '<10m': baseFee = 900; break;
      case '10-20m': baseFee = 1500; break;
      case '20-50m': baseFee = 2200; break; // Updated from 2000 to 2200
      case '50-100m': baseFee = 2800; break;
      case '100-500m': baseFee = 4200; break;
      case '500m+': baseFee = 7000; break; // Updated from 6400 to 7000
      default: baseFee = 900;
    }
  } else if (member.organizationType === 'carrier') {
    // Fixed fee for insurance carriers
    baseFee = 4000;
  } else if (member.organizationType === 'provider') {
    // Fixed fee for service providers
    baseFee = 5000;
  } else {
    // Default fallback
    baseFee = 900;
  }
  
  // Apply association member discount if applicable
  if (member.hasOtherAssociations && member.membershipType === 'corporate') {
    baseFee = Math.round(baseFee * 0.8); // 20% discount
  }
  
  return baseFee;
};

export default function AdminPortalPage() {
  const { user, member, loading: authLoading, isAdmin } = useUnifiedAuth();
  const adminLoading = false; // No longer needed with unified auth
  const router = useRouter();
  const [memberApplications, setMemberApplications] = useState<UnifiedMember[]>([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<(JoinRequest & { companyData?: UnifiedMember })[]>([]);
  const [processingRequest, setProcessingRequest] = useState<{
    action: 'approve' | 'reject';
    companyId: string;
    requestId: string;
    requestData: any;
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  
  // Email form pre-fill state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [alerts, setAlerts] = useState<(Alert & UserAlert)[]>([]);
  const [messages, setMessages] = useState<(Message & UserMessage)[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Alert Modal States
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error' | 'success',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    targetAudience: 'members' as 'all' | 'members' | 'admins' | 'specific' | 'member_type' | 'specific_members',
    organizationType: '' as '' | 'MGA' | 'carrier' | 'provider',
    organizationSearch: '',
    selectedOrganizations: [] as string[],
    actionRequired: false,
    actionUrl: '',
    actionText: '',
    expiresAt: ''
  });
  
  // Create Message Modal States
  const [showCreateMessage, setShowCreateMessage] = useState(false);
  const [messageForm, setMessageForm] = useState({
    subject: '',
    content: '',
    recipientType: 'all_members' as 'all_users' | 'all_members' | 'all_admins' | 'user' | 'member_type' | 'specific_members',
    recipientId: '',
    organizationType: '' as '' | 'MGA' | 'carrier' | 'provider',
    organizationSearch: '',
    selectedOrganizations: [] as string[],
    messageType: 'announcement' as 'direct' | 'announcement' | 'system',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  // Organization search state
  const [organizationSearchResults, setOrganizationSearchResults] = useState<UnifiedMember[]>([]);
  const [isSearchingOrganizations, setIsSearchingOrganizations] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allAccounts, joinRequestsData, alertsData, messagesData] = await Promise.all([
        getAllAccounts(), // Get all account documents only
        getAllPendingJoinRequests(), // Get pending join requests
        member?.id ? getUserAlerts(member.id) : [], // Use account ID
        member?.id ? getUserMessages(member.id) : [] // Use account ID
      ]);
      setMemberApplications(allAccounts as UnifiedMember[]); // Show all accounts with their statuses
      setPendingJoinRequests(joinRequestsData);
      setAlerts(alertsData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }, [member?.id]);

  useEffect(() => {
    console.log('Admin portal useEffect:', { authLoading, adminLoading, user: !!user, isAdmin });
    if (!authLoading && !adminLoading) {
      if (!user) {
        console.log('No user, redirecting to login');
        router.push('/login');
        return;
      }
      if (!isAdmin) {
        console.log('User is not admin, redirecting to home');
        router.push('/');
        return;
      }
      console.log('User is admin, loading data');
      loadData();
    }
  }, [user, isAdmin, authLoading, adminLoading, router, loadData]);


  const handleJoinRequestAction = (
    action: 'approve' | 'reject',
    companyId: string,
    requestId: string,
    requestData: any
  ) => {
    setProcessingRequest({ action, companyId, requestId, requestData });
    setAdminNotes('');
  };

  const processJoinRequest = async () => {
    if (!user?.uid || !processingRequest) return;
    
    try {
      if (processingRequest.action === 'approve') {
        await approveJoinRequest(processingRequest.companyId, processingRequest.requestId, user.uid, adminNotes);
      } else {
        await rejectJoinRequest(processingRequest.companyId, processingRequest.requestId, user.uid, adminNotes);
      }
      
      // Remove from pending list
      setPendingJoinRequests(prev => 
        prev.filter(req => !(req.companyId === processingRequest.companyId && req.id === processingRequest.requestId))
      );
      
      // Close modal
      setProcessingRequest(null);
      setAdminNotes('');
      
    } catch (error) {
      console.error(`Error ${processingRequest.action}ing join request:`, error);
      alert(`Error ${processingRequest.action}ing join request. Please try again.`);
    }
  };

  const handleSendEmail = (account: any) => {
    setSelectedAccount(account);
    setShowEmailForm(true);
  };

  const handleConfirmInvoice = async (memberId: string) => {
    try {
      console.log('Updating member status to invoice_sent for:', memberId);
      
      if (!memberId || typeof memberId !== 'string') {
        console.error('Invalid memberId:', memberId);
        alert('Invalid member ID');
        return;
      }
      
      await updateMemberStatus(memberId, 'pending_invoice');
      setMemberApplications(prev => 
        prev.map(member => member.id === memberId ? { ...member, status: 'pending_invoice' } : member)
      );
      
      alert('Status updated to Invoice Sent');
    } catch (error) {
      console.error('Error updating member status:', error);
      alert('Error updating status. Please try again.');
    }
  };

  const handleFlag = async (memberId: string) => {
    try {
      console.log('Flagging member:', memberId);
      
      if (!memberId || typeof memberId !== 'string') {
        console.error('Invalid memberId:', memberId);
        alert('Invalid member ID');
        return;
      }
      
      await updateMemberStatus(memberId, 'pending');
      setMemberApplications(prev => 
        prev.map(member => member.id === memberId ? { ...member, status: 'pending' } : member)
      );
      
      alert('Account flagged');
    } catch (error) {
      console.error('Error flagging account:', error);
      alert('Error flagging account. Please try again.');
    }
  };

  const handleDismissAlert = async (userAlertId: string) => {
    try {
      await dismissAlert(userAlertId);
      setAlerts(prev => prev.filter(alert => alert.id !== userAlertId));
    } catch (error) {
      console.error('Error dismissing alert:', error);
      alert('Error dismissing alert. Please try again.');
    }
  };

  const handleMarkAlertAsRead = async (userAlertId: string) => {
    try {
      await markAlertAsRead(userAlertId);
      setAlerts(prev => prev.map(alert => 
        alert.id === userAlertId ? { ...alert, isRead: true } : alert
      ));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleMarkMessageAsRead = async (userMessageId: string) => {
    try {
      await markMessageAsRead(userMessageId);
      setMessages(prev => prev.map(message => 
        message.id === userMessageId ? { ...message, isRead: true } : message
      ));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleDeleteMessage = async (userMessageId: string) => {
    try {
      await deleteMessageForUser(userMessageId);
      setMessages(prev => prev.filter(message => message.id !== userMessageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Error deleting message. Please try again.');
    }
  };

  // Organization search handler
  const handleOrganizationSearch = async (searchTerm: string, formType: 'alert' | 'message') => {
    if (!searchTerm.trim()) {
      setOrganizationSearchResults([]);
      return;
    }

    setIsSearchingOrganizations(true);
    try {
      const results = await searchMembersByOrganizationName(searchTerm);
      setOrganizationSearchResults(results);
    } catch (error) {
      console.error('Error searching organizations:', error);
      setOrganizationSearchResults([]);
    } finally {
      setIsSearchingOrganizations(false);
    }
  };

  // Add organization to selected list
  const addOrganizationToSelection = (organizationName: string, formType: 'alert' | 'message') => {
    if (formType === 'alert') {
      if (!alertForm.selectedOrganizations.includes(organizationName)) {
        setAlertForm(prev => ({
          ...prev,
          selectedOrganizations: [...prev.selectedOrganizations, organizationName],
          organizationSearch: ''
        }));
      }
    } else {
      if (!messageForm.selectedOrganizations.includes(organizationName)) {
        setMessageForm(prev => ({
          ...prev,
          selectedOrganizations: [...prev.selectedOrganizations, organizationName],
          organizationSearch: ''
        }));
      }
    }
    setOrganizationSearchResults([]);
  };

  // Remove organization from selected list
  const removeOrganizationFromSelection = (organizationName: string, formType: 'alert' | 'message') => {
    if (formType === 'alert') {
      setAlertForm(prev => ({
        ...prev,
        selectedOrganizations: prev.selectedOrganizations.filter(name => name !== organizationName)
      }));
    } else {
      setMessageForm(prev => ({
        ...prev,
        selectedOrganizations: prev.selectedOrganizations.filter(name => name !== organizationName)
      }));
    }
  };

  // Create Alert Handler
  const handleCreateAlert = async () => {
    if (!alertForm.title.trim() || !alertForm.message.trim()) {
      alert('Please fill in title and message fields');
      return;
    }

    try {
      let targetUsers: string[] | undefined;
      let finalTargetAudience = alertForm.targetAudience;

      // Handle member filtering
      if (alertForm.targetAudience === 'member_type' && alertForm.organizationType) {
        targetUsers = await getUserIdsForMemberCriteria({ organizationType: alertForm.organizationType });
        finalTargetAudience = 'specific';
      } else if (alertForm.targetAudience === 'specific_members' && alertForm.selectedOrganizations.length > 0) {
        targetUsers = await getUserIdsForMemberCriteria({ organizationNames: alertForm.selectedOrganizations });
        finalTargetAudience = 'specific';
      }

      const alertData = {
        title: alertForm.title,
        message: alertForm.message,
        type: alertForm.type,
        priority: alertForm.priority,
        targetAudience: finalTargetAudience as 'all' | 'members' | 'admins' | 'specific',
        isActive: true,
        createdBy: user!.uid,
        actionRequired: alertForm.actionRequired,
        ...(targetUsers && { targetUsers }),
        ...(alertForm.actionUrl && { actionUrl: alertForm.actionUrl }),
        ...(alertForm.actionText && { actionText: alertForm.actionText }),
        ...(alertForm.expiresAt && { expiresAt: new Date(alertForm.expiresAt) })
      };

      await createAlert(alertData);
      
      // Reset form and close modal
      setAlertForm({
        title: '',
        message: '',
        type: 'info',
        priority: 'medium',
        targetAudience: 'members',
        organizationType: '',
        organizationSearch: '',
        selectedOrganizations: [],
        actionRequired: false,
        actionUrl: '',
        actionText: '',
        expiresAt: ''
      });
      setShowCreateAlert(false);
      
      // Reload alerts
      if (user) {
        const userAlerts = await getUserAlerts(member?.id || '');
        setAlerts(userAlerts);
      }
      
      alert('Alert created successfully!');
    } catch (error) {
      console.error('Error creating alert:', error);
      alert('Error creating alert. Please try again.');
    }
  };

  // Create Message Handler
  const handleCreateMessage = async () => {
    if (!messageForm.subject.trim() || !messageForm.content.trim()) {
      alert('Please fill in subject and content fields');
      return;
    }

    try {
      let finalRecipientType = messageForm.recipientType;
      let recipientId = messageForm.recipientId;

      // Handle member filtering for messages
      if (messageForm.recipientType === 'member_type' && messageForm.organizationType) {
        // For member type filtering, we'll send to all_members and handle filtering in the backend
        finalRecipientType = 'all_members';
        // Note: We could extend the backend to support organizationType filtering
      } else if (messageForm.recipientType === 'specific_members' && messageForm.selectedOrganizations.length > 0) {
        // For specific members, we'll need to send individual messages
        const targetUserIds = await getUserIdsForMemberCriteria({ organizationNames: messageForm.selectedOrganizations });
        
        // Send individual messages to each target user
        for (const userId of targetUserIds) {
          const messageData = {
            subject: messageForm.subject,
            content: messageForm.content,
            senderId: user!.uid,
            senderName: user!.displayName || user!.email || 'Admin',
            senderEmail: user!.email || '',
            recipientType: 'user' as const,
            recipientId: userId,
            messageType: messageForm.messageType,
            priority: messageForm.priority,
            isRead: false
          };
          await sendMessage(messageData);
        }

        // Reset form and exit early
        setMessageForm({
          subject: '',
          content: '',
          recipientType: 'all_members',
          recipientId: '',
          organizationType: '',
          organizationSearch: '',
          selectedOrganizations: [],
          messageType: 'announcement',
          priority: 'medium'
        });
        setShowCreateMessage(false);
        
        if (user) {
          const userMessages = await getUserMessages(member?.id || '');
          setMessages(userMessages);
        }
        
        alert(`Message sent successfully to ${targetUserIds.length} members!`);
        return;
      }

      const messageData = {
        subject: messageForm.subject,
        content: messageForm.content,
        senderId: user!.uid,
        senderName: user!.displayName || user!.email || 'Admin',
        senderEmail: user!.email || '',
        recipientType: finalRecipientType as 'user' | 'all_members' | 'all_admins' | 'all_users',
        messageType: messageForm.messageType,
        priority: messageForm.priority,
        isRead: false,
        ...(recipientId && { recipientId })
      };

      await sendMessage(messageData);
      
      // Reset form and close modal
      setMessageForm({
        subject: '',
        content: '',
        recipientType: 'all_users',
        recipientId: '',
        organizationType: '',
        organizationSearch: '',
        selectedOrganizations: [],
        messageType: 'announcement',
        priority: 'medium'
      });
      setShowCreateMessage(false);
      
      // Reload messages
      if (user) {
        const userMessages = await getUserMessages(member?.id || '');
        setMessages(userMessages);
      }
      
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    }
  };

  const pendingApplications = memberApplications.filter(member => member.status === 'pending');
  const pendingInvoiceApplications = memberApplications.filter(member => member.status === 'pending_invoice');
  const pendingPaymentApplications = memberApplications.filter(member => member.status === 'pending_payment');
  const invoiceSentApplications = memberApplications.filter(member => member.status === 'pending_invoice');
  const flaggedApplications = memberApplications.filter(member => member.status === 'pending');
  const approvedApplications = memberApplications.filter(member => member.status === 'approved');
  const guestApplications = memberApplications.filter(member => member.status === 'guest');
  
  // Calculate total expected revenue from all pending applications
  const totalExpectedRevenue = [...pendingApplications, ...pendingInvoiceApplications, ...pendingPaymentApplications]
    .reduce((total, app) => total + calculateMembershipFee(app), 0);

  if (authLoading || adminLoading || !user || !isAdmin) {
    return null; // Will redirect or show loading
  }

  // Status badge
  const statusBadge = (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center">
        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-green-800 font-medium">Admin Access Confirmed</span>
      </div>
    </div>
  );

  // Dashboard sections
  const dashboardSections = [
    {
      id: 'overview',
      title: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      content: loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Loading admin data...</p>
        </div>
      ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Pending Applications</h3>
                      <p className="text-2xl font-bold text-yellow-600 mb-2">{pendingApplications.length}</p>
                      <p className="text-fase-black text-xs">New applications</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Pending Invoice</h3>
                      <p className="text-2xl font-bold text-orange-600 mb-2">{pendingInvoiceApplications.length}</p>
                      <p className="text-fase-black text-xs">Awaiting invoice</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Pending Payment</h3>
                      <p className="text-2xl font-bold text-blue-600 mb-2">{pendingPaymentApplications.length}</p>
                      <p className="text-fase-black text-xs">Awaiting payment</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Active Members</h3>
                      <p className="text-2xl font-bold text-green-600 mb-2">{approvedApplications.length}</p>
                      <p className="text-fase-black text-xs">Approved members</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Invoice Sent</h3>
                      <p className="text-2xl font-bold text-purple-600 mb-2">{invoiceSentApplications.length}</p>
                      <p className="text-fase-black text-xs">Invoices sent</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Flagged</h3>
                      <p className="text-2xl font-bold text-red-600 mb-2">{flaggedApplications.length}</p>
                      <p className="text-fase-black text-xs">Flagged accounts</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">Expected Revenue</h3>
                      <p className="text-2xl font-bold text-indigo-600 mb-2">€{totalExpectedRevenue.toLocaleString()}</p>
                      <p className="text-fase-black text-xs">From pending apps</p>
                    </div>
                  </div>
                  
                  {/* Revenue Breakdown */}
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Revenue Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-xl font-bold text-yellow-600">€{pendingApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-yellow-800">Pending ({pendingApplications.length})</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-xl font-bold text-orange-600">€{pendingInvoiceApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-orange-800">Pending Invoice ({pendingInvoiceApplications.length})</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-xl font-bold text-blue-600">€{pendingPaymentApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-blue-800">Pending Payment ({pendingPaymentApplications.length})</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-xl font-bold text-purple-600">€{invoiceSentApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-purple-800">Invoice Sent ({invoiceSentApplications.length})</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-xl font-bold text-red-600">€{flaggedApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-red-800">Flagged ({flaggedApplications.length})</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-xl font-bold text-green-600">€{approvedApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-green-800">Approved ({approvedApplications.length})</p>
                      </div>
                    </div>
                  </div>
        </div>
      )
    },
    {
      id: 'members',
      title: `Members (${memberApplications.length})`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      content: loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Loading member data...</p>
        </div>
      ) : (
                <div className="space-y-6">
                  {/* All Members */}
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                    <div className="p-6 border-b border-fase-light-gold">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">All Member Accounts</h3>
                      <p className="text-fase-black text-sm mt-1">All member accounts showing current status • Total expected revenue: €{totalExpectedRevenue.toLocaleString()}</p>
                    </div>
                    <div className="divide-y divide-fase-light-gold">
                      {memberApplications.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-fase-black">No member accounts found</p>
                        </div>
                      ) : (
                        memberApplications.map(member => (
                          <div key={member.id} className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <span className="font-medium text-fase-navy text-lg">{member.organizationName || 'Unknown Organization'}</span>
                                  <span className={`ml-3 px-2 py-1 text-xs rounded-full font-medium ${
                                    member.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    member.status === 'pending_invoice' ? 'bg-orange-100 text-orange-800' :
                                    member.status === 'pending_payment' ? 'bg-blue-100 text-blue-800' :
                                    member.status === 'guest' ? 'bg-gray-100 text-gray-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {member.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                  </span>
                                  <span className="ml-2 px-2 py-1 bg-fase-cream text-fase-navy text-xs rounded-full">
                                    {member.organizationType || 'N/A'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Contact:</strong> {member.primaryContact?.name || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>Email:</strong> {member.primaryContact?.email || member.email || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>Phone:</strong> {member.primaryContact?.phone || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Country:</strong> {member.registeredAddress?.country || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>City:</strong> {member.registeredAddress?.city || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>Applied:</strong> {member.createdAt?.seconds ? new Date(member.createdAt.seconds * 1000).toLocaleDateString() : member.createdAt?.toDate ? member.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Membership:</strong> {member.membershipType === 'individual' ? 'Individual' : `${member.organizationType || 'Corporate'} Corporate`}</p>
                                    {member.portfolio?.grossWrittenPremiums && (
                                      <p className="text-sm text-fase-black"><strong>GWP:</strong> {member.portfolio.grossWrittenPremiums}</p>
                                    )}
                                    <p className="text-sm font-semibold text-green-600"><strong>Expected Fee: €{calculateMembershipFee(member)}</strong></p>
                                  </div>
                                </div>
                                {member.portfolio?.portfolioMix && (
                                  <div className="mb-3">
                                    <p className="text-sm font-medium text-fase-navy mb-1">Portfolio Mix:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(member.portfolio.portfolioMix || {}).map(([line, percentage]) => (
                                        <span key={line} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                          {line}: {percentage}%
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col space-y-2 ml-4">
                                <button
                                  onClick={() => handleSendEmail(member)}
                                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                >
                                  Send Email
                                </button>
                                <button
                                  onClick={() => handleConfirmInvoice(member.id)}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                >
                                  Confirm Invoice
                                </button>
                                <button
                                  onClick={() => handleFlag(member.id)}
                                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                >
                                  Flag
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>


                  {/* Approved Members */}
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                    <div className="p-6 border-b border-fase-light-gold">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Approved Members</h3>
                      <p className="text-fase-black text-sm mt-1">Currently active members • Total revenue: €{approvedApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-fase-light-gold">
                        <thead className="bg-fase-cream">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Organization</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Country</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Fee Paid</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Approved</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-fase-light-gold">
                          {approvedApplications.map(member => (
                            <tr key={member.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-fase-navy">{member.organizationName || 'Unknown Organization'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {member.organizationType || 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-fase-black">
                                {member.registeredAddress?.country || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-fase-black">
                                {member.primaryContact?.name || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                €{calculateMembershipFee(member)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-fase-black">
                                {member.updatedAt?.seconds ? new Date(member.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
        </div>
      )
    },
    {
      id: 'messages',
      title: 'Messages',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      content: loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Loading messages...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Messages ({messages.length})</h3>
                <Button 
                  variant="primary" 
                  size="small"
                  onClick={() => setShowCreateMessage(true)}
                >
                  New Message
                </Button>
              </div>
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
                      message.isRead ? 'border-gray-200' : 'border-fase-navy bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className={`font-medium ${message.isRead ? 'text-gray-900' : 'text-fase-navy'}`}>
                            {message.subject}
                          </h4>
                          {!message.isRead && (
                            <span className="bg-fase-navy text-white text-xs px-2 py-1 rounded-full">New</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${
                            message.priority === 'high' ? 'bg-red-100 text-red-800' :
                            message.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {message.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">From: {message.senderName}</p>
                        <p className="text-gray-800 mb-3 line-clamp-2">{message.content}</p>
                        <p className="text-xs text-gray-500">
                          {message.createdAt?.toDate ? new Date(message.createdAt.toDate()).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {!message.isRead && (
                          <button
                            onClick={() => handleMarkMessageAsRead(message.id)}
                            className="text-xs text-fase-navy hover:text-fase-gold px-2 py-1 border border-fase-navy hover:border-fase-gold rounded transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="text-xs text-red-600 hover:text-red-800 px-2 py-1 border border-red-600 hover:border-red-800 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">No Messages</h3>
              <p className="text-fase-black">You have no messages at this time.</p>
              <div className="mt-4">
                <Button 
                  variant="primary" 
                  size="medium"
                  onClick={() => setShowCreateMessage(true)}
                >
                  Send New Message
                </Button>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'alerts',
      title: 'Alerts',
      icon: (
        <div className="relative">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 19H9l4-4h-1a2 2 0 01-2-2V9a2 2 0 012-2h1l-4-4h4l4 4v4a2 2 0 01-2 2h-1l4 4z" />
          </svg>
          {/* Alert indicator - add condition for actual alerts */}
          {(pendingApplications.length > 0 || pendingJoinRequests.length > 0 || alerts.filter(a => !a.isRead).length > 0) && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              !
            </span>
          )}
        </div>
      ),
      content: loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Loading alerts...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* System Alerts */}
          {alerts.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">System Alerts ({alerts.filter(a => !a.isRead).length} unread)</h3>
                <Button 
                  variant="primary" 
                  size="small"
                  onClick={() => setShowCreateAlert(true)}
                >
                  New Alert
                </Button>
              </div>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-4 ${
                      alert.type === 'error' ? 'bg-red-50 border-red-200' :
                      alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                      alert.type === 'success' ? 'bg-green-50 border-green-200' :
                      'bg-blue-50 border-blue-200'
                    } ${alert.isRead ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className={`font-medium ${
                            alert.type === 'error' ? 'text-red-800' :
                            alert.type === 'warning' ? 'text-amber-800' :
                            alert.type === 'success' ? 'text-green-800' :
                            'text-blue-800'
                          }`}>
                            {alert.title}
                          </h4>
                          {!alert.isRead && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">New</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${
                            alert.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            alert.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {alert.priority}
                          </span>
                        </div>
                        <p className={`mb-3 ${
                          alert.type === 'error' ? 'text-red-700' :
                          alert.type === 'warning' ? 'text-amber-700' :
                          alert.type === 'success' ? 'text-green-700' :
                          'text-blue-700'
                        }`}>
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {alert.createdAt?.toDate ? new Date(alert.createdAt.toDate()).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {!alert.isRead && (
                          <button
                            onClick={() => handleMarkAlertAsRead(alert.id)}
                            className="text-xs text-fase-navy hover:text-fase-gold px-2 py-1 border border-fase-navy hover:border-fase-gold rounded transition-colors"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDismissAlert(alert.id)}
                          className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 border border-gray-300 hover:border-gray-400 rounded transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Administrative Alerts */}
          {(pendingApplications.length > 0 || pendingJoinRequests.length > 0) && (
            <>
              <div className="border-t pt-4 mt-6">
                <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Administrative Alerts</h3>
              </div>
              {pendingApplications.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-amber-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 mb-1">Pending Member Applications</h4>
                      <p className="text-sm text-amber-700">
                        {pendingApplications.length} membership application{pendingApplications.length !== 1 ? 's' : ''} waiting for review.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {pendingJoinRequests.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Pending Join Requests</h4>
                      <p className="text-sm text-blue-700">
                        {pendingJoinRequests.length} join request{pendingJoinRequests.length !== 1 ? 's' : ''} awaiting approval.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* All Clear State */}
          {alerts.length === 0 && pendingApplications.length === 0 && pendingJoinRequests.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">All Clear</h3>
              <p className="text-fase-black">No alerts or pending items. Everything is up to date!</p>
              <div className="mt-4">
                <Button 
                  variant="primary" 
                  size="medium"
                  onClick={() => setShowCreateAlert(true)}
                >
                  Create New Alert
                </Button>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'join-requests',
      title: `Join Requests${pendingJoinRequests.length > 0 ? ` (${pendingJoinRequests.length})` : ''}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      content: loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Loading join requests...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
            <div className="p-6 border-b border-fase-light-gold">
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Pending Join Requests</h3>
              <p className="text-fase-black text-sm mt-1">Employees requesting access to their company&apos;s FASE membership</p>
            </div>
            <div className="divide-y divide-fase-light-gold">
              {pendingJoinRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-fase-black">No pending join requests</p>
                </div>
              ) : (
                pendingJoinRequests.map(request => (
                  <div key={`${request.companyId}-${request.id}`} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="font-medium text-fase-navy text-lg">{request.fullName}</span>
                          <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {request.jobTitle || 'No title provided'}
                          </span>
                        </div>
                        <div className="text-sm text-fase-black space-y-1">
                          <div><strong>Email:</strong> {request.email}</div>
                          <div><strong>Company:</strong> {request.companyName}</div>
                          <div><strong>Requested:</strong> {request.requestedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => handleJoinRequestAction('approve', request.companyId, request.id, request)}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleJoinRequestAction('reject', request.companyId, request.id, request)}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'emails',
      title: 'Emails',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      content: <EmailsTab prefilledData={null} />
    }
  ];

  return (
    <>
      <DashboardLayout
        title="Admin Portal"
        subtitle="Manage knowledge base content, moderate comments, and review member applications"
        bannerImage="/conferenceWood.jpg"
        bannerImageAlt="Corporate Management"
        sections={dashboardSections}
        currentPage="admin-portal"
        statusBadge={statusBadge}
        defaultActiveSection="overview"
      />

      {/* Create Alert Modal */}
      <Modal 
        isOpen={showCreateAlert} 
        onClose={() => setShowCreateAlert(false)} 
        title="Create New Alert"
        maxWidth="xl"
      >
        <div className="space-y-6">
          <div>
            <label htmlFor="alertTitle" className="block text-sm font-medium text-gray-700 mb-2">
              Alert Title
            </label>
            <input
              type="text"
              id="alertTitle"
              value={alertForm.title}
              onChange={(e) => setAlertForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder="Enter alert title..."
            />
          </div>

          <div>
            <label htmlFor="alertMessage" className="block text-sm font-medium text-gray-700 mb-2">
              Alert Message
            </label>
            <textarea
              id="alertMessage"
              rows={4}
              value={alertForm.message}
              onChange={(e) => setAlertForm(prev => ({ ...prev, message: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder="Enter alert message..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="alertType" className="block text-sm font-medium text-gray-700 mb-2">
                Alert Type
              </label>
              <select
                id="alertType"
                value={alertForm.type}
                onChange={(e) => setAlertForm(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="success">Success</option>
              </select>
            </div>

            <div>
              <label htmlFor="alertPriority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="alertPriority"
                value={alertForm.priority}
                onChange={(e) => setAlertForm(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="alertAudience" className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience
            </label>
            <select
              id="alertAudience"
              value={alertForm.targetAudience}
              onChange={(e) => setAlertForm(prev => ({ ...prev, targetAudience: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="members">All Members</option>
              <option value="admins">Admins Only</option>
              <option value="member_type">Members by Organization Type</option>
              <option value="specific_members">Specific Organizations</option>
            </select>
          </div>

          {/* Organization Type Filter */}
          {alertForm.targetAudience === 'member_type' && (
            <div>
              <label htmlFor="alertOrgType" className="block text-sm font-medium text-gray-700 mb-2">
                Organization Type
              </label>
              <select
                id="alertOrgType"
                value={alertForm.organizationType}
                onChange={(e) => setAlertForm(prev => ({ ...prev, organizationType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="">Select Organization Type</option>
                <option value="MGA">MGAs</option>
                <option value="carrier">Carriers</option>
                <option value="provider">Service Providers</option>
              </select>
            </div>
          )}

          {/* Specific Organizations Filter */}
          {alertForm.targetAudience === 'specific_members' && (
            <div>
              <label htmlFor="alertOrgSearch" className="block text-sm font-medium text-gray-700 mb-2">
                Search Organizations
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="alertOrgSearch"
                  value={alertForm.organizationSearch}
                  onChange={(e) => {
                    setAlertForm(prev => ({ ...prev, organizationSearch: e.target.value }));
                    handleOrganizationSearch(e.target.value, 'alert');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="Search by organization name..."
                />
                
                {/* Search Results Dropdown */}
                {organizationSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {organizationSearchResults.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => addOrganizationToSelection(org.organizationName || 'Unknown', 'alert')}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        <div className="font-medium">{org.organizationName || 'Unknown Organization'}</div>
                        <div className="text-sm text-gray-500">{org.organizationType || 'N/A'} • {org.registeredAddress?.country || 'N/A'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Organizations */}
              {alertForm.selectedOrganizations.length > 0 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Organizations ({alertForm.selectedOrganizations.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {alertForm.selectedOrganizations.map((orgName) => (
                      <span
                        key={orgName}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-fase-navy text-white"
                      >
                        {orgName}
                        <button
                          type="button"
                          onClick={() => removeOrganizationFromSelection(orgName, 'alert')}
                          className="ml-2 text-white hover:text-gray-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="actionRequired"
              checked={alertForm.actionRequired}
              onChange={(e) => setAlertForm(prev => ({ ...prev, actionRequired: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="actionRequired" className="text-sm font-medium text-gray-700">
              Action Required
            </label>
          </div>

          {alertForm.actionRequired && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="actionText" className="block text-sm font-medium text-gray-700 mb-2">
                  Action Button Text
                </label>
                <input
                  type="text"
                  id="actionText"
                  value={alertForm.actionText}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, actionText: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="e.g., Update Profile"
                />
              </div>
              <div>
                <label htmlFor="actionUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Action URL
                </label>
                <input
                  type="url"
                  id="actionUrl"
                  value={alertForm.actionUrl}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, actionUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700 mb-2">
              Expires At (Optional)
            </label>
            <input
              type="datetime-local"
              id="expiresAt"
              value={alertForm.expiresAt}
              onChange={(e) => setAlertForm(prev => ({ ...prev, expiresAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              variant="secondary" 
              size="medium"
              onClick={() => setShowCreateAlert(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              size="medium"
              onClick={handleCreateAlert}
            >
              Create Alert
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Message Modal */}
      <Modal 
        isOpen={showCreateMessage} 
        onClose={() => setShowCreateMessage(false)} 
        title="Send New Message"
        maxWidth="xl"
      >
        <div className="space-y-6">
          <div>
            <label htmlFor="messageSubject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              id="messageSubject"
              value={messageForm.subject}
              onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder="Enter message subject..."
            />
          </div>

          <div>
            <label htmlFor="messageContent" className="block text-sm font-medium text-gray-700 mb-2">
              Message Content
            </label>
            <textarea
              id="messageContent"
              rows={6}
              value={messageForm.content}
              onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder="Enter your message..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="recipientType" className="block text-sm font-medium text-gray-700 mb-2">
                Recipients
              </label>
              <select
                id="recipientType"
                value={messageForm.recipientType}
                onChange={(e) => setMessageForm(prev => ({ ...prev, recipientType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="all_members">All Members</option>
                <option value="all_admins">All Admins</option>
                <option value="member_type">Members by Organization Type</option>
                <option value="specific_members">Specific Organizations</option>
              </select>
            </div>

            <div>
              <label htmlFor="messagePriority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="messagePriority"
                value={messageForm.priority}
                onChange={(e) => setMessageForm(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Organization Type Filter for Messages */}
          {messageForm.recipientType === 'member_type' && (
            <div>
              <label htmlFor="messageOrgType" className="block text-sm font-medium text-gray-700 mb-2">
                Organization Type
              </label>
              <select
                id="messageOrgType"
                value={messageForm.organizationType}
                onChange={(e) => setMessageForm(prev => ({ ...prev, organizationType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="">Select Organization Type</option>
                <option value="MGA">MGAs</option>
                <option value="carrier">Carriers</option>
                <option value="provider">Service Providers</option>
              </select>
            </div>
          )}

          {/* Specific Organizations Filter for Messages */}
          {messageForm.recipientType === 'specific_members' && (
            <div>
              <label htmlFor="messageOrgSearch" className="block text-sm font-medium text-gray-700 mb-2">
                Search Organizations
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="messageOrgSearch"
                  value={messageForm.organizationSearch}
                  onChange={(e) => {
                    setMessageForm(prev => ({ ...prev, organizationSearch: e.target.value }));
                    handleOrganizationSearch(e.target.value, 'message');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="Search by organization name..."
                />
                
                {/* Search Results Dropdown */}
                {organizationSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {organizationSearchResults.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => addOrganizationToSelection(org.organizationName || 'Unknown', 'message')}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        <div className="font-medium">{org.organizationName || 'Unknown Organization'}</div>
                        <div className="text-sm text-gray-500">{org.organizationType || 'N/A'} • {org.registeredAddress?.country || 'N/A'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Organizations */}
              {messageForm.selectedOrganizations.length > 0 && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Organizations ({messageForm.selectedOrganizations.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {messageForm.selectedOrganizations.map((orgName) => (
                      <span
                        key={orgName}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-fase-navy text-white"
                      >
                        {orgName}
                        <button
                          type="button"
                          onClick={() => removeOrganizationFromSelection(orgName, 'message')}
                          className="ml-2 text-white hover:text-gray-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="messageType" className="block text-sm font-medium text-gray-700 mb-2">
              Message Type
            </label>
            <select
              id="messageType"
              value={messageForm.messageType}
              onChange={(e) => setMessageForm(prev => ({ ...prev, messageType: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            >
              <option value="announcement">Announcement</option>
              <option value="system">System Message</option>
              <option value="direct">Direct Message</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <Button 
              variant="secondary" 
              size="medium"
              onClick={() => setShowCreateMessage(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              size="medium"
              onClick={handleCreateMessage}
            >
              Send Message
            </Button>
          </div>
        </div>
      </Modal>

      {/* Join Request Processing Modal */}
      {processingRequest && (
        <Modal 
          isOpen={true}
          onClose={() => setProcessingRequest(null)}
          title={`${processingRequest.action === 'approve' ? 'Approve' : 'Reject'} Join Request`}
          maxWidth="lg"
        >
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> {processingRequest.requestData.fullName}</div>
                <div><strong>Email:</strong> {processingRequest.requestData.email}</div>
                <div><strong>Company:</strong> {processingRequest.requestData.companyName}</div>
                {processingRequest.requestData.jobTitle && (
                  <div><strong>Job Title:</strong> {processingRequest.requestData.jobTitle}</div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="adminNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (Optional)
              </label>
              <textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder={
                  processingRequest.action === 'approve'
                    ? "Optional message to include in the approval email..."
                    : "Optional explanation for the rejection..."
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                This message will be included in the email notification to the user.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                variant="secondary" 
                size="medium"
                onClick={() => setProcessingRequest(null)}
              >
                Cancel
              </Button>
              <Button 
                variant={processingRequest.action === 'approve' ? 'primary' : 'secondary'}
                size="medium"
                onClick={processJoinRequest}
                className={processingRequest.action === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
              >
                {processingRequest.action === 'approve' ? 'Approve Request' : 'Reject Request'}
              </Button>
            </div>
        </Modal>
      )}

      {/* Pre-filled Email Form Modal */}
      {showEmailForm && selectedAccount && (
        <Modal 
          isOpen={showEmailForm} 
          onClose={() => {
            setShowEmailForm(false);
            setSelectedAccount(null);
          }} 
          title={`Send Email - ${selectedAccount.organizationName}`}
          maxWidth="xl"
        >
          <EmailsTab prefilledData={selectedAccount} />
        </Modal>
      )}
    </>
  );
}