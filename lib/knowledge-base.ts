import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  limit 
} from 'firebase/firestore';
import { db } from './firebase';

export interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  thumbnail: string;
  category: 'Regulatory' | 'Technology' | 'Market Analysis' | 'Webinars' | 'Training';
  tags: string[];
  author: string;
  duration: string;
  uploadDate: any;
  views: number;
  likes: number;
  status: 'draft' | 'published' | 'archived';
  uploadedBy: string; // uid of admin who uploaded
  createdAt: any;
  updatedAt: any;
}

export interface Comment {
  id: string;
  videoId: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: any;
  updatedAt?: any;
  status: 'approved' | 'pending' | 'rejected';
  moderatedBy?: string; // uid of admin who moderated
  moderatedAt?: any;
}

// ============== ADMIN CHECK FUNCTIONS ==============

export const isAdmin = async (uid: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const user = userSnap.data();
      return user.access === 'admin';
    }
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const requireAdmin = async (uid: string): Promise<void> => {
  const adminStatus = await isAdmin(uid);
  if (!adminStatus) {
    throw new Error('Admin access required');
  }
};

// ============== VIDEO FUNCTIONS ==============

// Create new video (admin only)
export const createVideo = async (
  uid: string,
  videoData: Omit<Video, 'id' | 'views' | 'likes' | 'uploadedBy' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  await requireAdmin(uid);
  
  const videoId = doc(collection(db, 'videos')).id;
  const videoRef = doc(db, 'videos', videoId);
  
  const video: Video = {
    id: videoId,
    views: 0,
    likes: 0,
    uploadedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...videoData
  };
  
  await setDoc(videoRef, video);
  return videoId;
};

// Get all videos (with optional filtering)
export const getVideos = async (
  category?: string,
  status: Video['status'] = 'published'
): Promise<Video[]> => {
  try {
    const videosRef = collection(db, 'videos');
    let q = query(videosRef, where('status', '==', status), orderBy('uploadDate', 'desc'));
    
    if (category && category !== 'All') {
      q = query(videosRef, where('category', '==', category), where('status', '==', status), orderBy('uploadDate', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Video);
  } catch (error) {
    console.error('Error getting videos:', error);
    return [];
  }
};

// Get single video
export const getVideo = async (videoId: string): Promise<Video | null> => {
  try {
    const videoRef = doc(db, 'videos', videoId);
    const videoSnap = await getDoc(videoRef);
    
    if (videoSnap.exists()) {
      return videoSnap.data() as Video;
    }
    return null;
  } catch (error) {
    console.error('Error getting video:', error);
    return null;
  }
};

// Update video (admin only)
export const updateVideo = async (
  uid: string,
  videoId: string,
  updates: Partial<Omit<Video, 'id' | 'uploadedBy' | 'createdAt'>>
): Promise<void> => {
  await requireAdmin(uid);
  
  const videoRef = doc(db, 'videos', videoId);
  await updateDoc(videoRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// Delete video (admin only)
export const deleteVideo = async (uid: string, videoId: string): Promise<void> => {
  await requireAdmin(uid);
  
  const videoRef = doc(db, 'videos', videoId);
  await deleteDoc(videoRef);
  
  // Also delete all comments for this video
  const commentsRef = collection(db, 'comments');
  const q = query(commentsRef, where('videoId', '==', videoId));
  const commentSnapshot = await getDocs(q);
  
  const deletePromises = commentSnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
};

// Increment view count
export const incrementVideoViews = async (videoId: string): Promise<void> => {
  const videoRef = doc(db, 'videos', videoId);
  const videoSnap = await getDoc(videoRef);
  
  if (videoSnap.exists()) {
    const currentViews = videoSnap.data().views || 0;
    await updateDoc(videoRef, {
      views: currentViews + 1,
      updatedAt: serverTimestamp()
    });
  }
};

// ============== COMMENT FUNCTIONS ==============

// Create comment
export const createComment = async (
  videoId: string,
  authorUid: string,
  authorName: string,
  text: string
): Promise<string> => {
  const commentId = doc(collection(db, 'comments')).id;
  const commentRef = doc(db, 'comments', commentId);
  
  const comment: Comment = {
    id: commentId,
    videoId,
    authorUid,
    authorName,
    text,
    status: 'approved', // Comments are instantly approved for members
    createdAt: serverTimestamp()
  };
  
  await setDoc(commentRef, comment);
  return commentId;
};

// Get comments for video
export const getVideoComments = async (
  videoId: string,
  status: Comment['status'] = 'approved'
): Promise<Comment[]> => {
  try {
    const commentsRef = collection(db, 'comments');
    const q = query(
      commentsRef, 
      where('videoId', '==', videoId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Comment);
  } catch (error) {
    console.error('Error getting comments:', error);
    return [];
  }
};

// Get pending comments (admin only)
export const getPendingComments = async (uid: string): Promise<Comment[]> => {
  await requireAdmin(uid);
  
  try {
    const commentsRef = collection(db, 'comments');
    const q = query(
      commentsRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Comment);
  } catch (error) {
    console.error('Error getting pending comments:', error);
    return [];
  }
};

// Moderate comment (admin only)
export const moderateComment = async (
  uid: string,
  commentId: string,
  status: 'approved' | 'rejected'
): Promise<void> => {
  await requireAdmin(uid);
  
  const commentRef = doc(db, 'comments', commentId);
  await updateDoc(commentRef, {
    status,
    moderatedBy: uid,
    moderatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

// Delete comment (admin only)
export const deleteComment = async (uid: string, commentId: string): Promise<void> => {
  await requireAdmin(uid);
  
  const commentRef = doc(db, 'comments', commentId);
  await deleteDoc(commentRef);
};

// ============== SEARCH FUNCTIONS ==============

// Search videos
export const searchVideos = async (
  searchQuery: string,
  category?: string,
  status: Video['status'] = 'published'
): Promise<Video[]> => {
  try {
    // Note: Firestore doesn't support full-text search natively
    // For production, consider using Algolia or similar service
    // This is a basic implementation that searches title and tags
    
    const videosRef = collection(db, 'videos');
    let q = query(videosRef, where('status', '==', status));
    
    if (category && category !== 'All') {
      q = query(videosRef, where('category', '==', category), where('status', '==', status));
    }
    
    const querySnapshot = await getDocs(q);
    const videos = querySnapshot.docs.map(doc => doc.data() as Video);
    
    // Client-side filtering for search
    const searchTerm = searchQuery.toLowerCase();
    return videos.filter(video =>
      video.title.toLowerCase().includes(searchTerm) ||
      video.description.toLowerCase().includes(searchTerm) ||
      video.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      video.author.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    console.error('Error searching videos:', error);
    return [];
  }
};