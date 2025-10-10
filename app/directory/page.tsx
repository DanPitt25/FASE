'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UtilityPage from '../../components/UtilityPage';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getApprovedMembersForDirectory, DirectoryMember, getMemberApplicationsByUserId } from '../../lib/firestore';


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
  const authContext = useAuth();
  const { user, loading: authLoading } = authContext || { user: null, loading: true };
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [memberApplications, setMemberApplications] = useState<any[]>([]);

  // Check user access
  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const applications = await getMemberApplicationsByUserId(user.uid);
        const hasApprovedMembership = applications.some(app => app.status === 'approved');
        setMemberApplications(applications);
        setHasAccess(hasApprovedMembership);
        
        if (!hasApprovedMembership) {
          setShowAccessModal(true);
        }
      } catch (error) {
        console.error('Error checking access:', error);
        setShowAccessModal(true);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, authLoading, router]);

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

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || member.organizationType.toLowerCase() === selectedType.toLowerCase();
    return matchesSearch && matchesType;
  });

  // Show loading while checking access
  if (authLoading || checkingAccess) {
    return (
      <UtilityPage title="Member Directory" currentPage="directory">
        <div className="text-center py-20">
          <div className="animate-pulse">
            <div className="h-8 bg-fase-cream rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-fase-cream rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </UtilityPage>
    );
  }

  return (
    <>
      <UtilityPage
        title="Member Directory"
        currentPage="directory"
      >
      {/* Search and Filters */}
      <div>
          <div className="bg-white rounded-lg border border-fase-light-gold p-6 mb-8">
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
          <div className="mb-6">
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
                    {member.linesOfBusiness.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-fase-navy font-medium mb-1">Lines of Business</div>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {member.linesOfBusiness.slice(0, 3).map((line, index) => (
                            <span
                              key={index}
                              className="inline-block bg-fase-cream text-fase-navy text-xs px-2 py-1 rounded"
                            >
                              {line.name} ({line.percentage}%)
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
      </UtilityPage>

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
                    ? 'Your membership application is being reviewed. Once approved, you\'ll have full access to our member directory and can connect with FASE members across Europe.'
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
                onClick={() => router.push('/member-portal/apply')}
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