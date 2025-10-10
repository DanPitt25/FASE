'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../../components/PageLayout';
import TitleHero from '../../components/TitleHero';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { getVideos, getVideoComments, createComment, incrementVideoViews, createVideo, updateComment, deleteComment } from '../../lib/knowledge-base';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { getMemberApplicationsByUserId } from '../../lib/firestore';
import type { Video, Comment } from '../../lib/knowledge-base';

// Mock data - in production this would come from your database
const mockVideos = [
  {
    id: '1',
    title: 'Understanding MGA Regulations in Europe',
    description: 'Comprehensive overview of regulatory framework for MGAs across European markets.',
    youtubeId: 'dQw4w9WgXcQ', // Mock YouTube ID
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

const categories = ['All', 'Regulatory', 'Technology', 'Market Analysis', 'Webinars', 'Training'];

export default function KnowledgeBaseWebinarsPage() {
  const authContext = useAuth();
  const { user, loading: authLoading } = authContext || { user: null, loading: true };
  const { isAdmin } = useAdmin();
  const router = useRouter();
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

  const sections = [
    { name: 'Video Library', id: 'video-library' }
  ];

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
    
    if (selectedCategory) {
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

  // Handle comment edit
  const handleEditComment = async (commentId: string) => {
    if (!user?.uid || !editText.trim()) return;
    
    try {
      await updateComment(user.uid, commentId, editText.trim());
      
      // Refresh comments
      if (selectedVideo) {
        const comments = await getVideoComments(selectedVideo.id);
        setVideoComments(comments);
      }
      
      setEditingComment(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Error updating comment. Please try again.');
    }
  };

  // Handle comment delete
  const handleDeleteComment = async (commentId: string) => {
    if (!user?.uid) return;
    
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await deleteComment(user.uid, commentId);
      
      // Refresh comments
      if (selectedVideo) {
        const comments = await getVideoComments(selectedVideo.id);
        setVideoComments(comments);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error deleting comment. Please try again.');
    }
  };


  // Handle video form submission
  const handleAddVideo = async () => {
    if (!user?.uid || !isAdmin) {
      alert('Admin access required');
      return;
    }

    // Validation
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

      const videoId = await createVideo(user.uid, videoData);
      
      // Refresh videos list
      const videosData = await getVideos();
      setVideos(videosData);
      setFilteredVideos(videosData);
      
      // Reset form and close modal
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
  };

  // Get video count per category
  const getCategoryCount = (category: string) => {
    return videos.filter(video => video.category === category).length;
  };

  // Get category image
  const getCategoryImage = (category: string) => {
    const images = {
      'Regulatory': '/regulatory.jpg',
      'Technology': '/data.jpg', 
      'Market Analysis': '/market.jpg',
      'Webinars': '/conference.jpg',
      'Training': '/training.jpg'
    };
    return images[category as keyof typeof images] || '/conference.jpg';
  };

  const CategoryCard = ({ category, count, onClick }: { category: string; count: number; onClick: () => void }) => (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      {/* Category Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={getCategoryImage(category)} 
          alt={category}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        <div className="absolute top-4 right-4">
          <span className="bg-white/90 text-fase-navy text-sm px-3 py-1 rounded-full font-medium">
            {count} video{count !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-noto-serif font-bold text-white mb-2 group-hover:text-fase-cream transition-colors">
            {category}
          </h3>
        </div>
      </div>
      
      {/* Category Content */}
      <div className="p-6">
        <p className="text-fase-black text-sm mb-4">
          {category === 'Regulatory' && 'Compliance guidelines, regulatory updates, and legal frameworks for MGAs across Europe.'}
          {category === 'Technology' && 'Digital transformation insights, tech solutions, and innovation in the MGA sector.'}
          {category === 'Market Analysis' && 'Market trends, opportunities, and strategic insights for European markets.'}
          {category === 'Webinars' && 'Live sessions and recorded webinars from industry experts and thought leaders.'}
          {category === 'Training' && 'Educational content and professional development resources for MGA professionals.'}
        </p>
        
        <div className="flex items-center text-fase-navy group-hover:text-fase-black transition-colors">
          <span className="text-sm font-medium">Browse videos</span>
          <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );

  const VideoCard = ({ video }: { video: Video }) => {
    const handleVideoClick = async () => {
      setSelectedVideo(video);
      
      // Increment view count
      try {
        await incrementVideoViews(video.id);
        // Update local video state
        setVideos(prev => prev.map(v => 
          v.id === video.id ? { ...v, views: v.views + 1 } : v
        ));
      } catch (error) {
        console.error('Error incrementing views:', error);
      }
      
      // Load comments for this video
      try {
        const comments = await getVideoComments(video.id);
        setVideoComments(comments);
      } catch (error) {
        console.error('Error loading comments:', error);
        setVideoComments([]);
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div 
          className="relative cursor-pointer"
          onClick={handleVideoClick}
        >
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-48 object-cover"
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
              <span>{video.likes} likes</span>
            </div>
          </div>
          
          <h3 className="font-noto-serif font-semibold text-fase-navy mb-2 line-clamp-2 cursor-pointer hover:text-fase-gold transition-colors"
              onClick={handleVideoClick}>
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
    );
  };



  // Show loading while checking access
  if (authLoading || checkingAccess) {
    return (
      <PageLayout currentPage="knowledge-base-webinars">
        <div className="text-center py-20">
          <div className="animate-pulse">
            <div className="h-8 bg-fase-cream rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-fase-cream rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <>
      <PageLayout currentPage="knowledge-base-webinars" sections={sections} hideNavigation={true}>
      <main className="flex-1 bg-fase-cream min-h-[calc(100vh-5.5rem)] flex flex-col">
        {/* Main Console */}
        <div className="flex flex-col overflow-hidden m-6">
          <div className="flex flex-col bg-white rounded-lg shadow-lg border border-fase-light-gold overflow-hidden" style={{height: 'calc(100vh - 8rem)'}}>
            {/* Console Header */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-noto-serif font-bold text-fase-navy">
                  {selectedVideo ? selectedVideo.title : selectedCategory || 'Knowledge Base'}
                </h1>
                <div className="flex items-center space-x-4">
                  {selectedCategory && (
                    <div className="flex items-center space-x-2 text-sm">
                      <button 
                        onClick={() => {
                          setSelectedCategory(null);
                          setSelectedVideo(null);
                        }}
                        className="text-fase-navy hover:text-fase-gold transition-colors"
                      >
                        Categories
                      </button>
                      <svg className="w-4 h-4 text-fase-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <button 
                        onClick={() => setSelectedVideo(null)}
                        className="text-fase-black hover:text-fase-gold transition-colors"
                      >
                        {selectedCategory}
                      </button>
                    </div>
                  )}
                  {isAdmin && (
                    <Button 
                      variant="primary" 
                      size="small"
                      onClick={() => setShowAddVideo(true)}
                    >
                      Link Video
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Console Content */}
            <div className="flex-1 flex overflow-hidden min-h-0">
          {selectedVideo ? (
            /* Video Player Mode */
            <>
              {/* Main Video Area */}
              <div className="flex-1 flex items-center justify-center p-6 bg-white">
                <div className="w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
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

              {/* Sidebar with Details and Comments */}
              <div className="w-[28rem] bg-white flex flex-col overflow-hidden p-4">
                {/* Video Details */}
                <div className="flex-shrink-0 pb-4">
                  <p className="text-xs text-fase-black mb-3">Presented by <strong>{selectedVideo.author}</strong></p>
                  <p className="text-fase-black mb-4 leading-relaxed text-sm">{selectedVideo.description}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {selectedVideo.tags.map(tag => (
                      <span key={tag} className="bg-fase-light-blue text-fase-navy text-xs px-2 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Add Comment Form */}
                  <div className="mb-4">
                    <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">
                      Add a comment
                    </h3>
                    <div>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts..."
                        className="w-full p-2 border border-fase-light-gold rounded focus:outline-none focus:ring-1 focus:ring-fase-navy focus:border-fase-navy text-xs"
                        rows={2}
                      />
                      <div className="flex justify-end mt-1">
                        <Button 
                          variant="primary" 
                          size="small"
                          onClick={async () => {
                            if (!user) {
                              alert('Please log in to post a comment');
                              return;
                            }
                            if (!newComment.trim()) {
                              alert('Please enter a comment');
                              return;
                            }
                            if (!selectedVideo) return;

                            try {
                              await createComment(
                                selectedVideo.id,
                                user.uid,
                                user.displayName || user.email?.split('@')[0] || 'Anonymous',
                                newComment.trim()
                              );
                              setNewComment('');
                              
                              // Refresh comments list
                              const comments = await getVideoComments(selectedVideo.id);
                              setVideoComments(comments);
                            } catch (error) {
                              console.error('Error posting comment:', error);
                              alert('Error posting comment. Please try again.');
                            }
                          }}
                        >
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-shrink-0 pb-3">
                    <h3 className="text-sm font-noto-serif font-semibold text-fase-navy mb-2">
                      Comments ({videoComments.length})
                    </h3>
                  </div>

                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {videoComments.map(comment => (
                      <div key={comment.id} className="bg-gray-50 p-3 rounded text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-fase-navy text-xs">{comment.authorName}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-fase-black">
                              {comment.createdAt?.seconds ? 
                                new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : 
                                'Recent'
                              }
                            </span>
                            {user?.uid === comment.authorUid && (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    setEditingComment(comment.id);
                                    setEditText(comment.text);
                                  }}
                                  className="text-fase-black hover:text-fase-navy transition-colors"
                                  title="Edit comment"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-fase-black hover:text-red-600 transition-colors"
                                  title="Delete comment"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {editingComment === comment.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full p-2 border border-fase-light-gold rounded focus:outline-none focus:ring-1 focus:ring-fase-navy focus:border-fase-navy text-xs"
                              rows={2}
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setEditingComment(null);
                                  setEditText('');
                                }}
                                className="px-2 py-1 text-xs text-fase-black hover:text-fase-navy transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditComment(comment.id)}
                                className="px-2 py-1 bg-fase-navy text-white text-xs rounded hover:bg-fase-black transition-colors"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-fase-black text-xs">{comment.text}</p>
                        )}
                      </div>
                    ))}
                    {videoComments.length === 0 && (
                      <p className="text-fase-black text-center py-4 text-xs">No comments yet. Be the first to comment!</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Browse Mode */
            <div className="flex-1 flex flex-col">
              {selectedCategory && (
                /* Search within category */
                <div className="p-4 h-24 bg-fase-cream">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search in ${selectedCategory}...`}
                      className="w-full pl-10 pr-4 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy focus:border-transparent"
                    />
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-fase-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="mt-2 text-sm text-fase-black">
                    Showing {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} in {selectedCategory}
                    {searchQuery && ` matching "${searchQuery}"`}
                  </div>
                </div>
              )}

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fase-navy mx-auto mb-4"></div>
                    <p className="text-fase-black">Loading videos...</p>
                  </div>
                ) : !selectedCategory ? (
                  /* Category Folders */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.slice(1).map(category => (
                      <CategoryCard 
                        key={category}
                        category={category}
                        count={getCategoryCount(category)}
                        onClick={() => setSelectedCategory(category)}
                      />
                    ))}
                  </div>
                ) : (
                  /* Video Grid for Selected Category */
                  <div>
                    {filteredVideos.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVideos.map(video => (
                          <VideoCard key={video.id} video={video} />
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
                            ? `No videos in ${selectedCategory} match your search.`
                            : `No videos available in ${selectedCategory} yet.`
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
                )}
              </div>
            </div>
          )}
            </div>
          </div>
        </div>

        {/* Add Video Modal */}
        {showAddVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl border border-fase-light-gold max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-noto-serif font-bold text-fase-navy">Link Video</h2>
                  <button
                    onClick={() => setShowAddVideo(false)}
                    className="text-fase-black hover:text-fase-navy"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-fase-navy mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={videoForm.title}
                      onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                      placeholder="Enter video title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fase-navy mb-2">
                      YouTube Video ID *
                    </label>
                    <input
                      type="text"
                      value={videoForm.youtubeId}
                      onChange={(e) => setVideoForm(prev => ({ ...prev, youtubeId: e.target.value }))}
                      className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                      placeholder="e.g., dQw4w9WgXcQ"
                    />
                    <p className="text-xs text-fase-black mt-1">
                      Get this from the YouTube URL: youtube.com/watch?v=<strong>VIDEO_ID</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-fase-navy mb-2">
                      Description
                    </label>
                    <textarea
                      value={videoForm.description}
                      onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                      placeholder="Enter video description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-fase-navy mb-2">
                        Category *
                      </label>
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
                      <label className="block text-sm font-medium text-fase-navy mb-2">
                        Author *
                      </label>
                      <input
                        type="text"
                        value={videoForm.author}
                        onChange={(e) => setVideoForm(prev => ({ ...prev, author: e.target.value }))}
                        className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                        placeholder="Speaker/Author name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-fase-navy mb-2">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={videoForm.duration}
                        onChange={(e) => setVideoForm(prev => ({ ...prev, duration: e.target.value }))}
                        className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                        placeholder="e.g., 45:32"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-fase-navy mb-2">
                        Tags
                      </label>
                      <input
                        type="text"
                        value={videoForm.tags}
                        onChange={(e) => setVideoForm(prev => ({ ...prev, tags: e.target.value }))}
                        className="w-full px-3 py-2 border border-fase-light-gold rounded-lg focus:outline-none focus:ring-2 focus:ring-fase-navy"
                        placeholder="tag1, tag2, tag3"
                      />
                    </div>
                  </div>


                  <div className="flex justify-end space-x-3 pt-6 border-t border-fase-light-gold">
                    <Button
                      variant="secondary"
                      size="medium"
                      onClick={() => setShowAddVideo(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="medium"
                      onClick={handleAddVideo}
                    >
                      Link Video
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
              The Knowledge Base is exclusively available to approved FASE members.
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
                    ? 'Your membership application is being reviewed. Once approved, you&apos;ll have full access to our knowledge base with industry insights, regulatory updates, and educational resources.'
                    : 'Join FASE to access our comprehensive knowledge base with exclusive content, industry insights, and professional development resources.'
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