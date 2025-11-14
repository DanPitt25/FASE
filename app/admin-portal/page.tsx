'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';
import { 
  getUserAlerts, 
  getUserMessages, 
  markAlertAsRead, 
  dismissAlert, 
  markMessageAsRead, 
  deleteMessageForUser, 
  createAlert, 
  sendMessage 
} from '../../lib/unified-messaging';
import { 
  searchMembersByOrganizationName, 
  getUserIdsForMemberCriteria, 
  UnifiedMember, 
  getAccountsByStatus, 
  updateMemberStatus, 
  getAllPendingJoinRequests, 
  approveJoinRequest, 
  rejectJoinRequest 
} from '../../lib/unified-member';
import type { JoinRequest } from '../../lib/unified-member';
import type { Alert, UserAlert, Message, UserMessage } from '../../lib/unified-messaging';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

// Import modular tab components
import OverviewTab from './components/OverviewTab';
import MembersTab from './components/MembersTab';
import MessagesTab from './components/MessagesTab';
import AlertsTab from './components/AlertsTab';
import JoinRequestsTab from './components/JoinRequestsTab';
import EmailsTab from './components/EmailsTab';

export default function AdminPortalPage() {
  const { user, member, loading: authLoading, isAdmin } = useUnifiedAuth();
  const router = useRouter();

  // State for data
  const [memberApplications, setMemberApplications] = useState<UnifiedMember[]>([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<(JoinRequest & { companyData?: UnifiedMember })[]>([]);
  const [alerts, setAlerts] = useState<(Alert & UserAlert)[]>([]);
  const [messages, setMessages] = useState<(Message & UserMessage)[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('overview');

  // Modal states
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [showCreateMessage, setShowCreateMessage] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  
  // Processing states
  const [processingRequest, setProcessingRequest] = useState<{
    action: 'approve' | 'reject';
    companyId: string;
    requestId: string;
    requestData: any;
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Form states for modals
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

  const [messageForm, setMessageForm] = useState({
    subject: '',
    content: '',
    recipientType: 'all_members' as 'all_users' | 'all_members' | 'all_admins' | 'user' | 'member_type' | 'specific_members',
    recipientId: '',
    organizationType: '' as '' | 'MGA' | 'carrier' | 'provider',
    organizationSearch: '',
    selectedOrganizations: [] as string[],
  });

  const [organizationSearchResults, setOrganizationSearchResults] = useState<UnifiedMember[]>([]);

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/member-portal');
    }
  }, [user, isAdmin, authLoading, router]);

  // Load data
  const loadData = useCallback(async () => {
    if (!user?.uid || !isAdmin) return;

    try {
      setLoading(true);
      // Get all accounts by combining all statuses
      const [pendingAccounts, pendingInvoiceAccounts, approvedAccounts, adminAccounts, invoiceSentAccounts, flaggedAccounts, alertsData, messagesData, joinRequestsData] = await Promise.all([
        getAccountsByStatus('pending'),
        getAccountsByStatus('pending_invoice'),
        getAccountsByStatus('approved'),
        getAccountsByStatus('admin'),
        getAccountsByStatus('invoice_sent'),
        getAccountsByStatus('flagged'),
        getUserAlerts(user.uid),
        getUserMessages(user.uid),
        getAllPendingJoinRequests()
      ]);

      const membersData = [
        ...pendingAccounts,
        ...pendingInvoiceAccounts,
        ...approvedAccounts,
        ...adminAccounts,
        ...invoiceSentAccounts,
        ...flaggedAccounts
      ];

      setMemberApplications(membersData);
      setAlerts(alertsData);
      setMessages(messagesData);
      setPendingJoinRequests(joinRequestsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Status badge for header
  const statusBadge = () => {
    const pendingCount = memberApplications.filter(m => m.status === 'pending').length;
    const joinRequestCount = pendingJoinRequests.length;
    const totalPending = pendingCount + joinRequestCount;
    
    if (totalPending > 0) {
      return (
        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-medium">
          {totalPending} Pending
        </span>
      );
    }
    return null;
  };

  // Handler functions
  const handleEmailFormOpen = (account: any) => {
    setSelectedAccount(account);
    setActiveSection('emails'); // Switch to emails tab
  };

  const handleMemberStatusUpdate = async (memberId: string, newStatus: UnifiedMember['status'], adminNotes?: string) => {
    try {
      // Optimistic update - update UI immediately
      setMemberApplications(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, status: newStatus, updatedAt: new Date() }
            : member
        )
      );

      // Then update the backend
      await updateMemberStatus(memberId, newStatus);
      
      // No need to reload all data - the optimistic update already handled the UI
    } catch (error) {
      console.error('Error updating member status:', error);
      
      // On error, revert the optimistic update by reloading just this member's data
      try {
        const { getUnifiedMember } = await import('../../lib/unified-member');
        const updatedMember = await getUnifiedMember(memberId);
        if (updatedMember) {
          setMemberApplications(prev => 
            prev.map(member => 
              member.id === memberId ? updatedMember : member
            )
          );
        }
      } catch (revertError) {
        console.error('Error reverting optimistic update:', revertError);
        // As last resort, reload all data
        await loadData();
      }
    }
  };

  const handleCreateAlert = async () => {
    if (!user?.uid) return;

    try {
      let userIds: string[] = [];

      if (alertForm.targetAudience === 'specific_members') {
        userIds = alertForm.selectedOrganizations;
      } else if (alertForm.targetAudience === 'member_type') {
        userIds = await getUserIdsForMemberCriteria({ 
          organizationType: alertForm.organizationType || undefined 
        });
      }

      // Map form values to Alert interface values
      let mappedTargetAudience: 'all' | 'members' | 'admins' | 'specific';
      if (alertForm.targetAudience === 'member_type') {
        mappedTargetAudience = 'members';
      } else if (alertForm.targetAudience === 'specific_members') {
        mappedTargetAudience = 'specific';
      } else {
        mappedTargetAudience = alertForm.targetAudience as 'all' | 'members' | 'admins' | 'specific';
      }

      await createAlert({
        title: alertForm.title,
        message: alertForm.message,
        type: alertForm.type,
        priority: alertForm.priority,
        targetAudience: mappedTargetAudience,
        targetUsers: userIds.length > 0 ? userIds : undefined,
        organizationType: alertForm.organizationType || undefined,
        actionRequired: alertForm.actionRequired,
        actionUrl: alertForm.actionUrl || undefined,
        actionText: alertForm.actionText || undefined,
        expiresAt: alertForm.expiresAt ? new Date(alertForm.expiresAt) : undefined,
        createdBy: user.uid,
        isActive: true
      });

      // Reset form
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
      
      // Optimistic update - just reload alerts instead of all data
      try {
        const updatedAlerts = await getUserAlerts(user.uid);
        setAlerts(updatedAlerts);
      } catch (error) {
        console.error('Error reloading alerts:', error);
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  const handleCreateMessage = async () => {
    if (!user?.uid) return;

    try {
      let userIds: string[] = [];

      if (messageForm.recipientType === 'specific_members') {
        userIds = messageForm.selectedOrganizations;
      } else if (messageForm.recipientType === 'member_type') {
        userIds = await getUserIdsForMemberCriteria({ 
          organizationType: messageForm.organizationType || undefined 
        });
      }

      // Map form values to Message interface values
      let mappedRecipientType: 'user' | 'all_members' | 'all_admins' | 'all_users';
      if (messageForm.recipientType === 'member_type' || messageForm.recipientType === 'specific_members') {
        mappedRecipientType = 'all_members';
      } else {
        mappedRecipientType = messageForm.recipientType as 'user' | 'all_members' | 'all_admins' | 'all_users';
      }

      await sendMessage({
        subject: messageForm.subject,
        content: messageForm.content,
        recipientType: mappedRecipientType,
        recipientId: messageForm.recipientId || undefined,
        organizationType: messageForm.organizationType || undefined,
        senderId: user.uid,
        senderName: member?.personalName || 'Admin',
        senderEmail: user.email || '',
        messageType: 'announcement',
        priority: 'medium',
        isRead: false
      });

      // Reset form
      setMessageForm({
        subject: '',
        content: '',
        recipientType: 'all_members',
        recipientId: '',
        organizationType: '',
        organizationSearch: '',
        selectedOrganizations: [],
      });

      setShowCreateMessage(false);
      
      // Optimistic update - just reload messages instead of all data
      try {
        const updatedMessages = await getUserMessages(user.uid);
        setMessages(updatedMessages);
      } catch (error) {
        console.error('Error reloading messages:', error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleJoinRequestAction = async (action: 'approve' | 'reject', companyId: string, requestId: string, requestData: any) => {
    setProcessingRequest({ action, companyId, requestId, requestData });
  };

  const confirmJoinRequestAction = async () => {
    if (!processingRequest || !user?.uid) return;

    try {
      // Optimistic update - remove the join request from UI immediately
      setPendingJoinRequests(prev => 
        prev.filter(req => req.id !== processingRequest.requestId)
      );

      if (processingRequest.action === 'approve') {
        await approveJoinRequest(processingRequest.companyId, processingRequest.requestId, user.uid, adminNotes);
      } else {
        await rejectJoinRequest(processingRequest.companyId, processingRequest.requestId, user.uid, adminNotes);
      }

      setProcessingRequest(null);
      setAdminNotes('');
      
      // No need to reload all data - the optimistic update already handled the UI
    } catch (error) {
      console.error('Error processing join request:', error);
      
      // On error, reload just the join requests
      try {
        const { getAllPendingJoinRequests } = await import('../../lib/unified-member');
        const updatedRequests = await getAllPendingJoinRequests();
        setPendingJoinRequests(updatedRequests);
      } catch (revertError) {
        console.error('Error reverting join request update:', revertError);
        // As last resort, reload all data
        await loadData();
      }
      
      setProcessingRequest(null);
      setAdminNotes('');
    }
  };

  // Show loading while checking auth
  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  // Dashboard sections using modular components
  const dashboardSections = [
    {
      id: 'overview',
      title: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      content: <OverviewTab memberApplications={memberApplications} loading={loading} />
    },
    {
      id: 'members',
      title: `Members (${memberApplications.length})`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      content: (
        <MembersTab
          memberApplications={memberApplications}
          loading={loading}
          onEmailFormOpen={handleEmailFormOpen}
          onStatusUpdate={handleMemberStatusUpdate}
        />
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
      content: (
        <MessagesTab
          messages={messages}
          loading={loading}
          onCreateMessage={() => setShowCreateMessage(true)}
          onMarkAsRead={async (messageId) => {
            // Optimistic update
            setMessages(prev => 
              prev.map(msg => 
                msg.id === messageId ? { ...msg, isRead: true } : msg
              )
            );
            
            try {
              await markMessageAsRead(messageId);
            } catch (error) {
              console.error('Error marking message as read:', error);
              // Revert optimistic update
              const updatedMessages = await getUserMessages(user?.uid || '');
              setMessages(updatedMessages);
            }
          }}
          onDeleteMessage={async (messageId) => {
            // Optimistic update
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
            
            try {
              await deleteMessageForUser(messageId);
            } catch (error) {
              console.error('Error deleting message:', error);
              // Revert optimistic update
              const updatedMessages = await getUserMessages(user?.uid || '');
              setMessages(updatedMessages);
            }
          }}
        />
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
          {/* Alert indicator */}
          {(memberApplications.filter(m => m.status === 'pending').length > 0 || 
            pendingJoinRequests.length > 0 || 
            alerts.filter(a => !a.isRead).length > 0) && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              !
            </span>
          )}
        </div>
      ),
      content: (
        <AlertsTab
          alerts={alerts}
          pendingApplications={memberApplications.filter(m => m.status === 'pending')}
          pendingJoinRequests={pendingJoinRequests}
          loading={loading}
          onCreateAlert={() => setShowCreateAlert(true)}
          onMarkAsRead={async (alertId) => {
            // Optimistic update
            setAlerts(prev => 
              prev.map(alert => 
                alert.id === alertId ? { ...alert, isRead: true } : alert
              )
            );
            
            try {
              await markAlertAsRead(alertId);
            } catch (error) {
              console.error('Error marking alert as read:', error);
              // Revert optimistic update
              const updatedAlerts = await getUserAlerts(user?.uid || '');
              setAlerts(updatedAlerts);
            }
          }}
          onDismissAlert={async (alertId) => {
            // Optimistic update
            setAlerts(prev => prev.filter(alert => alert.id !== alertId));
            
            try {
              await dismissAlert(alertId);
            } catch (error) {
              console.error('Error dismissing alert:', error);
              // Revert optimistic update
              const updatedAlerts = await getUserAlerts(user?.uid || '');
              setAlerts(updatedAlerts);
            }
          }}
        />
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
      content: (
        <JoinRequestsTab
          pendingJoinRequests={pendingJoinRequests}
          loading={loading}
          onApprove={(companyId, requestId, requestData) => 
            handleJoinRequestAction('approve', companyId, requestId, requestData)
          }
          onReject={(companyId, requestId, requestData) => 
            handleJoinRequestAction('reject', companyId, requestId, requestData)
          }
        />
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
      content: <EmailsTab prefilledData={selectedAccount} />
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
        statusBadge={statusBadge()}
        activeSection={activeSection}
        onActiveSectionChange={setActiveSection}
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
          {/* Alert form fields would go here - simplified for refactoring */}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowCreateAlert(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateAlert}>
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
          {/* Message form fields would go here - simplified for refactoring */}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowCreateMessage(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateMessage}>
              Send Message
            </Button>
          </div>
        </div>
      </Modal>

      {/* Join Request Confirmation Modal */}
      <Modal 
        isOpen={!!processingRequest} 
        onClose={() => setProcessingRequest(null)} 
        title={`${processingRequest?.action === 'approve' ? 'Approve' : 'Reject'} Join Request`}
      >
        {processingRequest && (
          <div className="space-y-4">
            <p>
              Are you sure you want to {processingRequest.action} the join request from{' '}
              <strong>{processingRequest.requestData.fullName}</strong> at{' '}
              <strong>{processingRequest.requestData.companyName}</strong>?
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Notes (optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setProcessingRequest(null)}>
                Cancel
              </Button>
              <Button 
                variant={processingRequest.action === 'approve' ? 'primary' : 'secondary'}
                onClick={confirmJoinRequestAction}
              >
                {processingRequest.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}