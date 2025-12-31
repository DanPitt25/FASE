'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ContentPageLayout from '../../components/ContentPageLayout';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { getVideos, getVideoComments, createComment, incrementVideoViews, createVideo, updateComment, deleteComment } from '../../lib/knowledge-base';
import { useUnifiedAuth } from '../../contexts/UnifiedAuthContext';
import type { Video, Comment } from '../../lib/knowledge-base';
import { useTranslations } from 'next-intl';

const categories = ['All', 'Regulatory', 'Technology', 'Market Analysis', 'Webinars', 'Training'];

export default function KnowledgeBaseWebinarsPage() {
  const { user, member, loading: authLoading, isAdmin, hasMemberAccess } = useUnifiedAuth();
  const router = useRouter();
  const t = useTranslations('knowledge_base_webinars');
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoComments, setVideoComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [memberApplications, setMemberApplications] = useState<any[]>([]);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    youtubeId: '',
    category: 'Regulatory' as const,
    tags: '',
    author: '',
    duration: ''
  });

  // Check user access
  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        setHasAccess(hasMemberAccess);
        if (member && member.status === 'pending') {
          setMemberApplications([member]);
        }
        
        if (!hasMemberAccess) {
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
  }, [user, authLoading, router, hasMemberAccess, member]);

  // Load videos on component mount
  useEffect(() => {
    const loadVideos = async () => {
      if (!hasAccess) return;
      
      try {
        const videosData = await getVideos();
        setVideos(videosData);
        setFilteredVideos(videosData);
      } catch (error) {
        console.error('Error loading videos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [hasAccess]);

  // Filter videos based on category and search query
  useEffect(() => {
    let filtered = videos;
    
    if (selectedCategory && selectedCategory !== 'All') {
      filtered = filtered.filter(video => video.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    setFilteredVideos(filtered);
  }, [videos, selectedCategory, searchQuery]);

  // Get video count per category
  const getCategoryCount = (category: string) => {
    if (category === 'All') return videos.length;
    return videos.filter(video => video.category === category).length;
  };

  // Get category image
  const getCategoryImage = (category: string) => {
    const images = {
      'All': '/conferenceWood.jpg',
      'Regulatory': '/regulatory.jpg',
      'Technology': '/data.jpg', 
      'Market Analysis': '/market.jpg',
      'Webinars': '/conferenceWood.jpg',
      'Training': '/training.jpg'
    };
    return images[category as keyof typeof images] || '/conferenceWood.jpg';
  };

  // If checking access or no access, show standard page layout
  if (authLoading || checkingAccess || !hasAccess) {
    const sections = [
      {
        type: 'split' as const,
        title: 'FASE Knowledge Base',
        content: hasAccess ? 'Loading your exclusive video content...' : 'Access our comprehensive video library with industry insights, regulatory updates, and professional development content exclusively for FASE members.',
        image: '/data.jpg',
        imageAlt: 'Knowledge base and learning resources',
        imagePosition: 'right' as const
      }
    ];

    return (
      <>
        <ContentPageLayout
          title="Knowledge Base"
          bannerImage="/training.jpg"
          bannerImageAlt="Professional learning and development"
          sections={sections}
          currentPage="knowledge-base-webinars"
        />
        
        {/* Access Modal */}
        <Modal 
          isOpen={showAccessModal} 
          onClose={() => {}} 
          title="Knowledge Base Access"
          maxWidth="lg"
        >
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">
                Active Membership Required
              </h3>
              <p className="text-fase-black mb-4">
                The Knowledge Base is exclusively available to approved FASE members.
              </p>
            </div>

            <div className="bg-fase-cream border border-fase-light-gold rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-fase-navy mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-fase-navy mb-2">
                    {memberApplications.length > 0 ? 'Application Under Review' : 'Get Started Today'}
                  </h4>
                  <p className="text-sm text-fase-black">
                    {memberApplications.length > 0 
                      ? "Your membership application is being reviewed. Once approved, you'll have full access to our knowledge base with industry insights, regulatory updates, and educational resources."
                      : "Join FASE to access our comprehensive knowledge base with exclusive content, industry insights, and professional development resources."
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="secondary" 
                size="medium"
                onClick={() => router.push('/member-portal')}
              >
                Return to Member Portal
              </Button>
              {memberApplications.length === 0 && (
                <Button 
                  variant="primary" 
                  size="medium"
                  onClick={() => router.push('/join')}
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

  // If selected video, show video player in modern layout
  if (selectedVideo) {
    const videoSections = [
      {
        type: 'custom' as const,
        content: (
          <div className="bg-white">
            {/* Video Player */}
            <div className="w-full mb-8">
              <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Video Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2">
                <div className="flex items-center space-x-4 mb-4">
                  <span className="bg-fase-navy text-white text-sm px-3 py-1 rounded-full">{selectedVideo.category}</span>
                  <span className="text-fase-black text-sm">{selectedVideo.views} views</span>
                  <span className="text-fase-black text-sm">By {selectedVideo.author}</span>
                </div>
                
                <p className="text-fase-black leading-relaxed mb-6">{selectedVideo.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedVideo.tags.map(tag => (
                    <span key={tag} className="bg-fase-cream text-fase-navy text-sm px-3 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>

                <Button 
                  variant="secondary" 
                  onClick={() => setSelectedVideo(null)}
                >
                  ← Back to Videos
                </Button>
              </div>

              {/* Comments Section */}
              <div className="bg-fase-cream rounded-lg p-6">
                <h3 className="text-lg font-noto-serif font-semibold text-fase-navy mb-4">
                  Discussion ({videoComments.length})
                </h3>

                {/* Add Comment Form */}
                <div className="mb-6">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="w-full p-3 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button 
                      variant="primary" 
                      size="small"
                      onClick={async () => {
                        if (!user || !newComment.trim() || !selectedVideo) return;

                        try {
                          await createComment(
                            selectedVideo.id,
                            user.uid,
                            member?.personalName || user.email?.split('@')[0] || 'Anonymous',
                            newComment.trim()
                          );
                          setNewComment('');
                          
                          const comments = await getVideoComments(selectedVideo.id);
                          setVideoComments(comments);
                        } catch (error) {
                          console.error('Error posting comment:', error);
                        }
                      }}
                    >
                      Post Comment
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {videoComments.map(comment => (
                    <div key={comment.id} className="bg-white p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-fase-navy text-sm">{comment.authorName}</span>
                        <span className="text-xs text-fase-black">
                          {comment.createdAt?.seconds ? 
                            new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : 
                            'Recent'
                          }
                        </span>
                      </div>
                      <p className="text-fase-black text-sm">{comment.text}</p>
                    </div>
                  ))}
                  {videoComments.length === 0 && (
                    <p className="text-fase-black text-center py-6 text-sm">No comments yet. Be the first to comment!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }
    ];

    return (
      <ContentPageLayout
        title={selectedVideo.title}
        bannerImage="/training.jpg"
        bannerImageAlt="Professional video content"
        sections={videoSections}
        currentPage="knowledge-base-webinars"
      />
    );
  }

  // Main video browse interface
  const browseSections = [
    {
      type: 'custom' as const,
      content: (
        <div className="bg-white">
          {/* Search and Filter */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search videos..."
                    className="w-full pl-10 pr-4 py-3 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  />
                  <svg className="absolute left-3 top-3.5 h-5 w-5 text-fase-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="flex gap-2 overflow-x-auto">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedCategory === category 
                        ? 'bg-fase-navy text-white' 
                        : 'bg-fase-cream text-fase-navy hover:bg-fase-light-gold'
                    }`}
                  >
                    {category} ({getCategoryCount(category)})
                  </button>
                ))}
              </div>

              {isAdmin && (
                <Button 
                  variant="primary" 
                  size="medium"
                  onClick={() => setShowAddVideo(true)}
                >
                  Add Video
                </Button>
              )}
            </div>

            {(selectedCategory || searchQuery) && (
              <p className="text-fase-black text-sm mb-4">
                Showing {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
                {selectedCategory && ` in ${selectedCategory}`}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            )}
          </div>

          {/* Videos Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
              <p className="text-fase-black">Loading videos...</p>
            </div>
          ) : filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map(video => (
                <div key={video.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <div 
                    className="relative cursor-pointer h-48"
                    onClick={async () => {
                      setSelectedVideo(video);
                      
                      try {
                        await incrementVideoViews(video.id);
                        setVideos(prev => prev.map(v => 
                          v.id === video.id ? { ...v, views: v.views + 1 } : v
                        ));
                        
                        const comments = await getVideoComments(video.id);
                        setVideoComments(comments);
                      } catch (error) {
                        console.error('Error loading video:', error);
                        setVideoComments([]);
                      }
                    }}
                  >
                    <Image 
                      src={video.thumbnail} 
                      alt={video.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <svg className="w-6 h-6 text-fase-navy ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="bg-fase-navy text-white text-xs px-2 py-1 rounded">{video.category}</span>
                      <div className="flex items-center space-x-3 text-xs text-fase-black">
                        <span>{video.views} views</span>
                      </div>
                    </div>
                    
                    <h3 className="font-noto-serif font-semibold text-fase-navy mb-2 line-clamp-2 cursor-pointer hover:text-fase-gold transition-colors">
                      {video.title}
                    </h3>
                    
                    <p className="text-sm text-fase-black mb-3 line-clamp-2">{video.description}</p>
                    
                    <div className="flex items-center justify-between text-xs text-fase-black">
                      <span>By {video.author}</span>
                      <span>{new Date(video.uploadDate).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-3">
                      {video.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-fase-cream text-fase-navy text-xs px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-fase-light-gold bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-fase-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-fase-navy mb-2">No videos found</h3>
              <p className="text-fase-black mb-4">
                {searchQuery 
                  ? `No videos match your search criteria.`
                  : `No videos available yet.`
                }
              </p>
              {searchQuery && (
                <Button variant="secondary" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <ContentPageLayout
        title="Knowledge Base Videos"
        bannerImage="/training.jpg"
        bannerImageAlt="Professional learning and development"
        sections={browseSections}
        currentPage="knowledge-base-webinars"
      />

      {/* Add Video Modal */}
      {showAddVideo && (
        <Modal 
          isOpen={showAddVideo} 
          onClose={() => setShowAddVideo(false)} 
          title="Add Video"
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">Title *</label>
                <input
                  type="text"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">YouTube ID *</label>
                <input
                  type="text"
                  value={videoForm.youtubeId}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, youtubeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  placeholder="dQw4w9WgXcQ"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">Description</label>
              <textarea
                value={videoForm.description}
                onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                placeholder="Enter video description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">Category *</label>
                <select
                  value={videoForm.category}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                >
                  <option value="Regulatory">Regulatory</option>
                  <option value="Technology">Technology</option>
                  <option value="Market Analysis">Market Analysis</option>
                  <option value="Webinars">Webinars</option>
                  <option value="Training">Training</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">Author *</label>
                <input
                  type="text"
                  value={videoForm.author}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  placeholder="Speaker name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fase-navy mb-2">Duration</label>
                <input
                  type="text"
                  value={videoForm.duration}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                  placeholder="45:32"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-fase-navy mb-2">Tags</label>
              <input
                type="text"
                value={videoForm.tags}
                onChange={(e) => setVideoForm(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="secondary" onClick={() => setShowAddVideo(false)}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={async () => {
                  if (!user?.uid || !isAdmin) {
                    alert('Admin access required');
                    return;
                  }

                  if (!videoForm.title.trim() || !videoForm.youtubeId.trim() || !videoForm.author.trim()) {
                    alert('Please fill in all required fields');
                    return;
                  }

                  try {
                    const videoData = {
                      title: videoForm.title.trim(),
                      description: videoForm.description.trim(),
                      youtubeId: videoForm.youtubeId.trim(),
                      thumbnail: `https://img.youtube.com/vi/${videoForm.youtubeId.trim()}/maxresdefault.jpg`,
                      category: videoForm.category,
                      tags: videoForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
                      author: videoForm.author.trim(),
                      duration: videoForm.duration.trim() || '0:00',
                      uploadDate: new Date(),
                      status: 'published' as const,
                      isLive: false,
                      requiresRegistration: false,
                      accessLevel: 'free' as const,
                      maxViewers: 0,
                      currentViewers: 0
                    };

                    await createVideo(user.uid, videoData);
                    
                    const videosData = await getVideos();
                    setVideos(videosData);
                    setFilteredVideos(videosData);
                    
                    setVideoForm({
                      title: '',
                      description: '',
                      youtubeId: '',
                      category: 'Regulatory',
                      tags: '',
                      author: '',
                      duration: ''
                    });
                    setShowAddVideo(false);
                    
                    alert('Video added successfully!');
                  } catch (error) {
                    console.error('Error adding video:', error);
                    alert('Error adding video. Please try again.');
                  }
                }}
              >
                Add Video
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}