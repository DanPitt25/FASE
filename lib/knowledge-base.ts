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
  // Live streaming fields
  isLive: boolean;
  liveStartTime?: any;
  liveEndTime?: any;
  requiresRegistration: boolean;
  accessLevel: 'free' | 'member' | 'premium';
  maxViewers?: number;
  currentViewers?: number;
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

export interface WebinarRegistration {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userEmail: string;
  registeredAt: any;
  attended?: boolean;
  joinedAt?: any;
  leftAt?: any;
}

// ============== ADMIN CHECK FUNCTIONS ==============

export const isAdmin = async (uid?: string): Promise<boolean> => {
  try {
    const { checkAdminClaim } = await import('./admin-claims');
    return await checkAdminClaim();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const requireAdmin = async (uid?: string): Promise<void> => {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Admin access required');
  }
};

// Check if user has member access
export const hasMemberAccess = async (uid: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'accounts', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const user = userSnap.data();
      return user.access === 'member' || user.access === 'premium' || user.access === 'admin';
    }
    return false;
  } catch (error) {
    console.error('Error checking member status:', error);
    return false;
  }
};

// Check if user has premium access
export const hasPremiumAccess = async (uid: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'accounts', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const user = userSnap.data();
      return user.access === 'premium' || user.access === 'admin';
    }
    return false;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
};

// Check if user can access specific video
export const canAccessVideo = async (uid: string | null, video: Video): Promise<{ canAccess: boolean; reason?: string }> => {
  // Free videos are accessible to everyone
  if (video.accessLevel === 'free') {
    return { canAccess: true };
  }
  
  // Must be logged in for member/premium content
  if (!uid) {
    return { canAccess: false, reason: 'Please log in to access this content' };
  }
  
  // Check member access
  if (video.accessLevel === 'member') {
    const hasAccess = await hasMemberAccess(uid);
    if (!hasAccess) {
      return { canAccess: false, reason: 'This content is for members only' };
    }
  }
  
  // Check premium access
  if (video.accessLevel === 'premium') {
    const hasAccess = await hasPremiumAccess(uid);
    if (!hasAccess) {
      return { canAccess: false, reason: 'This content is for premium members only' };
    }
  }
  
  return { canAccess: true };
};

// ============== VIDEO FUNCTIONS ==============

// Create new video (admin only)
export const createVideo = async (
  uid: string,
  videoData: Omit<Video, 'id' | 'views' | 'likes' | 'uploadedBy' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  // Note: Admin check should be done by caller
  
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
  // Note: Admin check should be done by caller
  
  const videoRef = doc(db, 'videos', videoId);
  await updateDoc(videoRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

// Delete video (admin only)
export const deleteVideo = async (uid: string, videoId: string): Promise<void> => {
  // Note: Admin check should be done by caller
  
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

// Get live streams
export const getLiveStreams = async (): Promise<Video[]> => {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(
      videosRef, 
      where('isLive', '==', true),
      where('status', '==', 'published'),
      orderBy('liveStartTime', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Video);
  } catch (error) {
    console.error('Error getting live streams:', error);
    return [];
  }
};

// Update viewer count for live stream
export const updateLiveViewerCount = async (videoId: string, increment: boolean = true): Promise<void> => {
  const videoRef = doc(db, 'videos', videoId);
  const videoSnap = await getDoc(videoRef);
  
  if (videoSnap.exists()) {
    const currentViewers = videoSnap.data().currentViewers || 0;
    const newCount = increment ? currentViewers + 1 : Math.max(0, currentViewers - 1);
    
    await updateDoc(videoRef, {
      currentViewers: newCount,
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
  // Note: Admin check should be done by caller since this runs client-side
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
  // Note: Admin check should be done by caller
  
  const commentRef = doc(db, 'comments', commentId);
  await updateDoc(commentRef, {
    status,
    moderatedBy: uid,
    moderatedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

// Update comment (author only)
export const updateComment = async (
  uid: string,
  commentId: string,
  newText: string
): Promise<void> => {
  const commentRef = doc(db, 'comments', commentId);
  const commentSnap = await getDoc(commentRef);
  
  if (!commentSnap.exists()) {
    throw new Error('Comment not found');
  }
  
  const comment = commentSnap.data() as Comment;
  if (comment.authorUid !== uid) {
    throw new Error('Only the author can edit this comment');
  }
  
  await updateDoc(commentRef, {
    text: newText,
    updatedAt: serverTimestamp()
  });
};

// Delete comment (author or admin)
export const deleteComment = async (uid: string, commentId: string): Promise<void> => {
  const commentRef = doc(db, 'comments', commentId);
  const commentSnap = await getDoc(commentRef);
  
  if (!commentSnap.exists()) {
    throw new Error('Comment not found');
  }
  
  const comment = commentSnap.data() as Comment;
  const isAuthor = comment.authorUid === uid;
  const adminStatus = await isAdmin();
  
  if (!isAuthor && !adminStatus) {
    throw new Error('Only the author or an admin can delete this comment');
  }
  
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

// ============== WEBINAR REGISTRATION FUNCTIONS ==============

// Register user for webinar
export const registerForWebinar = async (
  videoId: string,
  userId: string,
  userName: string,
  userEmail: string
): Promise<string> => {
  // Check if already registered
  const registrationsRef = collection(db, 'webinar_registrations');
  const existingQuery = query(
    registrationsRef,
    where('videoId', '==', videoId),
    where('userId', '==', userId)
  );
  
  const existingSnap = await getDocs(existingQuery);
  if (!existingSnap.empty) {
    throw new Error('Already registered for this webinar');
  }
  
  const registrationId = doc(collection(db, 'webinar_registrations')).id;
  const registrationRef = doc(db, 'webinar_registrations', registrationId);
  
  const registration: WebinarRegistration = {
    id: registrationId,
    videoId,
    userId,
    userName,
    userEmail,
    registeredAt: serverTimestamp()
  };
  
  await setDoc(registrationRef, registration);
  return registrationId;
};

// Check if user is registered for webinar
export const isRegisteredForWebinar = async (videoId: string, userId: string): Promise<boolean> => {
  try {
    const registrationsRef = collection(db, 'webinar_registrations');
    const q = query(
      registrationsRef,
      where('videoId', '==', videoId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking registration:', error);
    return false;
  }
};

// Get webinar registrations (admin only)
export const getWebinarRegistrations = async (uid: string, videoId: string): Promise<WebinarRegistration[]> => {
  // Note: Admin check should be done by caller
  
  try {
    const registrationsRef = collection(db, 'webinar_registrations');
    const q = query(
      registrationsRef,
      where('videoId', '==', videoId),
      orderBy('registeredAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as WebinarRegistration);
  } catch (error) {
    console.error('Error getting registrations:', error);
    return [];
  }
};

// Mark attendance for webinar
export const markWebinarAttendance = async (videoId: string, userId: string, action: 'join' | 'leave'): Promise<void> => {
  try {
    const registrationsRef = collection(db, 'webinar_registrations');
    const q = query(
      registrationsRef,
      where('videoId', '==', videoId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const registrationRef = querySnapshot.docs[0].ref;
      const updateData = action === 'join' 
        ? { attended: true, joinedAt: serverTimestamp() }
        : { leftAt: serverTimestamp() };
      
      await updateDoc(registrationRef, updateData);
    }
  } catch (error) {
    console.error('Error marking attendance:', error);
  }
};