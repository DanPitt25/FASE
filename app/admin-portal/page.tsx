'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';
import {
  UnifiedMember,
  getAccountsByStatus,
  updateMemberStatus
} from '../../lib/unified-member';

// Import modular tab components
import MembersTab from './components/MembersTab';
import EmailsTab from './components/EmailsTab';
import InvoicesTab from './components/InvoicesTab';
import TempAccountTab from './components/TempAccountTab';
import SponsorsTab from './components/SponsorsTab';
import BioReviewTab from './components/BioReviewTab';
import RendezvousTab from './components/RendezvousTab';
import TasksTab from './components/TasksTab';
import ReportsTab from './components/ReportsTab';


export default function AdminPortalPage() {
  const { user, loading: authLoading, isAdmin } = useUnifiedAuth();
  const router = useRouter();

  // State for data - loaded lazily
  const [memberApplications, setMemberApplications] = useState<UnifiedMember[]>([]);

  // Track loading state
  const [loading, setLoading] = useState({
    members: false,
  });

  // Track which data has been loaded
  const [dataLoaded, setDataLoaded] = useState({
    members: false,
  });

  const [activeSection, setActiveSection] = useState<string>('tasks');

  // State for email prefill
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


  // Load data based on active section
  useEffect(() => {
    if (activeSection === 'members') {
      loadMembersData();
    }
  }, [activeSection, loadMembersData]);

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
  const handleEmailFormOpen = async (account: any) => {
    // Fetch rendezvous registration for this account if it exists
    try {
      const response = await fetch('/api/admin/rendezvous-registrations');
      if (response.ok) {
        const data = await response.json();
        const accountRegistration = data.registrations?.find(
          (reg: any) => reg.accountId === account.id
        );

        if (accountRegistration) {
          // Map to the format expected by the invoice email
          account.rendezvousPassReservation = {
            reserved: true,
            passCount: accountRegistration.numberOfAttendees || 1,
            organizationType: accountRegistration.billingInfo?.organizationType || account.organizationType,
            passTotal: accountRegistration.totalPrice || 0,
            subtotal: accountRegistration.subtotal || 0,
            vatAmount: accountRegistration.vatAmount || 0,
            isAsaseMember: accountRegistration.isAsaseMember || false,
            attendees: accountRegistration.attendees || []
          };
        }
      }
    } catch (error) {
      console.error('Error fetching rendezvous registration:', error);
    }

    setSelectedAccount(account);
    setActiveSection('emails');
  };

  // Clear selected account when switching away from emails
  const handleActiveSectionChange = (section: string) => {
    if (section !== 'emails') {
      setSelectedAccount(null);
    }
    setActiveSection(section);
  };

  const handleMemberStatusUpdate = async (memberId: string, newStatus: UnifiedMember['status']) => {
    try {
      const currentMember = memberApplications.find(m => m.id === memberId);
      if (!currentMember) {
        throw new Error('Member not found');
      }

      // Optimistic update
      setMemberApplications(prev =>
        prev.map(member =>
          member.id === memberId
            ? { ...member, status: newStatus, updatedAt: new Date() }
            : member
        )
      );

      await updateMemberStatus(memberId, newStatus);
    } catch (error) {
      console.error('Error updating member status:', error);

      // On error, revert the optimistic update
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
        setDataLoaded(prev => ({ ...prev, members: false }));
        await loadMembersData();
      }
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
    return null;
  }

  // Dashboard sections
  const dashboardSections = [
    {
      id: 'tasks',
      title: 'Tasks',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      content: <TasksTab />
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
          loading={loading.members}
          onEmailFormOpen={handleEmailFormOpen}
          onStatusUpdate={handleMemberStatusUpdate}
          onMemberDeleted={(memberId) => {
            setMemberApplications(prev => prev.filter(m => m.id !== memberId));
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
      id: 'bio-reviews',
      title: 'Bio Reviews',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      content: <BioReviewTab />
    },
    {
      id: 'directory-entries',
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
    },
    {
      id: 'rendezvous',
      title: 'Rendezvous',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      content: <RendezvousTab />
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      content: <ReportsTab />
    }
  ];

  return (
    <DashboardLayout
      title="Admin Portal"
      bannerImage="/conferenceWood.jpg"
      bannerImageAlt="Corporate Management"
      sections={dashboardSections}
      currentPage="admin-portal"
      statusBadge={statusBadge()}
      activeSection={activeSection}
      onActiveSectionChange={handleActiveSectionChange}
      defaultActiveSection="tasks"
    />
  );
}
