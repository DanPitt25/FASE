'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminConsoleDashboard, { ConsoleTileData } from '../../components/AdminConsoleDashboard';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';
import {
  UnifiedMember,
  getAccountsByStatus,
  updateMemberStatus
} from '../../lib/unified-member';
import { authFetch } from '../../lib/auth-fetch';

// Import tab components
import MembersTab from './components/MembersTab';
import RendezvousManageTab from './components/RendezvousManageTab';
import FinanceManageTab from './components/FinanceManageTab';
import ReportsTab from './components/ReportsTab';
import FreeformEmailTab from './components/FreeformEmailTab';
import InvoicesTab from './components/InvoicesTab';
import SponsorsTab from './components/SponsorsTab';
import BioReviewTab from './components/BioReviewTab';

// Error boundary and context providers
import { AdminErrorBoundary } from './components/AdminErrorBoundary';
import { EmailProvider, EmailToast } from '../../lib/contexts/EmailContext';
import { InvoiceProvider, useInvoice, InvoiceToast } from '../../lib/contexts/InvoiceContext';

// Icons for tiles
const MembersIcon = (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const RendezvousIcon = (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const FinanceIcon = (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ReportsIcon = (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const EmailIcon = (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const InvoicesIcon = (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SponsorsIcon = (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const BiosIcon = (
  <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// Inner component that uses InvoiceContext
function AdminPortalContent() {
  const { user, loading: authLoading, isAdmin } = useUnifiedAuth();
  const router = useRouter();
  const { setNavigateCallback } = useInvoice();

  // Handle navigation ready callback from AdminConsoleDashboard
  const handleNavigationReady = useCallback((navigate: (section: 'view' | 'manage', tileId: string) => void) => {
    setNavigateCallback(() => {
      navigate('view', 'invoices');
    });
  }, [setNavigateCallback]);

  // State for data
  const [memberApplications, setMemberApplications] = useState<UnifiedMember[]>([]);
  const [memberSuppressedIds, setMemberSuppressedIds] = useState<Set<string>>(new Set());

  // Track loading state
  const [loading, setLoading] = useState({
    members: false,
  });

  // Track which data has been loaded
  const [dataLoaded, setDataLoaded] = useState({
    members: false,
  });

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

      // Load members and suppression IDs in parallel
      const [
        pendingAccounts,
        pendingInvoiceAccounts,
        approvedAccounts,
        adminAccounts,
        invoiceSentAccounts,
        flaggedAccounts,
        internalAccounts,
        suppressionResponse
      ] = await Promise.all([
        getAccountsByStatus('pending'),
        getAccountsByStatus('pending_invoice'),
        getAccountsByStatus('approved'),
        getAccountsByStatus('admin'),
        getAccountsByStatus('invoice_sent'),
        getAccountsByStatus('flagged'),
        getAccountsByStatus('internal'),
        authFetch('/api/admin/members/suppress').then(r => r.json()).catch(() => ({ success: false }))
      ]);

      const membersData = [
        ...pendingAccounts,
        ...pendingInvoiceAccounts,
        ...approvedAccounts,
        ...adminAccounts,
        ...invoiceSentAccounts,
        ...flaggedAccounts,
        ...internalAccounts
      ];

      setMemberApplications(membersData);

      // Set suppressed IDs
      if (suppressionResponse.success && suppressionResponse.suppressedIds) {
        setMemberSuppressedIds(new Set(suppressionResponse.suppressedIds));
      }

      setDataLoaded(prev => ({ ...prev, members: true }));
    } catch (error) {
      console.error('Error loading members data:', error);
    } finally {
      setLoading(prev => ({ ...prev, members: false }));
    }
  }, [user?.uid, isAdmin, dataLoaded.members]);

  // Load members data on initial load
  useEffect(() => {
    if (user?.uid && isAdmin) {
      loadMembersData();
    }
  }, [user?.uid, isAdmin, loadMembersData]);

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

  // Calculate badge counts
  const pendingMembersCount = memberApplications.filter(m => m.status === 'pending').length;

  // Unified tile list (no VIEW/MANAGE separation)
  const tiles: ConsoleTileData[] = [
    {
      id: 'members',
      title: 'Members',
      icon: MembersIcon,
      badge: pendingMembersCount || undefined,
      content: (
        <AdminErrorBoundary tabName="Members">
          <MembersTab
            memberApplications={memberApplications}
            loading={loading.members}
            onStatusUpdate={handleMemberStatusUpdate}
            onMemberDeleted={(memberId) => {
              setMemberApplications(prev => prev.filter(m => m.id !== memberId));
            }}
            suppressedIds={memberSuppressedIds}
            onSuppressedIdsChange={setMemberSuppressedIds}
          />
        </AdminErrorBoundary>
      ),
    },
    {
      id: 'bios',
      title: 'Bios',
      icon: BiosIcon,
      content: (
        <AdminErrorBoundary tabName="Bios">
          <BioReviewTab />
        </AdminErrorBoundary>
      ),
    },
    {
      id: 'rendezvous',
      title: 'Rendezvous',
      icon: RendezvousIcon,
      content: (
        <AdminErrorBoundary tabName="Rendezvous">
          <RendezvousManageTab />
        </AdminErrorBoundary>
      ),
    },
    {
      id: 'finance',
      title: 'Finance',
      icon: FinanceIcon,
      content: (
        <AdminErrorBoundary tabName="Finance">
          <FinanceManageTab memberApplications={memberApplications} />
        </AdminErrorBoundary>
      ),
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: ReportsIcon,
      content: (
        <AdminErrorBoundary tabName="Reports">
          <ReportsTab />
        </AdminErrorBoundary>
      ),
    },
    {
      id: 'email',
      title: 'Email',
      icon: EmailIcon,
      content: (
        <AdminErrorBoundary tabName="Email">
          <FreeformEmailTab />
        </AdminErrorBoundary>
      ),
    },
    {
      id: 'invoices',
      title: 'Invoices',
      icon: InvoicesIcon,
      content: (
        <AdminErrorBoundary tabName="Invoices">
          <InvoicesTab />
        </AdminErrorBoundary>
      ),
    },
    {
      id: 'sponsors',
      title: 'Sponsors',
      icon: SponsorsIcon,
      content: (
        <AdminErrorBoundary tabName="Sponsors">
          <SponsorsTab />
        </AdminErrorBoundary>
      ),
    },
  ];

  return (
    <>
      <AdminConsoleDashboard
        title="Admin Portal"
        bannerImage="/conferenceWood.jpg"
        bannerImageAlt="Corporate Management"
        tiles={tiles}
        currentPage="admin-portal"
        defaultActiveTile="members"
        onNavigationReady={handleNavigationReady}
      />
      <EmailToast />
      <InvoiceToast />
    </>
  );
}

// Wrapper component with providers
export default function AdminPortalPage() {
  return (
    <EmailProvider>
      <InvoiceProvider>
        <AdminPortalContent />
      </InvoiceProvider>
    </EmailProvider>
  );
}
