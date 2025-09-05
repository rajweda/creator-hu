import apiClient from './api';
import { Content } from './api';
import { CommunityPost } from './communityApi';

// Feed Types
export interface FeedItem {
  id: string;
  type: 'content' | 'community_post';
  title: string;
  body: string;
  author: {
    id: string | number;
    name: string;
    displayName?: string;
  };
  community?: {
    id: number;
    name: string;
  };
  likeCount: number;
  commentCount: number;
  hasLiked?: boolean;
  mediaUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedResponse {
  items: FeedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FeedParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'popular' | 'trending';
  type?: 'all' | 'content' | 'community_posts';
}

// Feed API Service
class FeedApiService {
  // Get public feed (accessible to all users)
  async getPublicFeed(params?: FeedParams): Promise<FeedResponse> {
    try {
      const response = await apiClient.get('/api/feed/public', { params });
      return response.data;
    } catch (error) {
      // Fallback: combine content and community posts manually
      return this.getFallbackFeed(params);
    }
  }

  // Fallback method to combine different content types
  private async getFallbackFeed(params?: FeedParams): Promise<FeedResponse> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    
    try {
      // Fetch regular content
      const contentPromise = apiClient.get('/api/contents').catch(() => ({ data: [] }));
      
      // Fetch community posts from all communities
      const communitiesPromise = apiClient.get('/api/community/communities', {
        params: { limit: 50 } // Get top communities
      }).catch(() => ({ data: { data: [] } }));
      
      const [contentResponse, communitiesResponse] = await Promise.all([
        contentPromise,
        communitiesPromise
      ]);
      
      const contents: Content[] = contentResponse.data || [];
      const communities = communitiesResponse.data?.data || [];
      
      // Fetch posts from each community
      const postsPromises = communities.map((community: any) =>
        apiClient.get(`/api/community/communities/${community.id}/posts`, {
          params: { limit: 5 }
        }).catch(() => ({ data: { data: [] } }))
      );
      
      const postsResponses = await Promise.all(postsPromises);
      const allPosts: CommunityPost[] = postsResponses.flatMap(response => response.data?.data || []);
      
      // Convert to feed items
      const contentItems: FeedItem[] = contents.map(content => ({
        id: content.id,
        type: 'content' as const,
        title: content.title,
        body: content.body,
        author: {
          id: content.authorId,
          name: content.author?.name || 'Unknown',
          displayName: content.author?.displayName
        },
        likeCount: 0,
        commentCount: 0,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt
      }));
      
      const postItems: FeedItem[] = allPosts.map(post => ({
        id: post.id.toString(),
        type: 'community_post' as const,
        title: post.title,
        body: post.content,
        author: {
          id: post.author.id,
          name: post.author.name,
          displayName: post.author.displayName
        },
        community: post.community,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        hasLiked: post.hasLiked,
        mediaUrls: post.mediaUrls,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }));
      
      // Combine and sort by creation date
      const allItems = [...contentItems, ...postItems];
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = allItems.slice(startIndex, endIndex);
      
      return {
        items: paginatedItems,
        pagination: {
          page,
          limit,
          total: allItems.length,
          pages: Math.ceil(allItems.length / limit),
          hasNext: endIndex < allItems.length,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching fallback feed:', error);
      return {
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  }

  // Toggle like on feed item
  async toggleLike(itemId: string, type: 'content' | 'community_post'): Promise<{
    success: boolean;
    hasLiked: boolean;
    likeCount: number;
  }> {
    if (type === 'community_post') {
      const response = await apiClient.post(`/api/community/posts/${itemId}/like`);
      return response.data;
    } else {
      // For regular content, we might need to implement likes
      throw new Error('Likes not implemented for regular content yet');
    }
  }

  // Share functionality (placeholder)
  async shareItem(itemId: string, type: 'content' | 'community_post'): Promise<{ success: boolean; shareUrl: string }> {
    // This would typically generate a shareable link
    const baseUrl = window.location.origin;
    const shareUrl = type === 'community_post' 
      ? `${baseUrl}/community/posts/${itemId}`
      : `${baseUrl}/content/${itemId}`;
    
    return {
      success: true,
      shareUrl
    };
  }
}

// Export singleton instance
export const feedApi = new FeedApiService();
export default feedApi;