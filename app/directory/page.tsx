'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';
import { useUnifiedAdmin } from '../../hooks/useUnifiedAdmin';
import { UnifiedMember } from '../../lib/unified-member';
import { getApprovedMembersForDirectory } from '../../lib/unified-member';
import { getUserAlerts, getUserMessages, markAlertAsRead, dismissAlert, markMessageAsRead, deleteMessageForUser, Alert, UserAlert, Message, UserMessage } from '../../lib/unified-messaging';


const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const formatOrganizationType = (type: string) => {
  switch (type.toLowerCase()) {
    case 'mga':
      return 'MGA';
    case 'service_provider':
    case 'provider':
      return 'Service Provider';
    case 'carrier':
      return 'Carrier';
    default:
      return type;
  }
};

export default function DirectoryPage() {
  const { user, member, loading: authLoading, isAdmin, hasMemberAccess } = useUnifiedAuth();
  const adminLoading = false; // No longer needed with unified auth
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [memberApplications, setMemberApplications] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<(Alert & UserAlert)[]>([]);
  const [messages, setMessages] = useState<(Message & UserMessage)[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // Check user access
  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Use unified member access
      setHasAccess(hasMemberAccess);
      
      if (!hasMemberAccess) {
        // Check if user has a pending application (member.status === 'pending')
        if (member && member.status === 'pending') {
          setMemberApplications([member]); // Show as application under review
        }
        setShowAccessModal(true);
      }
      
      setCheckingAccess(false);
    };

    checkAccess();
  }, [user, authLoading, hasMemberAccess, router]);

  // Fetch real member data
  useEffect(() => {
    const fetchMembers = async () => {
      if (!hasAccess) return;
      
      try {
        setLoading(true);
        const approvedMembers = await getApprovedMembersForDirectory();
        setMembers(approvedMembers);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [hasAccess]);

  // Load alerts and messages
  useEffect(() => {
    const loadData = async () => {
      if (!user || !hasAccess) return;
      
      try {
        setLoadingAlerts(true);
        setLoadingMessages(true);
        
        const [userAlerts, userMessages] = await Promise.all([
          getUserAlerts(user.uid),
          getUserMessages(user.uid)
        ]);
        
        setAlerts(userAlerts);
        setMessages(userMessages);
      } catch (error) {
        console.error('Error loading alerts/messages:', error);
      } finally {
        setLoadingAlerts(false);
        setLoadingMessages(false);
      }
    };

    loadData();
  }, [user, hasAccess]);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || member.organizationType.toLowerCase() === selectedType.toLowerCase();
    return matchesSearch && matchesType;
  });

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

  // Get active alert/message counts
  const unreadAlerts = alerts.filter(alert => !alert.isRead);
  const unreadMessages = messages.filter(message => !message.isRead);

  // Show loading while checking access
  if (authLoading || adminLoading || checkingAccess) {
    return (
      <DashboardLayout
        title="Member Directory"
        subtitle="Connect with FASE members across Europe"
        bannerImage="/market.jpg"
        bannerImageAlt="Market Overview"
        sections={[{
          id: 'loading',
          title: 'Loading',
          icon: <div className="w-5 h-5 bg-gray-300 rounded animate-pulse"></div>,
          content: (
            <div className="text-center py-20">
              <div className="animate-pulse">
                <div className="h-8 bg-fase-cream rounded w-1/3 mx-auto mb-4"></div>
                <div className="h-4 bg-fase-cream rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          )
        }]}
        currentPage="directory"
        defaultActiveSection="loading"
      />
    );
  }

  // Status badge
  const statusBadge = (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center space-x-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="text-blue-800 font-medium">Directory Access</span>
      </div>
    </div>
  );

  // Dashboard sections
  const dashboardSections = [
    {
      id: 'directory',
      title: 'Directory',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-fase-light-gold p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-fase-navy mb-2">
                  Search Members
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search by organization name or country..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                />
              </div>

              {/* Type Filter */}
              <div className="md:w-64">
                <label htmlFor="type" className="block text-sm font-medium text-fase-navy mb-2">
                  Member Type
                </label>
                <select
                  id="type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="mga">MGAs</option>
                  <option value="provider">Service Providers</option>
                  <option value="carrier">Carriers</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </div>
            ) : (
              <p className="text-fase-black">
                Showing {filteredMembers.length} of {members.length} members
              </p>
            )}
          </div>

          {/* Member Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg border border-fase-light-gold p-6 animate-pulse">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-lg border border-fase-light-gold hover:border-fase-navy transition-colors duration-200 p-6 hover:shadow-lg"
                >
                  {/* Logo Section */}
                  <div className="flex items-center justify-center mb-4">
                    {member.logoURL ? (
                      <img
                        src={member.logoURL}
                        alt={`${member.organizationName} logo`}
                        className="w-16 h-16 object-contain"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-fase-light-blue rounded-lg flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {getInitials(member.organizationName)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Organization Info */}
                  <div className="text-center">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2 line-clamp-2">
                      {member.organizationName}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-fase-black">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="inline-block w-2 h-2 bg-fase-orange rounded-full"></span>
                        <span>{formatOrganizationType(member.organizationType)}</span>
                      </div>
                      
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4 text-fase-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{member.country}</span>
                      </div>
                      
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-4 h-4 text-fase-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Member since {member.memberSince}</span>
                      </div>
                    </div>

                    {/* Lines of Business */}
                    {member.productLines?.lines && member.productLines.lines.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-fase-navy font-medium mb-1">Lines of Business</div>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {member.productLines.lines.slice(0, 3).map((line: string, index: number) => (
                            <span
                              key={index}
                              className="inline-block bg-fase-cream text-fase-navy text-xs px-2 py-1 rounded"
                            >
                              {line}
                            </span>
                          ))}
                          {member.linesOfBusiness.length > 3 && (
                            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                              +{member.linesOfBusiness.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Website Link */}
                    {member.website && (
                      <div className="mt-4">
                        <a
                          href={member.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-fase-navy hover:text-fase-black transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">No members found</h3>
              <p className="text-fase-black">Try adjusting your search criteria or filters.</p>
            </div>
          )}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
          </svg>
          {(unreadAlerts.length > 0 || (user && !user.emailVerified)) && (
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
    }
  ];

  return (
    <>
      <DashboardLayout
        title="Member Directory"
        subtitle="Connect with FASE members across Europe"
        bannerImage="/market.jpg"
        bannerImageAlt="Market Overview"
        sections={dashboardSections}
        currentPage="directory"
        statusBadge={statusBadge}
        defaultActiveSection="directory"
      />

      {/* Access Denied Modal */}
      <Modal 
        isOpen={showAccessModal} 
        onClose={() => {}} 
        title="Member Directory Access"
        maxWidth="lg"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-fase-orange rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 1 1 8 0c0 1.027-.077 2.017-.225 2.965M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">
              Active Membership Required
            </h3>
            <p className="text-fase-black mb-4">
              The Member Directory is exclusively available to approved FASE members.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  {memberApplications.length > 0 ? 'Application Under Review' : 'Get Started Today'}
                </h4>
                <p className="text-sm text-blue-700">
                  {memberApplications.length > 0 
                    ? 'Your membership application is being reviewed. Once approved, you&apos;ll have full access to our member directory and can connect with FASE members across Europe.'
                    : 'Join FASE to access our comprehensive member directory, connect with industry professionals, and unlock exclusive member benefits.'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="secondary" 
              size="medium"
              className="flex-1"
              onClick={() => router.push('/member-portal')}
            >
              Return to Member Portal
            </Button>
            {memberApplications.length === 0 && (
              <Button 
                variant="primary" 
                size="medium"
                className="flex-1"
                onClick={() => router.push('/register')}
              >
                Apply for Membership
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}