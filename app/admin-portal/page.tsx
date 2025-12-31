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
import Button from '../../components/Button';
import Modal from '../../components/Modal';

// Import modular tab components
import MembersTab from './components/MembersTab';
import AlertsTab from './components/AlertsTab';
import EmailsTab from './components/EmailsTab';
import InvoicesTab from './components/InvoicesTab';
import WebsiteUpdateTab from './components/WebsiteUpdateTab';
import TempAccountTab from './components/TempAccountTab';
import SponsorsTab from './components/SponsorsTab';
import BioReviewTab from './components/BioReviewTab';
import CreateAlertModal from './components/CreateAlertModal';


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

      // Update member status
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
        // As last resort, reload members data
        setDataLoaded(prev => ({ ...prev, members: false }));
        await loadMembersData();
      }
    }
  };

  const handleCreateAlert = async (alertForm: any) => {
    if (!user?.uid) return;

    try {
      let userIds: string[] = [];
      let emailAddresses: string[] = [];

      if (alertForm.targetAudience === 'specific_members') {
        // Remove duplicates from selected organizations
        userIds = Array.from(new Set(alertForm.selectedOrganizations));
        // Get email addresses for selected organizations
        emailAddresses = memberApplications
          .filter(m => userIds.includes(m.id) && m.email)
          .map(m => m.email);
      } else if (alertForm.targetAudience === 'member_type') {
        const memberIds = await getUserIdsForMemberCriteria({ 
          organizationType: alertForm.organizationType || undefined 
        });
        // Remove duplicates from member criteria results
        userIds = Array.from(new Set(memberIds));
        // Get email addresses for member criteria
        emailAddresses = memberApplications
          .filter(m => userIds.includes(m.id) && m.email)
          .map(m => m.email);
      } else if (alertForm.targetAudience === 'all') {
        // Get all user emails
        emailAddresses = memberApplications
          .filter(m => m.email && m.status === 'approved')
          .map(m => m.email);
      } else if (alertForm.targetAudience === 'members') {
        // Get all non-admin member emails
        emailAddresses = memberApplications
          .filter(m => m.email && m.status === 'approved')
          .map(m => m.email);
      } else if (alertForm.targetAudience === 'admins') {
        // Get admin emails
        emailAddresses = memberApplications
          .filter(m => m.email && m.status === 'admin')
          .map(m => m.email);
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
        if ((translation as any).title && (translation as any).message) {
          const alertData: any = {
            title: (translation as any).title,
            message: (translation as any).message,
            type: alertForm.type,
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
          if ((translation as any).actionText) {
            alertData.actionText = (translation as any).actionText;
          }
          if (alertForm.expiresAt) {
            alertData.expiresAt = new Date(alertForm.expiresAt);
          }

          // Add emailSent flag if emails will be sent
          if (alertForm.sendEmail && emailAddresses.length > 0 && locale === 'en') {
            alertData.emailSent = true;
          }

          await createAlert(alertData);

          // Send email notifications if enabled
          if (alertForm.sendEmail && emailAddresses.length > 0 && locale === 'en') {
            try {
              const emailResponse = await fetch('/api/send-alert-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  emails: emailAddresses,
                  alertTitle: (translation as any).title,
                  alertMessage: (translation as any).message,
                  alertType: alertForm.type,
                  actionUrl: alertForm.actionUrl,
                  actionText: (translation as any).actionText,
                  userLocale: locale
                })
              });

              if (!emailResponse.ok) {
                console.error('Failed to send alert emails');
              }
            } catch (emailError) {
              console.error('Error sending alert emails:', emailError);
            }
          }
        }
      }


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

      <CreateAlertModal 
        isOpen={showCreateAlert}
        onClose={() => setShowCreateAlert(false)}
        onCreateAlert={handleCreateAlert}
        memberApplications={memberApplications}
      />
    </>
  );
}
