'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageLayout from '../../../../components/PageLayout';
import Button from '../../../../components/Button';
import Modal from '../../../../components/Modal';
import { useAuth } from '../../../../contexts/AuthContext';
import { getMemberApplicationsByUserId } from '../../../../lib/firestore';

const mockVideos = [
  {
    id: '1',
    title: 'Understanding MGA Regulations in Europe',
    description: 'Comprehensive overview of regulatory framework for MGAs across European markets.',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    category: 'Regulatory',
    tags: ['compliance', 'regulations', 'europe'],
    author: 'Dr. Sarah Johnson',
    duration: '45:32',
    uploadDate: '2024-01-15',
    views: 1250,
    likes: 89,
    comments: [
      { id: '1', author: 'John Smith', text: 'Very informative presentation!', date: '2024-01-16' },
      { id: '2', author: 'Maria Garcia', text: 'Helped clarify many regulatory questions.', date: '2024-01-17' }
    ]
  },
  {
    id: '2',
    title: 'Digital Transformation for MGAs',
    description: 'How technology is reshaping the MGA landscape and best practices for digital adoption.',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    category: 'Technology',
    tags: ['digital', 'technology', 'innovation'],
    author: 'Mark Thompson',
    duration: '38:15',
    uploadDate: '2024-01-10',
    views: 892,
    likes: 67,
    comments: [
      { id: '3', author: 'Lisa Chen', text: 'Great insights on digital trends.', date: '2024-01-11' }
    ]
  },
  {
    id: '3',
    title: 'Market Opportunities in Eastern Europe',
    description: 'Analysis of emerging markets and growth opportunities for MGAs in Eastern Europe.',
    youtubeId: 'dQw4w9WgXcQ',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    category: 'Market Analysis',
    tags: ['market', 'opportunities', 'eastern-europe'],
    author: 'Andreas Mueller',
    duration: '52:18',
    uploadDate: '2024-01-05',
    views: 1456,
    likes: 112,
    comments: []
  }
];

