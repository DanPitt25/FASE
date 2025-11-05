'use client';

import { useUnifiedAuth } from "../../contexts/UnifiedAuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "../../components/Button";
import DashboardLayout from "../../components/DashboardLayout";
import ManageProfile from "../../components/ManageProfile";
import { getUserAlerts, getUserMessages, markAlertAsRead, dismissAlert, markMessageAsRead, deleteMessageForUser, Alert, UserAlert, Message, UserMessage } from "../../lib/unified-messaging";
import { sendPasswordReset } from "../../lib/auth";
import { updateProfile } from "firebase/auth";
import { usePortalTranslations } from "./hooks/usePortalTranslations";

export default function MemberContent() {
  const { user, member, loading, hasMemberAccess } = useUnifiedAuth();
  const { t, loading: translationsLoading } = usePortalTranslations();
  const [alerts, setAlerts] = useState<(Alert & UserAlert)[]>([]);
  const [messages, setMessages] = useState<(Message & UserMessage)[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ displayName: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  
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
        return;
      }
      
      
      try {
        setLoadingAlerts(true);
        setLoadingMessages(true);
        
        const [userAlerts, userMessages] = await Promise.all([
          getUserAlerts(member.id), // Use Firestore account ID
          getUserMessages(member.id) // Use Firestore account ID
        ]);
        
        
        setAlerts(userAlerts);
        setMessages(userMessages);
      } catch (error) {
      } finally {
        setLoadingAlerts(false);
        setLoadingMessages(false);
      }
    };

    loadData();
  }, [user, member]);

  // Initialize profile data when user and member load
  useEffect(() => {
    if (user || member) {
      setProfileData({
        displayName: member?.personalName || user?.displayName || ''
      });
    }
  }, [user, member]);

  // Alert handlers
  const handleMarkAlertAsRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      ));
    } catch (error) {
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await dismissAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
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
    }
  };

  const handleDeleteMessage = async (userMessageId: string) => {
    try {
      await deleteMessageForUser(userMessageId);
      setMessages(prev => prev.filter(message => message.id !== userMessageId));
    } catch (error) {
    }
  };

  // Password reset handler
  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    try {
      setSendingPasswordReset(true);
      await sendPasswordReset(user.email);
      setPasswordResetSent(true);
      setTimeout(() => setPasswordResetSent(false), 5000); // Hide success message after 5 seconds
    } catch (error) {
      alert(t('profile.password_reset_failed'));
    } finally {
      setSendingPasswordReset(false);
    }
  };

  // Profile editing handlers
  const handleEditProfile = () => {
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setSavingProfile(true);
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: profileData.displayName.trim() || null
      });
      
      // Force reload user data
      await user.reload();
      
      setEditingProfile(false);
      alert(t('profile.profile_updated'));
    } catch (error) {
      alert(t('profile.profile_update_failed'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setProfileData({
      displayName: member?.personalName || user?.displayName || ''
    });
    setEditingProfile(false);
  };


  if (loading || translationsLoading) {
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
      title: t('sections.overview'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-fase-light-gold rounded-lg p-6">
            <h2 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">{t('overview.welcome_title')}</h2>
            <p className="text-fase-black mb-6">{t('overview.benefits_intro')}</p>
            
            <div className="space-y-4">
              {/* Unique access to a pan-European MGA community */}
              <details className="group border border-gray-200 rounded-lg">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-fase-navy">{t('overview.community.title')}</h3>
                  <svg className="w-5 h-5 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <p className="text-fase-black mb-4">
                    {t('overview.community.description_1')}
                  </p>
                  <p className="text-fase-black">
                    {t('overview.community.description_2')}
                  </p>
                </div>
              </details>

              {/* Brand endorsement */}
              <details className="group border border-gray-200 rounded-lg">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-fase-navy">{t('overview.brand.title')}</h3>
                  <svg className="w-5 h-5 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <p className="text-fase-black mb-4">
                    {t('overview.brand.description_1')}
                  </p>
                  <p className="text-fase-black">
                    {t('overview.brand.description_2')}
                  </p>
                </div>
              </details>

              {/* Capacity and distribution matching */}
              <details className="group border border-gray-200 rounded-lg">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-fase-navy">{t('overview.matching.title')}</h3>
                  <svg className="w-5 h-5 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <p className="text-fase-black mb-4">
                    {t('overview.matching.description_1')}
                  </p>
                  <p className="text-fase-black font-medium">
                    {t('overview.matching.description_2')}
                  </p>
                </div>
              </details>

              {/* Data and insights - with sub-sections */}
              <details className="group border border-gray-200 rounded-lg">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-fase-navy">{t('overview.data.title')}</h3>
                  <svg className="w-5 h-5 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <p className="text-fase-black mb-4">
                    {t('overview.data.description')}
                  </p>
                  
                  <div className="space-y-3 ml-4">
                    {/* Regulatory analysis */}
                    <details className="group border border-gray-100 rounded-lg">
                      <summary className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-25 rounded-lg">
                        <h4 className="font-medium text-fase-navy">{t('overview.data.regulatory.title')}</h4>
                        <svg className="w-4 h-4 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="p-3 pt-0 border-t border-gray-50">
                        <p className="text-sm text-fase-black mb-3">
                          {t('overview.data.regulatory.description_1')}
                        </p>
                        <p className="text-sm text-fase-black">
                          {t('overview.data.regulatory.description_2')}
                        </p>
                      </div>
                    </details>

                    {/* Annual market report */}
                    <details className="group border border-gray-100 rounded-lg">
                      <summary className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-25 rounded-lg">
                        <h4 className="font-medium text-fase-navy">{t('overview.data.report.title')}</h4>
                        <svg className="w-4 h-4 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="p-3 pt-0 border-t border-gray-50">
                        <p className="text-sm text-fase-black">
                          {t('overview.data.report.description')}
                        </p>
                      </div>
                    </details>

                    {/* Webinar archive */}
                    <details className="group border border-gray-100 rounded-lg">
                      <summary className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-25 rounded-lg">
                        <h4 className="font-medium text-fase-navy">{t('overview.data.webinars.title')}</h4>
                        <svg className="w-4 h-4 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="p-3 pt-0 border-t border-gray-50">
                        <p className="text-sm text-fase-black">
                          {t('overview.data.webinars.description')}
                        </p>
                      </div>
                    </details>
                  </div>
                </div>
              </details>

              {/* Relationship building */}
              <details className="group border border-gray-200 rounded-lg">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-fase-navy">{t('overview.relationships.title')}</h3>
                  <svg className="w-5 h-5 text-fase-navy group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="p-4 pt-0 border-t border-gray-100">
                  <p className="text-fase-black mb-4">
                    {t('overview.relationships.description_1')}
                  </p>
                  <p className="text-fase-black mb-4">
                    {t('overview.relationships.description_2')}
                  </p>
                  <p className="text-fase-black mb-4">
                    {t('overview.relationships.description_3')}
                  </p>
                  <p className="text-fase-black">
                    {t('overview.relationships.description_4')}
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'messages',
      title: t('sections.messages'),
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
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('messages.no_messages')}</h3>
              <p className="text-fase-black">{t('messages.no_messages_desc')}</p>
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
                        {t(`messages.priority.${message.priority}`)}
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
                    {t('messages.from')}: {message.senderName} ({message.senderEmail})
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {!message.isRead && (
                        <button
                          onClick={() => handleMarkMessageAsRead(message.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          {t('messages.mark_read')}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      {t('messages.delete')}
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
      title: t('sections.alerts'),
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
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{t('alerts.no_alerts')}</h3>
              <p className="text-fase-black">{t('alerts.no_alerts_desc')}</p>
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
                        {t(`alerts.priority.${alert.priority}`)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        alert.type === 'error' ? 'bg-red-100 text-red-800' :
                        alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        alert.type === 'success' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {t(`alerts.types.${alert.type}`)}
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
                          {t('alerts.mark_read')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDismissAlert(alert.id)}
                        className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                      >
                        {t('alerts.dismiss')}
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
      title: t('sections.profile'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          {/* Account Settings */}
          <div className="bg-white border border-fase-light-gold rounded-lg p-6">
            <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">{t('profile.account_settings')}</h3>
            
            {/* Account Information */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-1">{t('profile.personal_name')}</label>
                {editingProfile ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                      placeholder={t('profile.enter_name_placeholder')}
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        variant="primary"
                        size="small"
                      >
                        {savingProfile ? t('profile.saving') : t('profile.save')}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="secondary"
                        size="small"
                      >
                        {t('profile.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-fase-black">
                      {member?.personalName || user?.displayName || t('profile.not_set')}
                    </div>
                    <Button
                      onClick={handleEditProfile}
                      variant="secondary"
                      size="small"
                      className="ml-3"
                    >
                      {t('profile.edit')}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Show company name separately for corporate members */}
              {member?.membershipType === 'corporate' && member?.organizationName && (
                <div>
                  <label className="block text-sm font-medium text-fase-navy mb-1">{t('profile.company')}</label>
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-fase-black">
                    {member.organizationName}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t('profile.company_change_note')}</p>
                </div>
              )}
            </div>

            {/* Password Reset */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">{t('profile.security')}</h4>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('profile.password')}</span>
                  <p className="text-xs text-gray-500">{t('profile.password_desc')}</p>
                </div>
                <div className="flex items-center space-x-3">
                  {passwordResetSent && (
                    <span className="text-sm text-green-600 font-medium">{t('profile.reset_email_sent')}</span>
                  )}
                  <Button
                    onClick={handlePasswordReset}
                    disabled={sendingPasswordReset}
                    variant="secondary"
                    size="small"
                  >
                    {sendingPasswordReset ? t('profile.sending') : t('profile.reset_password')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Company Management (if applicable) */}
          <ManageProfile />
        </div>
      )
    }
  ];

  // Construct title with personal name and company name (if applicable)
  const getWelcomeTitle = () => {
    if (!user?.displayName && !member?.personalName) {
      return t('portal.welcome_title');
    }
    
    const personalName = member?.personalName || user?.displayName || "";
    const companyName = member?.organizationName;
    
    if (personalName && companyName && member?.membershipType === 'corporate') {
      return t('portal.welcome_company', { name: personalName, company: companyName });
    } else if (personalName) {
      return t('portal.welcome_personal', { name: personalName });
    } else {
      return t('portal.welcome_title');
    }
  };

  return (
    <DashboardLayout
      title={getWelcomeTitle()}
      subtitle={user?.email || t('portal.email_subtitle')}
      bannerImage="/education.jpg"
      bannerImageAlt={t('manage_profile.business_meeting_alt')}
      sections={dashboardSections}
      currentPage="member-portal"
      statusBadge={statusBadge}
      defaultActiveSection="overview"
    />
  );
}