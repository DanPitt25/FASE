'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../../components/PageLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { getVideos, getPendingComments, moderateComment } from '../../lib/knowledge-base';
import type { Video, Comment } from '../../lib/knowledge-base';
import { getAllMemberApplications, updateMemberApplicationStatus, MemberApplication } from '../../lib/firestore';
import Button from '../../components/Button';

// Pricing calculation function (copied from application form)
const calculateMembershipFee = (application: MemberApplication): number => {
  let baseFee = 0;
  
  if (application.membershipType === 'individual') {
    baseFee = 500;
  } else if (application.organizationType === 'MGA' && application.portfolio?.grossWrittenPremiums) {
    switch (application.portfolio.grossWrittenPremiums) {
      case '<10m': baseFee = 900; break;
      case '10-20m': baseFee = 1500; break;
      case '20-50m': baseFee = 2000; break;
      case '50-100m': baseFee = 2800; break;
      case '100-500m': baseFee = 4200; break;
      case '500m+': baseFee = 6400; break;
      default: baseFee = 900;
    }
  } else {
    // Default corporate fee for carriers and providers
    baseFee = 900;
  }
  
  // Apply association member discount if applicable
  // Note: This field might not be in the existing interface, we'll handle gracefully
  const hasOtherAssociations = (application as any).hasOtherAssociations;
  if (hasOtherAssociations && application.membershipType === 'corporate') {
    baseFee = Math.round(baseFee * 0.8); // 20% discount
  }
  
  return baseFee;
};

