'use client';

import { useState, useEffect } from 'react';
import { useUnifiedAuth } from '../contexts/UnifiedAuthContext';
import { getCompanyMembers, OrganizationAccount } from '../lib/unified-member';
import { ToastContainer, useToast } from './Toast';
import PersonalProfileSection from './profile/PersonalProfileSection';
import CompanyProfileSection from './profile/CompanyProfileSection';
import TeamManagementSection from './profile/TeamManagementSection';


interface CompanyInfo {
  id: string;
  organizationName: string;
  organizationType: string;
  status: string;
  logoURL?: string;
  logoStatus?: {
    status: 'pending_review' | 'approved' | 'rejected';
    pendingURL?: string;
    rejectionReason?: string;
  };
}

interface Member {
  id: string;
  email: string;
  personalName: string;
  jobTitle?: string;
  isAccountAdministrator: boolean;
  joinedAt: any;
  addedBy?: string;
  createdAt: any;
  updatedAt: any;
  accountConfirmed?: boolean;
}

export default function ManageProfile() {
  const { user, member, refreshMemberData } = useUnifiedAuth();
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationAccount, setOrganizationAccount] = useState<OrganizationAccount | null>(null);


  // Fetch company data and members
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !member) {
        return;
      }

      try {
        setLoading(true);
        
        // Find which account this user belongs to
        const { collection, getDocs, doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        
        let userAccountId = null;
        let userAccountData = null;
        
        // First try using organizationId from member if available
        if (member.organizationId) {
          try {
            const accountRef = doc(db, 'accounts', member.organizationId);
            const accountSnap = await getDoc(accountRef);
            if (accountSnap.exists()) {
              userAccountId = member.organizationId;
              userAccountData = accountSnap.data();
            }
          } catch (error) {
            // Silently handle this error - will fall back to search
          }
        }
        
        // Fallback: Search all accounts to find which one contains this user
        if (!userAccountId) {
          const accountsRef = collection(db, 'accounts');
          const accountsSnapshot = await getDocs(accountsRef);
          
          // Search all accounts to find which one contains this user
          for (const accountDoc of accountsSnapshot.docs) {
            const membersRef = collection(db, 'accounts', accountDoc.id, 'members');
            const membersSnapshot = await getDocs(membersRef);
            
            for (const memberDoc of membersSnapshot.docs) {
              const memberData = memberDoc.data();
              if (memberData.id === user.uid) {
                userAccountId = accountDoc.id;
                userAccountData = accountDoc.data();
                break;
              }
            }
            
            if (userAccountId) break;
          }
        }
        
        if (!userAccountId || !userAccountData) {
          throw new Error('Could not find account for user');
        }
        
        // Get company members directly
        const membersData = await getCompanyMembers(userAccountId);
        
        // Set company info from account data
        const companyInfo = {
          id: userAccountId,
          organizationName: userAccountData.organizationName || 'Unknown Company',
          organizationType: userAccountData.organizationType || 'Unknown',
          status: userAccountData.status,
          logoURL: userAccountData.logoURL,
          logoStatus: userAccountData.logoStatus
        };
        setCompany(companyInfo);
        
        // Set organization account for bio management
        const orgAccount: OrganizationAccount = {
          id: userAccountId,
          organizationName: userAccountData.organizationName || 'Unknown Company',
          organizationType: userAccountData.organizationType,
          status: userAccountData.status || 'pending',
          createdAt: userAccountData.createdAt,
          updatedAt: userAccountData.updatedAt,
          ...userAccountData
        };
        setOrganizationAccount(orgAccount);
        
        // Transform CompanyMember[] to Member[] by mapping isPrimaryContact to isAccountAdministrator
        // Handle both old data (with isPrimaryContact) and new data (with isAccountAdministrator already set)
        const transformedMembers: Member[] = membersData.map(member => ({
          ...member,
          isAccountAdministrator: member.isAccountAdministrator ?? member.isPrimaryContact ?? false
        }));
        setMembers(transformedMembers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid, member?.id, member?.organizationId]);

  // Handle logo change callback - new uploads go to pending status
  const handleLogoChange = (logoURL: string | null) => {
    setCompany(prev => prev ? {
      ...prev,
      logoStatus: logoURL ? {
        status: 'pending_review',
        pendingURL: logoURL
      } : prev.logoStatus
    } : null);
  };


  if (loading) {
    return (
      <>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-6 bg-fase-cream rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-fase-cream rounded"></div>
              ))}
            </div>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-800">{error}</span>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (!user || !member || !company || !organizationAccount) {
    return (
      <>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-yellow-800">Loading account information...</span>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Personal Profile Section */}
        <PersonalProfileSection 
          user={user} 
          member={member}
          showSuccess={(message) => showSuccess(message)}
          showError={(message) => showError(message)}
          onMemberDataRefresh={refreshMemberData}
        />

        {/* Company Profile Section */}
        <CompanyProfileSection 
          company={company} 
          organizationAccount={organizationAccount}
          onLogoChange={handleLogoChange}
          showSuccess={(message) => showSuccess(message)}
          showError={(message) => showError(message)}
          showInfo={(message) => showInfo(message)}
        />

        {/* Team Management Section */}
        <TeamManagementSection 
          user={user}
          member={member}
          members={members}
          onMembersChange={setMembers}
          showSuccess={(message) => showSuccess(message)}
          showError={(message) => showError(message)}
        />
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}