export default function VideoPage() {
  const authContext = useAuth();
  const { user, loading: authLoading } = authContext || { user: null, loading: true };
  const router = useRouter();
  const params = useParams();
  const [video, setVideo] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
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

  useEffect(() => {
    if (params.slug && hasAccess) {
      const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
      const youtubeId = slug.split('-')[0];
      const foundVideo = mockVideos.find(v => v.youtubeId === youtubeId);
      
      if (foundVideo) {
        setVideo(foundVideo);
      }
      setLoading(false);
    }
  }, [params.slug, hasAccess]);

  // Show loading while checking access
  if (authLoading || checkingAccess) {
    return (
      <PageLayout currentPage="knowledge-base-webinars">
        <main className="flex-1 bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-fase-light-gold rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-4 bg-fase-light-gold rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </main>
      </PageLayout>
    );
  }


  if (loading) {
    return (
      <PageLayout currentPage="knowledge-base-webinars">
        <main className="flex-1 bg-fase-cream py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-fase-light-gold rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-4 bg-fase-light-gold rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </main>
      </PageLayout>
    );
  }

  if (!video) {
    return (
      <>
        <PageLayout currentPage="knowledge-base-webinars">
          <main className="flex-1 bg-fase-cream py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h1 className="text-2xl font-noto-serif font-bold text-fase-navy mb-4">Video Not Found</h1>
              <p className="text-fase-black mb-8">The video you're looking for doesn't exist or has been removed.</p>
              <Button href="/knowledge-base-webinars" variant="primary">
                ← Back to Knowledge Base
              </Button>
            </div>
          </main>
        </PageLayout>

        {/* Access Denied Modal - duplicate for not found case */}
        <Modal 
          isOpen={showAccessModal} 
          onClose={() => {}} 
          title="Knowledge Base Access"
          maxWidth="lg"
        >
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-fase-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">
                Active Membership Required
              </h3>
              <p className="text-fase-black mb-4">
                This video content is exclusively available to approved FASE members.
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
                      ? 'Your membership application is being reviewed. Once approved, you'll have full access to all knowledge base content.'
                      : 'Join FASE to access exclusive video content, industry insights, and professional development resources.'
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

  return (
    <>
      <PageLayout currentPage="knowledge-base-webinars">
      <main className="flex-1 bg-fase-cream min-h-[calc(100vh-5.5rem)] flex flex-col">
        {/* Header Section */}
        <div className="bg-white border-b border-fase-light-gold px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <Button href="/knowledge-base-webinars" variant="secondary" size="small">
                ← Knowledge Base
              </Button>
              <svg className="w-4 h-4 text-fase-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-fase-black">{video.category}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-fase-navy text-white px-3 py-1 rounded text-sm">{video.category}</span>
              <span className="text-fase-black text-sm">{video.views} views</span>
              <span className="text-fase-black text-sm">{new Date(video.uploadDate).toLocaleDateString()}</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-noto-serif font-bold text-fase-navy mt-3 leading-tight">
            {video.title}
          </h1>
        </div>

        {/* Main Video Console */}
        <div className="flex-1 flex overflow-hidden mb-8">
          {/* Video Player Section */}
          <div className="flex-1 flex flex-col bg-black">
            <div className="flex-1 flex items-center justify-center">
              <iframe
                src={`https://www.youtube.com/embed/${video.youtubeId}`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full max-h-full"
              />
            </div>
          </div>

          {/* Sidebar with Details and Comments */}
          <div className="w-96 bg-white border-l border-fase-light-gold flex flex-col overflow-hidden">
            {/* Video Details */}
            <div className="p-6 border-b border-fase-light-gold">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <button className="flex items-center space-x-1 bg-fase-cream hover:bg-fase-light-gold px-3 py-1 rounded transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{video.likes}</span>
                  </button>
                  <button className="flex items-center space-x-1 bg-fase-cream hover:bg-fase-light-gold px-3 py-1 rounded transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    <span>Share</span>
                  </button>
                </div>
              </div>
              
              <h2 className="text-lg font-noto-serif font-semibold text-fase-navy mb-3">About This Video</h2>
              <p className="text-fase-black mb-3 leading-relaxed text-sm">{video.description}</p>
              <p className="text-xs text-fase-black mb-3">Presented by <strong>{video.author}</strong></p>
              
              <div className="flex flex-wrap gap-1">
                {video.tags.map((tag: string) => (
                  <span key={tag} className="bg-fase-light-blue text-fase-navy text-xs px-2 py-1 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-fase-light-gold">
                <h2 className="text-lg font-noto-serif font-semibold text-fase-navy mb-3">
                  Comments ({video.comments.length})
                </h2>
                
                <div className="mb-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full p-2 border border-fase-light-gold rounded focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent text-sm"
                    rows={2}
                  />
                  <div className="flex justify-end mt-2">
                    <Button 
                      variant="primary" 
                      size="small"
                      onClick={() => {
                        alert('Comment functionality coming soon!');
                        setNewComment('');
                      }}
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {video.comments.map((comment: any) => (
                  <div key={comment.id} className="bg-fase-cream p-3 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-fase-navy text-xs">{comment.author}</span>
                      <span className="text-xs text-fase-black">{new Date(comment.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-fase-black text-sm">{comment.text}</p>
                  </div>
                ))}
                {video.comments.length === 0 && (
                  <p className="text-fase-black text-center py-8 text-sm">No comments yet. Be the first to comment!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      </PageLayout>

      {/* Access Denied Modal */}
      <Modal 
        isOpen={showAccessModal} 
        onClose={() => {}} 
        title="Knowledge Base Access"
        maxWidth="lg"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-fase-orange rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">
              Active Membership Required
            </h3>
            <p className="text-fase-black mb-4">
              This video content is exclusively available to approved FASE members.
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
                    ? 'Your membership application is being reviewed. Once approved, you'll have full access to all knowledge base content.'
                    : 'Join FASE to access exclusive video content, industry insights, and professional development resources.'
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