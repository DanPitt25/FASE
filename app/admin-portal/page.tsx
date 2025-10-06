'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../../components/PageLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { getVideos, getPendingComments, moderateComment } from '../../lib/knowledge-base';
import type { Video, Comment } from '../../lib/knowledge-base';
import Button from '../../components/Button';

export default function AdminPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'comments'>('overview');

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
      const [videosData, commentsData] = await Promise.all([
        getVideos(), // Get all published videos
        user?.uid ? getPendingComments(user.uid) : []
      ]);
      setVideos(videosData);
      setPendingComments(commentsData);
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
            <p className="text-fase-black">Manage knowledge base content and moderate comments</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Videos</h3>
                    <p className="text-3xl font-bold text-fase-navy mb-2">{videos.length}</p>
                    <p className="text-fase-black text-sm">Published videos</p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Pending Comments</h3>
                    <p className="text-3xl font-bold text-red-600 mb-2">{pendingComments.length}</p>
                    <p className="text-fase-black text-sm">Awaiting moderation</p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-lg border border-fase-light-gold p-6">
                    <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">Knowledge Base</h3>
                    <Button 
                      href="/knowledge-base-webinars" 
                      variant="primary" 
                      size="medium"
                      className="w-full"
                    >
                      Manage Content
                    </Button>
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