export default function AdminPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [memberApplications, setMemberApplications] = useState<MemberApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'comments' | 'members'>('overview');

  useEffect(() => {
    console.log('Admin portal useEffect:', { authLoading, adminLoading, user: !!user, isAdmin });
    if (!authLoading && !adminLoading) {
      if (!user) {
        console.log('No user, redirecting to login');
        router.push('/login');
        return;
      }
      if (!isAdmin) {
        console.log('User is not admin, redirecting to home');
        router.push('/');
        return;
      }
      console.log('User is admin, loading data');
      loadData();
    }
  }, [user, isAdmin, authLoading, adminLoading, router]);

  const loadData = async () => {
    try {
      const [videosData, commentsData, memberApplicationsData] = await Promise.all([
        getVideos(), // Get all published videos
        user?.uid ? getPendingComments(user.uid) : [],
        getAllMemberApplications() // Get all member applications
      ]);
      setVideos(videosData);
      setPendingComments(commentsData);
      setMemberApplications(memberApplicationsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModerateComment = async (commentId: string, status: 'approved' | 'rejected') => {
    if (!user?.uid) return;
    
    try {
      await moderateComment(user.uid, commentId, status);
      setPendingComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error moderating comment:', error);
      alert('Error moderating comment. Please try again.');
    }
  };

  const handleMemberApplicationStatus = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      await updateMemberApplicationStatus(applicationId, status);
      setMemberApplications(prev => 
        prev.map(app => app.id === applicationId ? { ...app, status } : app)
      );
    } catch (error) {
      console.error('Error updating member application:', error);
      alert('Error updating member application. Please try again.');
    }
  };

  const pendingApplications = memberApplications.filter(app => app.status === 'pending');
  const approvedApplications = memberApplications.filter(app => app.status === 'approved');
  const rejectedApplications = memberApplications.filter(app => app.status === 'rejected');
  const invoiceSentApplications = memberApplications.filter(app => app.status === 'invoice_sent');
  
  // Calculate total expected revenue from pending and invoice_sent applications
  const totalExpectedRevenue = [...pendingApplications, ...invoiceSentApplications]
    .reduce((total, app) => total + calculateMembershipFee(app), 0);

  if (authLoading || adminLoading) {
    return (
      <PageLayout currentPage="admin-portal">
        <main className="flex-1 bg-fase-cream min-h-[calc(100vh-5.5rem)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fase-navy mx-auto mb-4"></div>
            <p className="text-fase-black">Loading...</p>
          </div>
        </main>
      </PageLayout>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect
  }

  return (
    <PageLayout currentPage="admin-portal">
      <main className="flex-1 bg-fase-cream min-h-[calc(100vh-5.5rem)] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-noto-serif font-bold text-fase-navy mb-2">Admin Portal</h1>
            <p className="text-fase-black">Manage knowledge base content, moderate comments, and review member applications</p>
          </div>

          {/* Admin Status Check */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 font-medium">Admin access confirmed</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              You have administrative privileges for the knowledge base system.
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-fase-light-gold mb-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'members', label: 'Members' },
                { id: 'videos', label: 'Videos' },
                { id: 'comments', label: 'Comments' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-fase-navy text-fase-navy'
                      : 'border-transparent text-fase-black hover:text-fase-navy hover:border-fase-light-gold'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'comments' && pendingComments.length > 0 && (
                    <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                      {pendingComments.length}
                    </span>
                  )}
                  {tab.id === 'members' && pendingApplications.length > 0 && (
                    <span className="ml-2 bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                      {pendingApplications.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
              <p className="text-fase-black">Loading admin data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Member Applications</h3>
                      <p className="text-3xl font-bold text-orange-600 mb-2">{pendingApplications.length + invoiceSentApplications.length}</p>
                      <p className="text-fase-black text-sm">Pending review & payment</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Active Members</h3>
                      <p className="text-3xl font-bold text-green-600 mb-2">{approvedApplications.length}</p>
                      <p className="text-fase-black text-sm">Approved members</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Expected Revenue</h3>
                      <p className="text-3xl font-bold text-blue-600 mb-2">€{totalExpectedRevenue.toLocaleString()}</p>
                      <p className="text-fase-black text-sm">From pending applications</p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Pending Comments</h3>
                      <p className="text-3xl font-bold text-red-600 mb-2">{pendingComments.length}</p>
                      <p className="text-fase-black text-sm">Awaiting moderation</p>
                    </div>
                  </div>
                  
                  {/* Revenue Breakdown */}
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">Revenue Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">€{pendingApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-orange-800">Pending Review ({pendingApplications.length})</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">€{invoiceSentApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-blue-800">Invoices Sent ({invoiceSentApplications.length})</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">€{approvedApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                        <p className="text-sm text-green-800">Approved Members ({approvedApplications.length})</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <div className="space-y-6">
                  {/* Pending Applications */}
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                    <div className="p-6 border-b border-fase-light-gold">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Pending Applications</h3>
                      <p className="text-fase-black text-sm mt-1">Review and approve member applications • Expected revenue: €{pendingApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                    </div>
                    <div className="divide-y divide-fase-light-gold">
                      {pendingApplications.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-fase-black">No pending applications to review</p>
                        </div>
                      ) : (
                        pendingApplications.map(application => (
                          <div key={application.id} className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <span className="font-medium text-fase-navy text-lg">{application.organizationName}</span>
                                  <span className="ml-3 px-2 py-1 bg-fase-cream text-fase-navy text-xs rounded-full">
                                    {application.organizationType}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Contact:</strong> {application.primaryContact.name}</p>
                                    <p className="text-sm text-fase-black"><strong>Email:</strong> {application.primaryContact.email}</p>
                                    <p className="text-sm text-fase-black"><strong>Phone:</strong> {application.primaryContact.phone}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Country:</strong> {application.registeredAddress.country}</p>
                                    <p className="text-sm text-fase-black"><strong>City:</strong> {application.registeredAddress.city}</p>
                                    <p className="text-sm text-fase-black"><strong>Applied:</strong> {new Date(application.createdAt.seconds * 1000).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Membership:</strong> {application.membershipType === 'individual' ? 'Individual' : `${application.organizationType} Corporate`}</p>
                                    {application.portfolio?.grossWrittenPremiums && (
                                      <p className="text-sm text-fase-black"><strong>GWP:</strong> {application.portfolio.grossWrittenPremiums}</p>
                                    )}
                                    <p className="text-sm font-semibold text-green-600"><strong>Expected Fee: €{calculateMembershipFee(application)}</strong></p>
                                  </div>
                                </div>
                                {application.portfolio?.portfolioMix && (
                                  <div className="mb-3">
                                    <p className="text-sm font-medium text-fase-navy mb-1">Portfolio Mix:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(application.portfolio.portfolioMix).map(([line, percentage]) => (
                                        <span key={line} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                          {line}: {percentage}%
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <button
                                  onClick={() => handleMemberApplicationStatus(application.id, 'approved')}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleMemberApplicationStatus(application.id, 'rejected')}
                                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Invoice Sent Applications */}
                  {invoiceSentApplications.length > 0 && (
                    <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                      <div className="p-6 border-b border-fase-light-gold">
                        <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Invoices Sent</h3>
                        <p className="text-fase-black text-sm mt-1">Awaiting payment • Expected revenue: €{invoiceSentApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                      </div>
                      <div className="divide-y divide-fase-light-gold">
                        {invoiceSentApplications.map(application => (
                          <div key={application.id} className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <span className="font-medium text-fase-navy text-lg">{application.organizationName}</span>
                                  <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    Invoice Sent
                                  </span>
                                  <span className="ml-2 px-2 py-1 bg-fase-cream text-fase-navy text-xs rounded-full">
                                    {application.organizationType}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Contact:</strong> {application.primaryContact.name}</p>
                                    <p className="text-sm text-fase-black"><strong>Email:</strong> {application.primaryContact.email}</p>
                                    <p className="text-sm text-fase-black"><strong>Phone:</strong> {application.primaryContact.phone}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Country:</strong> {application.registeredAddress.country}</p>
                                    <p className="text-sm text-fase-black"><strong>City:</strong> {application.registeredAddress.city}</p>
                                    <p className="text-sm text-fase-black"><strong>Invoice Sent:</strong> {new Date(application.updatedAt.seconds * 1000).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-fase-black"><strong>Membership:</strong> {application.membershipType === 'individual' ? 'Individual' : `${application.organizationType} Corporate`}</p>
                                    {application.portfolio?.grossWrittenPremiums && (
                                      <p className="text-sm text-fase-black"><strong>GWP:</strong> {application.portfolio.grossWrittenPremiums}</p>
                                    )}
                                    <p className="text-sm font-semibold text-blue-600"><strong>Expected Payment: €{calculateMembershipFee(application)}</strong></p>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4 flex space-x-2">
                                <Button
                                  onClick={() => handleMemberApplicationStatus(application.id, 'approved')}
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                >
                                  Mark as Paid
                                </Button>
                                <Button
                                  onClick={() => handleMemberApplicationStatus(application.id, 'rejected')}
                                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approved Members */}
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                    <div className="p-6 border-b border-fase-light-gold">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Approved Members</h3>
                      <p className="text-fase-black text-sm mt-1">Currently active members • Total revenue: €{approvedApplications.reduce((total, app) => total + calculateMembershipFee(app), 0).toLocaleString()}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-fase-light-gold">
                        <thead className="bg-fase-cream">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Organization</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Country</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Fee Paid</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Approved</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-fase-light-gold">
                          {approvedApplications.map(application => (
                            <tr key={application.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-fase-navy">{application.organizationName}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {application.organizationType}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-fase-black">
                                {application.registeredAddress.country}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-fase-black">
                                {application.primaryContact.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                €{calculateMembershipFee(application)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-fase-black">
                                {new Date(application.updatedAt.seconds * 1000).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'videos' && (
                <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                  <div className="p-6 border-b border-fase-light-gold">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Published Videos</h3>
                      <Button variant="primary" size="small">Add Video</Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-fase-light-gold">
                      <thead className="bg-fase-cream">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Views</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Upload Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-fase-navy uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-fase-light-gold">
                        {videos.map(video => (
                          <tr key={video.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-fase-navy">{video.title}</div>
                              <div className="text-sm text-fase-black">{video.author}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-fase-navy text-white">
                                {video.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-fase-black">{video.views}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-fase-black">
                              {video.uploadDate ? new Date(video.uploadDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-fase-navy hover:text-fase-gold mr-3">Edit</button>
                              <button className="text-red-600 hover:text-red-900">Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold">
                  <div className="p-6 border-b border-fase-light-gold">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy">Pending Comments</h3>
                    <p className="text-fase-black text-sm mt-1">Review and moderate user comments</p>
                  </div>
                  <div className="divide-y divide-fase-light-gold">
                    {pendingComments.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-fase-black">No pending comments to review</p>
                      </div>
                    ) : (
                      pendingComments.map(comment => (
                        <div key={comment.id} className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <span className="font-medium text-fase-navy">{comment.authorName}</span>
                                <span className="text-fase-black text-sm ml-2">
                                  {new Date(comment.createdAt.seconds * 1000).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-fase-black mb-3">{comment.text}</p>
                              <p className="text-fase-black text-xs">Video ID: {comment.videoId}</p>
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={() => handleModerateComment(comment.id, 'approved')}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleModerateComment(comment.id, 'rejected')}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </PageLayout>
  );
}