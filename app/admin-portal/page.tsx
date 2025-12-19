'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';
import { 
  getUserAlerts, 
  markAlertAsRead, 
  dismissAlert, 
  createAlert 
} from '../../lib/unified-messaging';
import { 
  searchMembersByOrganizationName, 
  getUserIdsForMemberCriteria, 
  UnifiedMember, 
  getAccountsByStatus, 
  updateMemberStatus 
} from '../../lib/unified-member';
import type { Alert, UserAlert } from '../../lib/unified-messaging';
import { AdminActions } from '../../lib/admin-actions';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

// Import modular tab components
import MembersTab from './components/MembersTab';
import AlertsTab from './components/AlertsTab';
import EmailsTab from './components/EmailsTab';
import InvoicesTab from './components/InvoicesTab';
import WebsiteUpdateTab from './components/WebsiteUpdateTab';
import TempAccountTab from './components/TempAccountTab';
import AuditLogTab from './components/AuditLogTab';
import SponsorsTab from './components/SponsorsTab';
import BioReviewTab from './components/BioReviewTab';

// Simple markdown renderer for alert content
function renderMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br>');
}

export default function AdminPortalPage() {
  const { user, member, loading: authLoading, isAdmin } = useUnifiedAuth();
  const router = useRouter();

  // State for data - now loaded lazily per tab
  const [memberApplications, setMemberApplications] = useState<UnifiedMember[]>([]);
  const [alerts, setAlerts] = useState<(Alert & UserAlert)[]>([]);
  
  // Track loading state per tab
  const [loading, setLoading] = useState({
    members: false,
    alerts: false,
  });
  
  // Track which data has been loaded
  const [dataLoaded, setDataLoaded] = useState({
    members: false,
    alerts: false,
  });
  
  const [activeSection, setActiveSection] = useState<string>('members');

  // Modal states
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  

  // Form states for modals
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    translations: {
      en: { title: '', message: '', actionText: '' },
      fr: { title: '', message: '', actionText: '' },
      de: { title: '', message: '', actionText: '' },
      es: { title: '', message: '', actionText: '' },
      it: { title: '', message: '', actionText: '' },
      nl: { title: '', message: '', actionText: '' }
    },
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

  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'fr' | 'de' | 'es' | 'it' | 'nl'>('en');


  const [organizationSearchResults, setOrganizationSearchResults] = useState<UnifiedMember[]>([]);

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/member-portal');
    }
  }, [user, isAdmin, authLoading, router]);


  const loadMembersData = useCallback(async () => {
    if (!user?.uid || !isAdmin || dataLoaded.members) return;

    try {
      setLoading(prev => ({ ...prev, members: true }));
      // Load all member data only when Members tab is accessed
      const [pendingAccounts, pendingInvoiceAccounts, approvedAccounts, adminAccounts, invoiceSentAccounts, flaggedAccounts] = await Promise.all([
        getAccountsByStatus('pending'),
        getAccountsByStatus('pending_invoice'),
        getAccountsByStatus('approved'),
        getAccountsByStatus('admin'),
        getAccountsByStatus('invoice_sent'),
        getAccountsByStatus('flagged')
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
      setDataLoaded(prev => ({ ...prev, members: true }));
    } catch (error) {
      console.error('Error loading members data:', error);
    } finally {
      setLoading(prev => ({ ...prev, members: false }));
    }
  }, [user?.uid, isAdmin, dataLoaded.members]);


  const loadAlertsData = useCallback(async () => {
    if (!user?.uid || !isAdmin || dataLoaded.alerts) return;

    try {
      setLoading(prev => ({ ...prev, alerts: true }));
      const alertsData = await getUserAlerts(user.uid);
      setAlerts(alertsData);
      setDataLoaded(prev => ({ ...prev, alerts: true }));
    } catch (error) {
      console.error('Error loading alerts data:', error);
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  }, [user?.uid, isAdmin, dataLoaded.alerts]);


  // Load data based on active section
  useEffect(() => {
    switch (activeSection) {
      case 'members':
        loadMembersData();
        break;
      case 'alerts':
        loadAlertsData();
        break;
    }
  }, [activeSection, loadMembersData, loadAlertsData]);

  // Load members data on initial load
  useEffect(() => {
    if (user?.uid && isAdmin) {
      loadMembersData();
    }
  }, [user?.uid, isAdmin, loadMembersData]);

  // Status badge for header
  const statusBadge = () => {
    const pendingCount = memberApplications.filter(m => m.status === 'pending').length;
    
    if (pendingCount > 0) {
      return (
        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm font-medium">
          {pendingCount} Pending
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

  // Clear selected account when switching away from emails
  const handleActiveSectionChange = (section: string) => {
    if (section !== 'emails') {
      setSelectedAccount(null);
    }
    setActiveSection(section);
  };

  const handleMemberStatusUpdate = async (memberId: string, newStatus: UnifiedMember['status'], adminNotes?: string) => {
    try {
      // Get current member data for audit logging
      const currentMember = memberApplications.find(m => m.id === memberId);
      if (!currentMember) {
        throw new Error('Member not found');
      }

      // Optimistic update - update UI immediately
      setMemberApplications(prev => 
        prev.map(member => 
          member.id === memberId 
            ? { ...member, status: newStatus, updatedAt: new Date() }
            : member
        )
      );

      // Update with audit logging
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      await AdminActions.updateMemberStatus({
        adminUserId: user.uid,
        adminUserEmail: user.email || 'Unknown',
        memberAccountId: memberId,
        memberEmail: currentMember.email,
        organizationName: currentMember.organizationName,
        oldStatus: currentMember.status,
        newStatus: newStatus,
        reason: adminNotes || 'Admin status update',
        updateFunction: async () => {
          return updateMemberStatus(memberId, newStatus);
        }
      });
      
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
        // As last resort, reload members data
        setDataLoaded(prev => ({ ...prev, members: false }));
        await loadMembersData();
      }
    }
  };

  const handleCreateAlert = async () => {
    if (!user?.uid) return;

    try {
      let userIds: string[] = [];

      if (alertForm.targetAudience === 'specific_members') {
        // Remove duplicates from selected organizations
        userIds = Array.from(new Set(alertForm.selectedOrganizations));
      } else if (alertForm.targetAudience === 'member_type') {
        const memberIds = await getUserIdsForMemberCriteria({ 
          organizationType: alertForm.organizationType || undefined 
        });
        // Remove duplicates from member criteria results
        userIds = Array.from(new Set(memberIds));
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

      // Create alerts for each language that has content
      for (const [locale, translation] of Object.entries(alertForm.translations)) {
        if (translation.title && translation.message) {
          const alertData: any = {
            title: translation.title,
            message: translation.message,
            type: alertForm.type,
            priority: alertForm.priority,
            targetAudience: mappedTargetAudience,
            actionRequired: alertForm.actionRequired,
            createdBy: user.uid,
            isActive: true,
            locale: locale as 'en' | 'fr' | 'de' | 'es' | 'it' | 'nl'
          };

          // Only add optional fields if they have values
          if (userIds.length > 0) {
            alertData.targetUsers = userIds;
          }
          if (alertForm.organizationType) {
            alertData.organizationType = alertForm.organizationType;
          }
          if (alertForm.actionUrl) {
            alertData.actionUrl = alertForm.actionUrl;
          }
          if (translation.actionText) {
            alertData.actionText = translation.actionText;
          }
          if (alertForm.expiresAt) {
            alertData.expiresAt = new Date(alertForm.expiresAt);
          }

          await createAlert(alertData);
        }
      }

      // Reset form
      setAlertForm({
        title: '',
        message: '',
        translations: {
          en: { title: '', message: '', actionText: '' },
          fr: { title: '', message: '', actionText: '' },
          de: { title: '', message: '', actionText: '' },
          es: { title: '', message: '', actionText: '' },
          it: { title: '', message: '', actionText: '' },
          nl: { title: '', message: '', actionText: '' }
        },
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
      setCurrentLanguage('en');

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



  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy"></div>
      </div>
    );
  }

  // Redirect non-admins
  if (!isAdmin) {
    return null; // useEffect will handle redirect
  }

  // Dashboard sections using modular components
  const dashboardSections = [
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
          loading={loading.members}
          onEmailFormOpen={handleEmailFormOpen}
          onStatusUpdate={handleMemberStatusUpdate}
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
          {alerts.filter(a => !a.isRead).length > 0 && (
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
          pendingJoinRequests={[]}
          loading={loading.alerts}
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
      id: 'emails',
      title: 'Emails',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      content: <EmailsTab prefilledData={selectedAccount} />
    },
    {
      id: 'bio-reviews',
      title: 'Bio Reviews',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      content: <BioReviewTab />
    },
    {
      id: 'invoices',
      title: 'Invoices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      content: <InvoicesTab />
    },
    {
      id: 'website-update',
      title: 'Website Update',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 0l-3-3m3 3l3-3" />
        </svg>
      ),
      content: (
        <WebsiteUpdateTab
          memberApplications={memberApplications}
          loading={loading.members}
        />
      )
    },
    {
      id: 'temp-accounts',
      title: 'Directory Entries',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      content: <TempAccountTab />
    },
    {
      id: 'audit',
      title: 'Audit Log',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      content: <AuditLogTab />
    },
    {
      id: 'sponsors',
      title: 'Sponsors',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0h3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      content: <SponsorsTab />
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
        onActiveSectionChange={handleActiveSectionChange}
        defaultActiveSection="members"
      />

      {/* Create Alert Modal */}
      <Modal 
        isOpen={showCreateAlert} 
        onClose={() => setShowCreateAlert(false)} 
        title="Create New Alert"
        maxWidth="xl"
      >
        <div className="space-y-6">
          {/* Basic Alert Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Title *
              </label>
              <input
                type="text"
                value={alertForm.translations.en.title}
                onChange={(e) => setAlertForm(prev => ({
                  ...prev,
                  translations: {
                    ...prev.translations,
                    en: {
                      ...prev.translations.en,
                      title: e.target.value
                    }
                  }
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="Alert title"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Type
              </label>
              <select
                value={alertForm.type}
                onChange={(e) => setAlertForm(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={alertForm.priority}
                onChange={(e) => setAlertForm(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <select
                value={alertForm.targetAudience}
                onChange={(e) => setAlertForm(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value="members">All Members</option>
                <option value="admins">Admins Only</option>
                <option value="member_type">By Organization Type</option>
                <option value="specific_members">Specific Organizations</option>
              </select>
            </div>
          </div>

          {/* Organization Type Filter */}
          {alertForm.targetAudience === 'member_type' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Type
              </label>
              <select
                value={alertForm.organizationType}
                onChange={(e) => setAlertForm(prev => ({ ...prev, organizationType: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              >
                <option value="">Select Type</option>
                <option value="MGA">MGA</option>
                <option value="carrier">Carrier</option>
                <option value="provider">Provider</option>
              </select>
            </div>
          )}

          {/* Specific Organizations Selection */}
          {alertForm.targetAudience === 'specific_members' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search and Select Organizations
              </label>
              <input
                type="text"
                value={alertForm.organizationSearch}
                onChange={(e) => {
                  const searchValue = e.target.value;
                  setAlertForm(prev => ({ ...prev, organizationSearch: searchValue }));
                  
                  // Search within existing memberApplications data
                  if (searchValue.length >= 1) {
                    // Get unique organizations from memberApplications
                    const uniqueOrgs = memberApplications
                      .filter(member => 
                        member.organizationName?.toLowerCase().includes(searchValue.toLowerCase())
                      )
                      .filter((org, index, self) => 
                        index === self.findIndex(o => o.organizationName === org.organizationName)
                      )
                      .slice(0, 10); // Limit to 10 results for performance
                    setOrganizationSearchResults(uniqueOrgs);
                  } else {
                    setOrganizationSearchResults([]);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                placeholder="Type organization name to search..."
              />
              
              {/* Search Results */}
              {organizationSearchResults.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
                  {organizationSearchResults.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => {
                        // Get all member IDs from this organization
                        const orgMemberIds = memberApplications
                          .filter(m => m.organizationName === org.organizationName)
                          .map(m => m.id);
                        
                        // Check if any members from this org are already selected
                        const alreadySelected = orgMemberIds.some(id => 
                          alertForm.selectedOrganizations.includes(id)
                        );
                        
                        if (!alreadySelected) {
                          setAlertForm(prev => ({
                            ...prev,
                            selectedOrganizations: [...prev.selectedOrganizations, ...orgMemberIds],
                            organizationSearch: ''
                          }));
                          setOrganizationSearchResults([]);
                        }
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      {org.organizationName}
                      <span className="text-gray-500 ml-2">({memberApplications.filter(m => m.organizationName === org.organizationName).length} members)</span>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Selected Organizations */}
              {alertForm.selectedOrganizations.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Organizations ({(() => {
                      const uniqueOrgNames = new Set(
                        alertForm.selectedOrganizations
                          .map(orgId => memberApplications.find(m => m.id === orgId)?.organizationName)
                          .filter(Boolean)
                      );
                      return uniqueOrgNames.size;
                    })()} organizations):
                  </p>
                  <div className="space-y-1">
                    {(() => {
                      // Get unique organizations by name
                      const selectedOrgs = alertForm.selectedOrganizations
                        .map(orgId => memberApplications.find(m => m.id === orgId))
                        .filter((org): org is UnifiedMember => org !== undefined) // Remove any undefined results
                        .filter((org, index, self) => 
                          index === self.findIndex(o => o?.organizationName === org.organizationName)
                        );
                      
                      return selectedOrgs.map((org) => (
                        <div key={org.id} className="flex items-center justify-between bg-gray-50 px-3 py-1 rounded">
                          <span className="text-sm">
                            {org.organizationName}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              // Remove all members from this organization
                              const orgMemberIds = memberApplications
                                .filter(m => m.organizationName === org.organizationName)
                                .map(m => m.id);
                              setAlertForm(prev => ({
                                ...prev,
                                selectedOrganizations: prev.selectedOrganizations.filter(id => !orgMemberIds.includes(id))
                              }));
                            }}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alert Message with Markdown Editor */}
          <div>
            {/* Language Tabs for Text Content */}
            <div className="mb-4">
              <div className="flex space-x-1 border-b border-gray-200">
                {Object.entries({
                  en: 'English',
                  fr: 'Français', 
                  de: 'Deutsch',
                  es: 'Español',
                  it: 'Italiano',
                  nl: 'Nederlands'
                }).map(([locale, name]) => (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => setCurrentLanguage(locale as any)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                      currentLanguage === locale
                        ? 'bg-fase-navy text-white border-b-2 border-fase-navy'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {name}
                    {alertForm.translations[locale as keyof typeof alertForm.translations]?.title && (
                      <span className="ml-1 text-green-400">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Title ({currentLanguage === 'en' ? 'English *' : Object.entries({
                fr: 'Français', 
                de: 'Deutsch',
                es: 'Español',
                it: 'Italiano',
                nl: 'Nederlands'
              }).find(([code]) => code === currentLanguage)?.[1] || currentLanguage.toUpperCase()})
            </label>
            <input
              type="text"
              value={alertForm.translations[currentLanguage].title}
              onChange={(e) => setAlertForm(prev => ({
                ...prev,
                translations: {
                  ...prev.translations,
                  [currentLanguage]: {
                    ...prev.translations[currentLanguage],
                    title: e.target.value
                  }
                }
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder={`Alert title (${currentLanguage.toUpperCase()})`}
              required={currentLanguage === 'en'}
            />

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Message ({currentLanguage === 'en' ? 'English *' : Object.entries({
                fr: 'Français', 
                de: 'Deutsch',
                es: 'Español',
                it: 'Italiano',
                nl: 'Nederlands'
              }).find(([code]) => code === currentLanguage)?.[1] || currentLanguage.toUpperCase()})
            </label>
            
            {/* Markdown Toolbar */}
            <div className="border border-gray-300 rounded-t-lg bg-gray-50 px-3 py-2 flex gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const textarea = document.querySelector('textarea[data-markdown-editor]') as HTMLTextAreaElement;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = textarea.value.substring(start, end) || 'bold text';
                    const newText = textarea.value.substring(0, start) + `**${selectedText}**` + textarea.value.substring(end);
                    setAlertForm(prev => ({
                      ...prev,
                      translations: {
                        ...prev.translations,
                        [currentLanguage]: {
                          ...prev.translations[currentLanguage],
                          message: newText
                        }
                      }
                    }));
                  }
                }}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                title="Bold"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => {
                  const textarea = document.querySelector('textarea[data-markdown-editor]') as HTMLTextAreaElement;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = textarea.value.substring(start, end) || 'italic text';
                    const newText = textarea.value.substring(0, start) + `*${selectedText}*` + textarea.value.substring(end);
                    setAlertForm(prev => ({
                      ...prev,
                      translations: {
                        ...prev.translations,
                        [currentLanguage]: {
                          ...prev.translations[currentLanguage],
                          message: newText
                        }
                      }
                    }));
                  }
                }}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                title="Italic"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => {
                  const textarea = document.querySelector('textarea[data-markdown-editor]') as HTMLTextAreaElement;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const selectedText = textarea.value.substring(start, end) || 'code';
                    const newText = textarea.value.substring(0, start) + `\`${selectedText}\`` + textarea.value.substring(end);
                    setAlertForm(prev => ({
                      ...prev,
                      translations: {
                        ...prev.translations,
                        [currentLanguage]: {
                          ...prev.translations[currentLanguage],
                          message: newText
                        }
                      }
                    }));
                  }
                }}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 font-mono"
                title="Code"
              >
                {'</>'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const linkText = prompt('Link text:') || 'link text';
                  const linkUrl = prompt('URL:') || 'https://example.com';
                  const textarea = document.querySelector('textarea[data-markdown-editor]') as HTMLTextAreaElement;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const newText = textarea.value.substring(0, start) + `[${linkText}](${linkUrl})` + textarea.value.substring(start);
                    setAlertForm(prev => ({
                      ...prev,
                      translations: {
                        ...prev.translations,
                        [currentLanguage]: {
                          ...prev.translations[currentLanguage],
                          message: newText
                        }
                      }
                    }));
                  }
                }}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                title="Link"
              >
                🔗
              </button>
              <button
                type="button"
                onClick={() => {
                  const textarea = document.querySelector('textarea[data-markdown-editor]') as HTMLTextAreaElement;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const newText = textarea.value.substring(0, start) + '- List item\n' + textarea.value.substring(start);
                    setAlertForm(prev => ({
                      ...prev,
                      translations: {
                        ...prev.translations,
                        [currentLanguage]: {
                          ...prev.translations[currentLanguage],
                          message: newText
                        }
                      }
                    }));
                  }
                }}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                title="Bullet List"
              >
                • List
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Editor */}
              <div>
                <textarea
                  data-markdown-editor
                  value={alertForm.translations[currentLanguage].message}
                  onChange={(e) => setAlertForm(prev => ({
                    ...prev,
                    translations: {
                      ...prev.translations,
                      [currentLanguage]: {
                        ...prev.translations[currentLanguage],
                        message: e.target.value
                      }
                    }
                  }))}
                  rows={6}
                  className="w-full border border-gray-300 border-t-0 rounded-b-lg rounded-tr-none px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder={`Write your alert message here (${currentLanguage.toUpperCase()})...`}
                  required={currentLanguage === 'en'}
                />
              </div>
              
              {/* Preview */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Preview:</div>
                <div 
                  className="border border-gray-300 rounded-lg px-3 py-2 min-h-[6rem] bg-gray-50 text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: alertForm.translations[currentLanguage].message ? renderMarkdown(alertForm.translations[currentLanguage].message) : '<span class="text-gray-400">Preview will appear here...</span>' 
                  }}
                />
              </div>
            </div>

            {/* Action Button Text (Language-specific) */}
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action Button Text ({currentLanguage === 'en' ? 'English' : Object.entries({
                fr: 'Français', 
                de: 'Deutsch',
                es: 'Español',
                it: 'Italiano',
                nl: 'Nederlands'
              }).find(([code]) => code === currentLanguage)?.[1] || currentLanguage.toUpperCase()}) - Optional
            </label>
            <input
              type="text"
              value={alertForm.translations[currentLanguage].actionText}
              onChange={(e) => setAlertForm(prev => ({
                ...prev,
                translations: {
                  ...prev.translations,
                  [currentLanguage]: {
                    ...prev.translations[currentLanguage],
                    actionText: e.target.value
                  }
                }
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
              placeholder={`Button text (${currentLanguage.toUpperCase()}) - only if you want an action button`}
            />
          </div>

          {/* Action Button Settings */}
          <div className="border-t pt-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="actionRequired"
                checked={alertForm.actionRequired}
                onChange={(e) => setAlertForm(prev => ({ ...prev, actionRequired: e.target.checked }))}
                className="h-4 w-4 text-fase-navy focus:ring-fase-navy border-gray-300 rounded"
              />
              <label htmlFor="actionRequired" className="ml-2 text-sm text-gray-700">
                Include action button
              </label>
            </div>

            {alertForm.actionRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action URL *
                </label>
                <input
                  type="url"
                  value={alertForm.actionUrl}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, actionUrl: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                  placeholder="https://example.com"
                  required
                />
              </div>
            )}
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expires At (Optional)
            </label>
            <input
              type="datetime-local"
              value={alertForm.expiresAt}
              onChange={(e) => setAlertForm(prev => ({ ...prev, expiresAt: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fase-navy focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowCreateAlert(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleCreateAlert}
              disabled={!alertForm.translations.en.title || !alertForm.translations.en.message}
            >
              Create Alert
            </Button>
          </div>
        </div>
      </Modal>


    </>
  );
}