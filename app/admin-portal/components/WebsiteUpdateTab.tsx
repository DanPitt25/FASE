'use client';

import { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { UnifiedMember } from '../../../lib/unified-member';
import Button from '../../../components/Button';

interface WebsiteUpdateTabProps {
  memberApplications: UnifiedMember[];
  loading: boolean;
}

export default function WebsiteUpdateTab({ memberApplications, loading }: WebsiteUpdateTabProps) {
  const [updateStatuses, setUpdateStatuses] = useState<Record<string, 'idle' | 'saving' | 'success' | 'error'>>({});
  const [websiteValues, setWebsiteValues] = useState<Record<string, string>>({});
  const [completedMembers, setCompletedMembers] = useState<Set<string>>(new Set());
  const [showExistingWebsites, setShowExistingWebsites] = useState(false);

  // Filter to only show members without a website field and not completed
  const membersWithoutWebsite = useMemo(() => {
    return memberApplications.filter(member => {
      // Skip if already completed in this session
      if (completedMembers.has(member.id)) return false;
      
      // Check if website field exists and has a value
      const website = (member as any).website;
      return !website || website.trim() === '';
    });
  }, [memberApplications, completedMembers]);

  // Filter to show members with existing website values
  const membersWithWebsite = useMemo(() => {
    return memberApplications.filter(member => {
      const website = (member as any).website;
      return website && website.trim() !== '';
    });
  }, [memberApplications]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
        <p className="text-fase-black">Loading members...</p>
      </div>
    );
  }

  const handleWebsiteChange = (memberId: string, value: string) => {
    setWebsiteValues(prev => ({
      ...prev,
      [memberId]: value
    }));
  };

  const renderMemberRow = (member: UnifiedMember, isExisting: boolean = false) => {
    const status = updateStatuses[member.id] || 'idle';
    const currentValue = websiteValues[member.id] ?? (isExisting ? (member as any).website || '' : '');
    
    return (
      <tr key={member.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm">
            <div className="font-medium text-gray-900">{member.organizationName}</div>
            <div className="text-gray-500">{member.organizationType}</div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm">
            <div className="text-gray-900">{member.personalName || 'Unknown'}</div>
            <div className="text-gray-500">{member.email || 'No email'}</div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            {member.status}
          </span>
        </td>
        <td className="px-6 py-4">
          <input
            type="url"
            value={currentValue}
            onChange={(e) => handleWebsiteChange(member.id, e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
            disabled={status === 'saving'}
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <Button
            variant={getButtonVariant(status)}
            size="small"
            onClick={() => handleUpdateWebsite(member.id)}
            disabled={status === 'saving' || status === 'success' || (!currentValue?.trim())}
          >
            {getButtonText(status)}
          </Button>
        </td>
      </tr>
    );
  };

  const handleUpdateWebsite = async (memberId: string) => {
    // Get the current value from input or fallback to existing DB value
    const member = memberApplications.find(m => m.id === memberId);
    const existingWebsite = (member as any)?.website || '';
    const inputValue = websiteValues[memberId]?.trim();
    const website = inputValue !== undefined ? inputValue : existingWebsite;
    
    if (!website) {
      return; // Don't update if empty
    }
    
    setUpdateStatuses(prev => ({
      ...prev,
      [memberId]: 'saving'
    }));

    try {
      const memberRef = doc(db, 'accounts', memberId);
      await updateDoc(memberRef, {
        website: website
      });

      setUpdateStatuses(prev => ({
        ...prev,
        [memberId]: 'success'
      }));

      // Remove member from list after successful update
      setTimeout(() => {
        setCompletedMembers(prev => new Set([...prev, memberId]));
        setUpdateStatuses(prev => {
          const newStatuses = { ...prev };
          delete newStatuses[memberId];
          return newStatuses;
        });
        setWebsiteValues(prev => {
          const newValues = { ...prev };
          delete newValues[memberId];
          return newValues;
        });
      }, 1500);
    } catch (error) {
      console.error('Error updating website:', error);
      setUpdateStatuses(prev => ({
        ...prev,
        [memberId]: 'error'
      }));

      setTimeout(() => {
        setUpdateStatuses(prev => ({
          ...prev,
          [memberId]: 'idle'
        }));
      }, 3000);
    }
  };

  const getButtonVariant = (status: string) => {
    switch (status) {
      case 'saving': return 'secondary';
      case 'success': return 'primary';
      case 'error': return 'secondary';
      default: return 'primary';
    }
  };

  const getButtonText = (status: string) => {
    switch (status) {
      case 'saving': return 'Saving...';
      case 'success': return 'Saved!';
      case 'error': return 'Error - Retry';
      default: return 'Update';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-4">
        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">
          Website Field Update Tool
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Add website URLs for member accounts that don't have one. Members will disappear from this list once updated.
        </p>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-gray-700">
            <strong>Total members:</strong> {memberApplications.length}
          </span>
          <span className="text-gray-700">
            <strong>Missing website:</strong> {membersWithoutWebsite.length}
          </span>
          <span className="text-blue-600">
            <strong>Have website:</strong> {membersWithWebsite.length}
          </span>
          <span className="text-green-600">
            <strong>Completed this session:</strong> {completedMembers.size}
          </span>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-fase-light-gold">
            <thead className="bg-fase-navy">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Website URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {membersWithoutWebsite.map((member) => renderMemberRow(member, false))}
            </tbody>
          </table>
        </div>
        {membersWithoutWebsite.length === 0 && memberApplications.length > 0 && (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Done!</h3>
            <p className="text-fase-black">All members now have website URLs assigned.</p>
          </div>
        )}
        {memberApplications.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-fase-black">No members found.</p>
          </div>
        )}
      </div>

      {/* Existing Websites Section */}
      {membersWithWebsite.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden">
          <button
            onClick={() => setShowExistingWebsites(!showExistingWebsites)}
            className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-fase-navy focus:ring-inset"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">
                  Members with Existing Websites ({membersWithWebsite.length})
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Click to {showExistingWebsites ? 'hide' : 'view and edit'} members who already have website URLs
                </p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  showExistingWebsites ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {showExistingWebsites && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-fase-light-gold">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                      Website URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {membersWithWebsite.map((member) => renderMemberRow(member, true))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}