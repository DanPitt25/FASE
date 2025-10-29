'use client';

import { useUnifiedAuth } from "../../contexts/UnifiedAuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "../../components/Button";
import DashboardLayout from "../../components/DashboardLayout";
import ManageProfile from "../../components/ManageProfile";
import { getUserAlerts, getUserMessages, markAlertAsRead, dismissAlert, markMessageAsRead, deleteMessageForUser, Alert, UserAlert, Message, UserMessage } from "../../lib/unified-messaging";

export default function MemberContent() {
  const { user, member, loading, hasMemberAccess } = useUnifiedAuth();
  const [alerts, setAlerts] = useState<(Alert & UserAlert)[]>([]);
  const [messages, setMessages] = useState<(Message & UserMessage)[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Load alerts and messages
  useEffect(() => {
    const loadData = async () => {
      if (!user || !member) {
        console.log('[DEBUG] Missing user or member data:', { user: !!user, member: !!member });
        return;
      }
      
      console.log('[DEBUG] Loading messages for member:', {
        memberId: member.id,
        memberEmail: member.email,
        membershipType: member.membershipType,
        organizationType: member.organizationType,
        status: member.status
      });
      
      try {
        setLoadingAlerts(true);
        setLoadingMessages(true);
        
        console.log('[DEBUG] Calling getUserMessages with ID:', member.id);
        const [userAlerts, userMessages] = await Promise.all([
          getUserAlerts(member.id), // Use Firestore account ID
          getUserMessages(member.id) // Use Firestore account ID
        ]);
        
        console.log('[DEBUG] getUserMessages returned:', {
          messageCount: userMessages.length,
          messages: userMessages.map(msg => ({
            id: msg.id,
            subject: msg.subject,
            messageId: msg.messageId,
            userId: msg.userId,
            isRead: msg.isRead
          }))
        });
        
        console.log('[DEBUG] getUserAlerts returned:', {
          alertCount: userAlerts.length,
          alerts: userAlerts.map(alert => ({
            id: alert.id,
            title: alert.title,
            userId: alert.userId,
            isRead: alert.isRead
          }))
        });
        
        setAlerts(userAlerts);
        setMessages(userMessages);
      } catch (error) {
        console.error('[DEBUG] Error loading alerts/messages:', error);
      } finally {
        setLoadingAlerts(false);
        setLoadingMessages(false);
      }
    };

    loadData();
  }, [user, member]);

  // Alert handlers
  const handleMarkAlertAsRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      ));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await dismissAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  // Message handlers
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

  // Clean status display - no bubbles
  const statusBadge = null; // Remove entirely

  // Get active alert count
  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const unreadMessages = messages.filter(message => !message.isRead);

  // Dashboard sections
  const dashboardSections = [
    {
      id: 'overview',
      title: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          {/* Payment Status - Clean design */}
          {member && member.status === 'pending_payment' && (
            <div className="border border-amber-200 bg-white p-6">
              <div className="flex items-start space-x-4">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-gray-900 font-medium">Payment Required</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Complete your membership payment to access all FASE resources.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {member && member.status === 'pending_invoice' && (
            <div className="border border-blue-200 bg-white p-6">
              <div className="flex items-start space-x-4">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-gray-900 font-medium">Invoice Sent</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Your membership invoice has been sent to your email. Access will be activated upon payment receipt.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {member && member.status === 'pending' && (
            <div className="border border-gray-200 bg-white p-6">
              <div className="flex items-start space-x-4">
                <svg className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-gray-900 font-medium">Application Under Review</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    Your membership application is being reviewed by our team. You&apos;ll receive an email once it&apos;s approved.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                  href={hasMemberAccess ? "/knowledge" : "#"}
                  variant={hasMemberAccess ? "primary" : "secondary"}
                  size="medium"
                  className={`flex-shrink-0 ${!hasMemberAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={!hasMemberAccess ? () => {} : undefined}
                >
                  {hasMemberAccess ? 'Browse Resources' : 'Access Restricted'}
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

            {/* Member Directory */}
            <div className="bg-white rounded-lg border border-fase-light-gold hover:border-fase-navy transition-colors duration-200 p-6 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-fase-navy rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-1">Member Directory</h3>
                    <p className="text-fase-black">Connect with fellow FASE members across Europe</p>
                  </div>
                </div>
                <Button 
                  href={hasMemberAccess ? "/directory" : "#"}
                  variant={hasMemberAccess ? "primary" : "secondary"}
                  size="medium"
                  className={`flex-shrink-0 ${!hasMemberAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={!hasMemberAccess ? () => {} : undefined}
                >
                  {hasMemberAccess ? 'Browse Directory' : 'Access Restricted'}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )
    },
    {
      id: 'messages',
      title: 'Messages',
      icon: (
        <div className="relative">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadMessages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {unreadMessages.length > 9 ? '9+' : unreadMessages.length}
            </span>
          )}
        </div>
      ),
      content: (
        <div className="space-y-6">
          {loadingMessages ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">No Messages</h3>
              <p className="text-fase-black">You don&apos;t have any messages yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`border rounded-lg p-4 transition-colors ${
                  message.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-medium ${
                      message.isRead ? 'text-fase-navy' : 'text-blue-900'
                    }`}>
                      {message.subject}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        message.priority === 'high' ? 'bg-red-100 text-red-700' :
                        message.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {message.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.createdAt?.toDate?.()?.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-fase-black mb-3 line-clamp-2">
                    {message.content}
                  </p>
                  
                  <div className="text-xs text-gray-500 mb-3">
                    From: {message.senderName} ({message.senderEmail})
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {!message.isRead && (
                        <button
                          onClick={() => handleMarkMessageAsRead(message.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 19c-5 0-8-2.5-8-6 0-5 4-9 9-9s9 4 9 9c0 .5-.1 1-.2 1.5" />
          </svg>
          {unreadAlerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              !
            </span>
          )}
        </div>
      ),
      content: (
        <div className="space-y-6">
          {loadingAlerts ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="flex justify-between items-start mb-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">No Alerts</h3>
              <p className="text-fase-black">You&apos;re all caught up! Check back later for important updates.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className={`border rounded-lg p-4 ${
                  alert.type === 'error' ? 'bg-red-50 border-red-200' :
                  alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  alert.type === 'success' ? 'bg-green-50 border-green-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-medium ${
                      alert.type === 'error' ? 'text-red-900' :
                      alert.type === 'warning' ? 'text-yellow-900' :
                      alert.type === 'success' ? 'text-green-900' :
                      'text-blue-900'
                    }`}>
                      {alert.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        alert.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        alert.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {alert.priority}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        alert.type === 'error' ? 'bg-red-100 text-red-800' :
                        alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        alert.type === 'success' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.type}
                      </span>
                    </div>
                  </div>
                  
                  <p className={`text-sm mb-3 ${
                    alert.type === 'error' ? 'text-red-800' :
                    alert.type === 'warning' ? 'text-yellow-800' :
                    alert.type === 'success' ? 'text-green-800' :
                    'text-blue-800'
                  }`}>
                    {alert.message}
                  </p>
                  
                  {alert.actionUrl && alert.actionText && (
                    <div className="mb-3">
                      <a
                        href={alert.actionUrl}
                        className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
                          alert.type === 'error' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                          alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                          alert.type === 'success' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                          'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                      >
                        {alert.actionText}
                      </a>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {alert.createdAt?.toDate?.()?.toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkAlertAsRead(alert.id)}
                          className={`text-xs font-medium ${
                            alert.type === 'error' ? 'text-red-600 hover:text-red-800' :
                            alert.type === 'warning' ? 'text-yellow-600 hover:text-yellow-800' :
                            alert.type === 'success' ? 'text-green-600 hover:text-green-800' :
                            'text-blue-600 hover:text-blue-800'
                          }`}
                        >
                          Mark as Read
                        </button>
                      )}
                      <button
                        onClick={() => handleDismissAlert(alert.id)}
                        className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'profile',
      title: 'Manage Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      content: <ManageProfile />
    }
  ];

  return (
    <DashboardLayout
      title={user?.displayName ? `Welcome, ${user.displayName}` : "Member Portal"}
      subtitle={user?.email || "Access all member benefits and resources"}
      bannerImage="/education.jpg"
      bannerImageAlt="Business Meeting"
      sections={dashboardSections}
      currentPage="member-portal"
      statusBadge={statusBadge}
      defaultActiveSection="overview"
    />
  );
}