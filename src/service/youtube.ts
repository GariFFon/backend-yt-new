interface YouTubeComment {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    authorDisplayName: string;
    authorProfileImageUrl: string;
    authorChannelUrl: string;
    authorChannelId: { value: string };
    videoId: string;
    textDisplay: string;
    textOriginal: string;
    likeCount: number;
    publishedAt: string;
    updatedAt: string;
    parentId?: string;
    totalReplyCount?: number;
  };
}

interface YouTubeVideo {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    defaultAudioLanguage?: string;
  };
  contentDetails: {
    duration: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
}

const apiKey: string = process.env.YOUTUBE_API_KEY || '';
const baseUrl = 'https://www.googleapis.com/youtube/v3';


function extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
}


export async function getCommentsCount(url: string): Promise<number> {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    const apiUrl = `${baseUrl}/videos?part=statistics&id=${videoId}&key=${apiKey}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as any;
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }
    const commentCount = parseInt(data.items[0].statistics.commentCount);
    return commentCount;
}

async function getVideoDetails(videoId: string) {
    const url = `${baseUrl}/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video: YouTubeVideo = data.items[0];

    return {
      id: video.id,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default.url,
      viewCount: parseInt(video.statistics.viewCount) || 0,
      likeCount: parseInt(video.statistics.likeCount) || 0,
      commentCount: parseInt(video.statistics.commentCount) || 0,
      duration: video.contentDetails.duration,
      publishedAt: new Date(video.snippet.publishedAt),
    };
  }

  async function getVideoComments(videoId: string): Promise<YouTubeComment[]> {
    const comments: YouTubeComment[] = [];
    let nextPageToken: string | undefined;
    let pageCount = 0;

    console.log(`🔍 Starting to fetch comments for video: ${videoId}`);

    do {
      pageCount++;
      const url = `${baseUrl}/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=100&order=time&key=${apiKey}${
        nextPageToken ? `&pageToken=${nextPageToken}` : ''
      }`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 403) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            throw new Error('Comments are disabled for this video or API quota exceeded');
          }
          throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
        }

        const data:any = await response.json();
        
        if (!data.items || data.items.length === 0) {
          console.log(`📄 Page ${pageCount}: No more comments found`);
          break;
        }

        let pageComments = 0;
        
        for (const item of data.items) {
          // Add the main comment
          comments.push({
            ...item.snippet.topLevelComment,
            snippet: {
              ...item.snippet.topLevelComment.snippet
            },
          });
          pageComments++;

          // Add replies if they exist
          if (item.replies && item.replies.comments) {
            for (const reply of item.replies.comments) {
              comments.push({
                ...reply,
                snippet: {
                  ...reply.snippet,
                  parentId: item.snippet.topLevelComment.id,
                },
              });
              pageComments++;
            }
          }
        }

        console.log(`📄 Page ${pageCount}: Fetched ${pageComments} comments (Total: ${comments.length})`);
        nextPageToken = data.nextPageToken;
        
        // Add small delay to avoid rate limiting
        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`❌ Error fetching page ${pageCount}:`, error);
        // If it's an API error, break the loop
        if (error instanceof Error && error.message.includes('API')) {
          break;
        }
        // For other errors, continue with next page if we have a token
        if (!nextPageToken) break;
      }
      
      // Log progress for debugging
      if (pageCount % 5 === 0) {
        console.log(`📈 Progress: ${comments.length} comments fetched after ${pageCount} pages`);
      }
      
      // Remove artificial limit - fetch all comments
      // Only break if we hit API limits or no more comments
    } while (nextPageToken);

    console.log(`✅ Comment fetching completed: ${comments.length} total comments from ${pageCount} pages`);
    return comments;
  }









  // main function to fetch video details and comments

export async function fetchVideoData(url: string) {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    const [videoDetails, comments] = await Promise.all([
      getVideoDetails(videoId),
      getVideoComments(videoId),
    ]);

    // Log comment fetching statistics
    const reportedCommentCount = videoDetails.commentCount || 0;
    const fetchedCommentCount = comments.length;
    
    console.log("\n📊 Comment Fetching Statistics:");
    console.log(`📺 Video: ${videoDetails.title}`);
    console.log(`📈 Comments reported by YouTube API: ${reportedCommentCount}`);
    console.log(`💾 Comments actually fetched: ${fetchedCommentCount}`);
    
    if (fetchedCommentCount < reportedCommentCount) {
      const missingCount = reportedCommentCount - fetchedCommentCount;
      console.log(`⚠️  Missing comments: ${missingCount} (${((missingCount / reportedCommentCount) * 100).toFixed(1)}%)`);
      console.log(`📋 Possible reasons: Private comments, deleted comments, API pagination limits, or comments disabled on replies`);
    } else {
      console.log(`✅ All available comments fetched successfully!`);
    }

    return {
      video: { ...videoDetails, id: videoId, url },
      comments: comments,
      fetchingStats: {
        reportedCount: reportedCommentCount,
        fetchedCount: fetchedCommentCount,
        missingCount: Math.max(0, reportedCommentCount - fetchedCommentCount),
        fetchSuccess: fetchedCommentCount >= reportedCommentCount
      }
    };
  }





export class YouTubeService {
  
}
