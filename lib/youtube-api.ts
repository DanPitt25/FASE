// YouTube Data API integration
// You'll need to set these in your .env.local:
// NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
// YOUTUBE_CLIENT_ID=your_client_id
// YOUTUBE_CLIENT_SECRET=your_client_secret

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;

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

export interface YouTubeLiveStream {
  id: string;
  title: string;
  description: string;
  streamKey: string;
  streamUrl: string;
  watchUrl: string;
  status: 'created' | 'ready' | 'testing' | 'live' | 'complete' | 'error';
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
}

export interface LiveStreamConfig {
  title: string;
  description: string;
  privacy: 'public' | 'unlisted' | 'private';
  enableAutoStart?: boolean;
  enableAutoStop?: boolean;
  enableDvr?: boolean;
  enableContentEncryption?: boolean;
  enableEmbed?: boolean;
  recordFromStart?: boolean;
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

// ============== YOUTUBE LIVE STREAMING FUNCTIONS ==============

// Create a new YouTube Live Stream
export const createYouTubeLiveStream = async (
  accessToken: string,
  config: LiveStreamConfig
): Promise<YouTubeLiveStream> => {
  try {
    // Step 1: Create Live Broadcast
    const broadcastResponse = await fetch('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: config.title,
          description: config.description,
          scheduledStartTime: new Date().toISOString(), // Start immediately
        },
        status: {
          privacyStatus: config.privacy || 'unlisted',
          selfDeclaredMadeForKids: false,
        },
        contentDetails: {
          enableAutoStart: config.enableAutoStart ?? true,
          enableAutoStop: config.enableAutoStop ?? true,
          enableDvr: config.enableDvr ?? true,
          enableContentEncryption: config.enableContentEncryption ?? false,
          enableEmbed: config.enableEmbed ?? true,
          recordFromStart: config.recordFromStart ?? true,
          startWithSlate: false,
        },
      }),
    });

    if (!broadcastResponse.ok) {
      const error = await broadcastResponse.json();
      throw new Error(`Failed to create broadcast: ${error.error?.message || broadcastResponse.statusText}`);
    }

    const broadcast = await broadcastResponse.json();

    // Step 2: Create Live Stream
    const streamResponse = await fetch('https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: `${config.title} - Stream`,
          description: 'Live stream for ' + config.title,
        },
        cdn: {
          frameRate: '30fps',
          ingestionType: 'rtmp',
          resolution: '1080p',
        },
      }),
    });

    if (!streamResponse.ok) {
      const error = await streamResponse.json();
      throw new Error(`Failed to create stream: ${error.error?.message || streamResponse.statusText}`);
    }

    const stream = await streamResponse.json();

    // Step 3: Bind Stream to Broadcast
    const bindResponse = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcast.id}&streamId=${stream.id}&part=snippet,status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!bindResponse.ok) {
      const error = await bindResponse.json();
      throw new Error(`Failed to bind stream: ${error.error?.message || bindResponse.statusText}`);
    }

    return {
      id: broadcast.id,
      title: broadcast.snippet.title,
      description: broadcast.snippet.description,
      streamKey: stream.cdn.ingestionInfo.streamName,
      streamUrl: stream.cdn.ingestionInfo.ingestionAddress,
      watchUrl: `https://www.youtube.com/watch?v=${broadcast.id}`,
      status: 'created',
      scheduledStartTime: broadcast.snippet.scheduledStartTime,
    };
  } catch (error) {
    console.error('Error creating YouTube live stream:', error);
    throw error;
  }
};

// Start YouTube Live Broadcast
export const startYouTubeBroadcast = async (
  accessToken: string,
  broadcastId: string
): Promise<{ status: string; message: string }> => {
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=live&id=${broadcastId}&part=status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to start broadcast: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return {
      status: 'success',
      message: 'Broadcast started successfully',
    };
  } catch (error) {
    console.error('Error starting YouTube broadcast:', error);
    throw error;
  }
};

// Stop YouTube Live Broadcast
export const stopYouTubeBroadcast = async (
  accessToken: string,
  broadcastId: string
): Promise<{ status: string; message: string }> => {
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=complete&id=${broadcastId}&part=status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to stop broadcast: ${error.error?.message || response.statusText}`);
    }

    return {
      status: 'success',
      message: 'Broadcast stopped successfully',
    };
  } catch (error) {
    console.error('Error stopping YouTube broadcast:', error);
    throw error;
  }
};

// Get YouTube Live Stream Status
export const getYouTubeBroadcastStatus = async (
  accessToken: string,
  broadcastId: string
): Promise<{ status: string; viewerCount?: number }> => {
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/liveBroadcasts?part=status,statistics&id=${broadcastId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get broadcast status: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('Broadcast not found');
    }

    const broadcast = data.items[0];
    return {
      status: broadcast.status.lifeCycleStatus,
      viewerCount: parseInt(broadcast.statistics?.concurrentViewers) || 0,
    };
  } catch (error) {
    console.error('Error getting broadcast status:', error);
    throw error;
  }
};