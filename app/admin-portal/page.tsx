'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';
import { getVideos, getPendingComments, moderateComment } from '../../lib/knowledge-base';
import type { Video, Comment } from '../../lib/knowledge-base';
// Note: MemberApplication type no longer used after UnifiedMember migration
import { getUserAlerts, getUserMessages, markAlertAsRead, dismissAlert, markMessageAsRead, deleteMessageForUser, createAlert, sendMessage } from '../../lib/unified-messaging';
import { searchMembersByOrganizationName, getUserIdsForMemberCriteria, UnifiedMember, getMembersByStatus, updateMemberStatus } from '../../lib/unified-member';
import type { Alert, UserAlert, Message, UserMessage } from '../../lib/unified-messaging';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

// Pricing calculation function (adapted for UnifiedMember)
const calculateMembershipFee = (member: UnifiedMember): number => {
  let baseFee = 0;
  
  if (member.membershipType === 'individual') {
    baseFee = 500;
  } else if (member.organizationType === 'MGA' && member.portfolio?.grossWrittenPremiums) {
    switch (member.portfolio.grossWrittenPremiums) {
      case '<10m': baseFee = 900; break;
      case '10-20m': baseFee = 1500; break;
      case '20-50m': baseFee = 2000; break;
      case '50-100m': baseFee = 2800; break;
      case '100-500m': baseFee = 4200; break;
      case '500m+': baseFee = 6400; break;
      default: baseFee = 900;
    }
  } else {
    // Default corporate fee for carriers and providers
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
  const [videos, setVideos] = useState<Video[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [memberApplications, setMemberApplications] = useState<UnifiedMember[]>([]);
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
  }, [user, isAdmin, authLoading, adminLoading, router]);

  const loadData = async () => {
    try {
      const [videosData, commentsData, pendingMembers, approvedMembers, alertsData, messagesData] = await Promise.all([
        getVideos(), // Get all published videos
        user?.uid ? getPendingComments(user.uid) : [],
        getMembersByStatus('pending'), // Get pending members
        getMembersByStatus('approved'), // Get approved members  
        user?.uid ? getUserAlerts(user.uid) : [],
        user?.uid ? getUserMessages(user.uid) : []
      ]);
      setVideos(videosData);
      setPendingComments(commentsData);
      setMemberApplications([...pendingMembers, ...approvedMembers]); // Combine for display
      setAlerts(alertsData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerateComment = async (commentId: string, status: 'approved' | 'rejected') => {
    if (!user?.uid) return;
    
    try {
      await moderateComment(user.uid, commentId, status);
      setPendingComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error moderating comment:', error);
      alert('Error moderating comment. Please try again.');
    }
  };

  const handleMemberApplicationStatus = async (memberId: string, newStatus: 'approved' | 'rejected') => {
    try {
      // Map rejected to guest status for UnifiedMember
      const status: UnifiedMember['status'] = newStatus === 'rejected' ? 'guest' : 'approved';
      await updateMemberStatus(memberId, status);
      setMemberApplications(prev => 
        prev.map(member => member.id === memberId ? { ...member, status } : member)
      );
    } catch (error) {
      console.error('Error updating member status:', error);
      alert('Error updating member status. Please try again.');
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
        const userAlerts = await getUserAlerts(user.uid);
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
          const userMessages = await getUserMessages(user.uid);
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
        const userMessages = await getUserMessages(user.uid);
        setMessages(userMessages);
      }
      
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    }
  };

  const pendingApplications = memberApplications.filter(member => member.status === 'pending');
  const approvedApplications = memberApplications.filter(member => member.status === 'approved');
  // Note: invoice_sent status doesn't exist in UnifiedMember, mapping to pending for now
  const invoiceSentApplications: UnifiedMember[] = [];
  
  // Calculate total expected revenue from pending and invoice_sent applications
  const totalExpectedRevenue = [...pendingApplications, ...invoiceSentApplications]
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Member Applications</h3>
                      <p className="text-3xl font-bold text-orange-600 mb-2">{pendingApplications.length + invoiceSentApplications.length}</p>
                      <p className="text-fase-black text-sm">Pending review & payment</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Active Members</h3>
                      <p className="text-3xl font-bold text-green-600 mb-2">{approvedApplications.length}</p>
                      <p className="text-fase-black text-sm">Approved members</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Expected Revenue</h3>
                      <p className="text-3xl font-bold text-blue-600 mb-2">€{totalExpectedRevenue.toLocaleString()}</p>
                      <p className="text-fase-black text-sm">From pending applications</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Pending Comments</h3>
                      <p className="text-3xl font-bold text-red-600 mb-2">{pendingComments.length}</p>
                      <p className="text-fase-black text-sm">Awaiting moderation</p>
                    </div>
                  </div>
                  
                  {/* Revenue Breakdown */}
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Revenue Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">€{pendingApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-orange-800">Pending Review ({pendingApplications.length})</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">€{invoiceSentApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-blue-800">Invoices Sent ({invoiceSentApplications.length})</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">€{approvedApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-green-800">Approved Members ({approvedApplications.length})</p>
                      </div>
                    </div>
                  </div>
        </div>
      )
    },
    {
      id: 'members',
      title: `Members${pendingApplications.length > 0 ? ` (${pendingApplications.length})` : ''}`,
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
                  {/* Pending Applications */}
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                    <div className="p-6 border-b border-fase-light-gold">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Pending Applications</h3>
                      <p className="text-fase-black text-sm mt-1">Review and approve member applications • Expected revenue: €{pendingApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                    </div>
                    <div className="divide-y divide-fase-light-gold">
                      {pendingApplications.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-fase-black">No pending applications to review</p>
                        </div>
                      ) : (
                        pendingApplications.map(member => (
                          <div key={member.id} className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <span className="font-medium text-fase-navy text-lg">{member.organizationName || 'Unknown Organization'}</span>
                                  <span className="ml-3 px-2 py-1 bg-fase-cream text-fase-navy text-xs rounded-full">
                                    {member.organizationType || 'N/A'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Contact:</strong> {member.primaryContact?.name || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>Email:</strong> {member.primaryContact?.email || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>Phone:</strong> {member.primaryContact?.phone || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Country:</strong> {member.registeredAddress?.country || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>City:</strong> {member.registeredAddress?.city || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>Applied:</strong> {member.createdAt?.seconds ? new Date(member.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
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
                                      {Object.entries(member.portfolio.portfolioMix).map(([line, percentage]) => (
                                        <span key={line} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                          {line}: {percentage}%
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <button
                                  onClick={() => handleMemberApplicationStatus(member.id, 'approved')}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleMemberApplicationStatus(member.id, 'rejected')}
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

                  {/* Invoice Sent Applications */}
                  {invoiceSentApplications.length > 0 && (
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                      <div className="p-6 border-b border-fase-light-gold">
                        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Invoices Sent</h3>
                        <p className="text-fase-black text-sm mt-1">Awaiting payment • Expected revenue: €{invoiceSentApplications.reduce((total, member) => total + calculateMembershipFee(member), 0).toLocaleString()}</p>
                      </div>
                      <div className="divide-y divide-fase-light-gold">
                        {invoiceSentApplications.map(member => (
                          <div key={member.id} className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <span className="font-medium text-fase-navy text-lg">{member.organizationName || 'Unknown Organization'}</span>
                                  <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    Invoice Sent
                                  </span>
                                  <span className="ml-2 px-2 py-1 bg-fase-cream text-fase-navy text-xs rounded-full">
                                    {member.organizationType || 'N/A'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Contact:</strong> {member.primaryContact?.name || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>Email:</strong> {member.primaryContact?.email || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>Phone:</strong> {member.primaryContact?.phone || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Country:</strong> {member.registeredAddress?.country || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>City:</strong> {member.registeredAddress?.city || 'N/A'}</p>
                                    <p className="text-sm text-fase-black"><strong>Invoice Sent:</strong> {member.updatedAt?.seconds ? new Date(member.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Membership:</strong> {member.membershipType === 'individual' ? 'Individual' : `${member.organizationType || 'Corporate'} Corporate`}</p>
                                    {member.portfolio?.grossWrittenPremiums && (
                                      <p className="text-sm text-fase-black"><strong>GWP:</strong> {member.portfolio.grossWrittenPremiums}</p>
                                    )}
                                    <p className="text-sm font-semibold text-blue-600"><strong>Expected Payment: €{calculateMembershipFee(member)}</strong></p>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4 flex space-x-2">
                                <Button
                                  onClick={() => handleMemberApplicationStatus(member.id, 'approved')}
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                >
                                  Mark as Paid
                                </Button>
                                <Button
                                  onClick={() => handleMemberApplicationStatus(member.id, 'rejected')}
                                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
      id: 'videos',
      title: 'Videos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      content: loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Loading video data...</p>
        </div>
      ) : (
                <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                  <div className="p-6 border-b border-fase-light-gold">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Published Videos</h3>
                      <Button variant="primary" size="small">Add Video</Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-fase-light-gold">
                      <thead className="bg-fase-cream">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Views</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Upload Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-fase-light-gold">
                        {videos.map(video => (
                          <tr key={video.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-fase-navy">{video.title}</div>
                              <div className="text-sm text-fase-black">{video.author}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-fase-navy text-white">
                                {video.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-fase-black">{video.views}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-fase-black">
                              {video.uploadDate ? new Date(video.uploadDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-fase-navy hover:text-fase-gold mr-3">Edit</button>
                              <button className="text-red-600 hover:text-red-900">Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
        </div>
      )
    },
    {
      id: 'comments',
      title: `Comments${pendingComments.length > 0 ? ` (${pendingComments.length})` : ''}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      content: loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
          <p className="text-fase-black">Loading comment data...</p>
        </div>
      ) : (
                <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                  <div className="p-6 border-b border-fase-light-gold">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Pending Comments</h3>
                    <p className="text-fase-black text-sm mt-1">Review and moderate user comments</p>
                  </div>
                  <div className="divide-y divide-fase-light-gold">
                    {pendingComments.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-fase-black">No pending comments to review</p>
                      </div>
                    ) : (
                      pendingComments.map(comment => (
                        <div key={comment.id} className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <span className="font-medium text-fase-navy">{comment.authorName}</span>
                                <span className="text-fase-black text-sm ml-2">
                                  {new Date(comment.createdAt.seconds * 1000).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-fase-black mb-3">{comment.text}</p>
                              <p className="text-fase-black text-xs">Video ID: {comment.videoId}</p>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => handleModerateComment(comment.id, 'approved')}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleModerateComment(comment.id, 'rejected')}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
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
          {(pendingApplications.length > 0 || pendingComments.length > 0 || alerts.filter(a => !a.isRead).length > 0) && (
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
          {(pendingApplications.length > 0 || pendingComments.length > 0) && (
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
              {pendingComments.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Pending Comments</h4>
                      <p className="text-sm text-blue-700">
                        {pendingComments.length} comment{pendingComments.length !== 1 ? 's' : ''} awaiting moderation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* All Clear State */}
          {alerts.length === 0 && pendingApplications.length === 0 && pendingComments.length === 0 && (
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
    }
  ];

  return (
    <>
      <DashboardLayout
        title="Admin Portal"
        subtitle="Manage knowledge base content, moderate comments, and review member applications"
        bannerImage="/conference.jpg"
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
    </>
  );
}