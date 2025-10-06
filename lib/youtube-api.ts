// YouTube Data API integration
// You'll need to set NEXT_PUBLIC_YOUTUBE_API_KEY in your .env.local

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export interface YouTubeVideoData {
  title: string;
  description: string;
  duration: string;
  uploadDate: string;
  viewCount: number;
  likeCount: number;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    maxres: string;
  };
}

export const getYouTubeVideoData = async (videoId: string): Promise<YouTubeVideoData | null> => {
  if (!YOUTUBE_API_KEY) {
    console.warn('YouTube API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics,contentDetails&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = data.items[0];
    
    // Convert ISO 8601 duration (PT4M13S) to readable format (4:13)
    const duration = convertDuration(video.contentDetails.duration);
    
    return {
      title: video.snippet.title,
      description: video.snippet.description,
      duration,
      uploadDate: video.snippet.publishedAt,
      viewCount: parseInt(video.statistics.viewCount) || 0,
      likeCount: parseInt(video.statistics.likeCount) || 0,
      thumbnails: {
        default: video.snippet.thumbnails.default?.url || '',
        medium: video.snippet.thumbnails.medium?.url || '',
        high: video.snippet.thumbnails.high?.url || '',
        maxres: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || ''
      }
    };
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    return null;
  }
};

// Convert YouTube ISO 8601 duration to readable format
function convertDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!match) return '0:00';
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}