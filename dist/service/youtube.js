"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeService = void 0;
exports.getCommentsCount = getCommentsCount;
exports.fetchVideoData = fetchVideoData;
const apiKey = process.env.YOUTUBE_API_KEY || '';
const baseUrl = 'https://www.googleapis.com/youtube/v3';
function extractVideoId(url) {
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
function getCommentsCount(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }
        const apiUrl = `${baseUrl}/videos?part=statistics&id=${videoId}&key=${apiKey}`;
        const response = yield fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
        }
        const data = yield response.json();
        if (!data.items || data.items.length === 0) {
            throw new Error('Video not found');
        }
        const commentCount = parseInt(data.items[0].statistics.commentCount);
        return commentCount;
    });
}
function getVideoDetails(videoId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const url = `${baseUrl}/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
        const response = yield fetch(url);
        if (!response.ok) {
            throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
        }
        const data = yield response.json();
        if (!data.items || data.items.length === 0) {
            throw new Error('Video not found');
        }
        const video = data.items[0];
        return {
            id: video.id,
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            description: video.snippet.description,
            thumbnailUrl: ((_a = video.snippet.thumbnails.high) === null || _a === void 0 ? void 0 : _a.url) || ((_b = video.snippet.thumbnails.medium) === null || _b === void 0 ? void 0 : _b.url) || video.snippet.thumbnails.default.url,
            viewCount: parseInt(video.statistics.viewCount) || 0,
            likeCount: parseInt(video.statistics.likeCount) || 0,
            commentCount: parseInt(video.statistics.commentCount) || 0,
            duration: video.contentDetails.duration,
            publishedAt: new Date(video.snippet.publishedAt),
        };
    });
}
function getVideoComments(videoId) {
    return __awaiter(this, void 0, void 0, function* () {
        const comments = [];
        let nextPageToken;
        let pageCount = 0;
        console.log(`🔍 Starting to fetch comments for video: ${videoId}`);
        do {
            pageCount++;
            const url = `${baseUrl}/commentThreads?part=snippet,replies&videoId=${videoId}&maxResults=100&order=time&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            try {
                const response = yield fetch(url);
                if (!response.ok) {
                    if (response.status === 403) {
                        const errorData = yield response.json();
                        console.error('API Error:', errorData);
                        throw new Error('Comments are disabled for this video or API quota exceeded');
                    }
                    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
                }
                const data = yield response.json();
                if (!data.items || data.items.length === 0) {
                    console.log(`📄 Page ${pageCount}: No more comments found`);
                    break;
                }
                let pageComments = 0;
                for (const item of data.items) {
                    // Add the main comment
                    comments.push(Object.assign(Object.assign({}, item.snippet.topLevelComment), { snippet: Object.assign({}, item.snippet.topLevelComment.snippet) }));
                    pageComments++;
                    // Add replies if they exist
                    if (item.replies && item.replies.comments) {
                        for (const reply of item.replies.comments) {
                            comments.push(Object.assign(Object.assign({}, reply), { snippet: Object.assign(Object.assign({}, reply.snippet), { parentId: item.snippet.topLevelComment.id }) }));
                            pageComments++;
                        }
                    }
                }
                console.log(`📄 Page ${pageCount}: Fetched ${pageComments} comments (Total: ${comments.length})`);
                nextPageToken = data.nextPageToken;
                // Add small delay to avoid rate limiting
                if (nextPageToken) {
                    yield new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            catch (error) {
                console.error(`❌ Error fetching page ${pageCount}:`, error);
                // If it's an API error, break the loop
                if (error instanceof Error && error.message.includes('API')) {
                    break;
                }
                // For other errors, continue with next page if we have a token
                if (!nextPageToken)
                    break;
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
    });
}
// main function to fetch video details and comments
function fetchVideoData(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }
        const [videoDetails, comments] = yield Promise.all([
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
        }
        else {
            console.log(`✅ All available comments fetched successfully!`);
        }
        return {
            video: Object.assign(Object.assign({}, videoDetails), { id: videoId, url }),
            comments: comments.map(comment => ({
                id: comment.id,
                authorDisplayName: comment.snippet.authorDisplayName,
                authorProfileImageUrl: comment.snippet.authorProfileImageUrl,
                textDisplay: comment.snippet.textDisplay,
                textOriginal: comment.snippet.textOriginal,
                likeCount: comment.snippet.likeCount,
                replyCount: comment.snippet.totalReplyCount || 0,
                publishedAt: new Date(comment.snippet.publishedAt),
                updatedAt: comment.snippet.updatedAt ? new Date(comment.snippet.updatedAt) : null,
                parentId: comment.snippet.parentId || null,
            })),
            fetchingStats: {
                reportedCount: reportedCommentCount,
                fetchedCount: fetchedCommentCount,
                missingCount: Math.max(0, reportedCommentCount - fetchedCommentCount),
                fetchSuccess: fetchedCommentCount >= reportedCommentCount
            }
        };
    });
}
class YouTubeService {
}
exports.YouTubeService = YouTubeService;
