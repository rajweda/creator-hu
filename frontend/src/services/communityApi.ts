import apiClient from './api';

// Community Types
export interface Community {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  isPrivate: boolean;
  bannerUrl?: string;
  logoUrl?: string;
  rules?: string[];
  memberCount: number;
  postCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: number;
    name: string;
    displayName?: string;
  };
  userMembership?: {
    role: 'admin' | 'moderator' | 'member';
    joinedAt: string;
  };
}

export interface CreateCommunityRequest {
  name: string;
  description: string;
  category: string;
  tags: string[];
  isPrivate: boolean;
  rules?: string[];
}

export interface UpdateCommunityRequest {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isPrivate?: boolean;
  rules?: string[];
}

export interface CommunityMember {
  id: number;
  userId: number;
  communityId: number;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  user: {
    id: number;
    name: string;
    displayName?: string;
  };
}

export interface CommunityPost {
  id: number;
  title: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'poll';
  mediaUrls?: string[];
  pollOptions?: {
    id: number;
    text: string;
    votes: number;
    hasVoted?: boolean;
  }[];
  isPinned: boolean;
  likeCount: number;
  commentCount: number;
  hasLiked?: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    displayName?: string;
  };
  community: {
    id: number;
    name: string;
  };
}

export interface CreatePostRequest {
  title: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'poll';
  pollOptions?: string[];
}

export interface Comment {
  id: number;
  content: string;
  likeCount: number;
  replyCount: number;
  hasLiked?: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    displayName?: string;
  };
  parentId?: number;
  replies?: Comment[];
}

export interface CreateCommentRequest {
  content: string;
  parentId?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Community API Service
class CommunityApiService {
  // ============================================================================
  // COMMUNITY MANAGEMENT
  // ============================================================================

  async getCommunities(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    sort?: 'newest' | 'oldest' | 'popular' | 'active';
  }): Promise<PaginatedResponse<Community>> {
    const response = await apiClient.get('/api/community/communities', { params });
    return response.data;
  }

  async getTrendingCommunities(limit = 10): Promise<{ communities: Community[] }> {
    const response = await apiClient.get('/api/community/communities/trending', {
      params: { limit }
    });
    return response.data;
  }

  async getRecommendedCommunities(limit = 10): Promise<{ communities: Community[] }> {
    const response = await apiClient.get('/api/community/communities/recommended', {
      params: { limit }
    });
    return response.data;
  }

  async getCommunityCategories(): Promise<{ categories: string[] }> {
    const response = await apiClient.get('/api/community/communities/categories');
    // Extract category names from the response that includes counts
    const categories = response.data.categories.map((cat: { name: string; count: number }) => cat.name);
    return { categories };
  }

  async getCommunityById(id: number): Promise<{ community: Community }> {
    const response = await apiClient.get(`/api/community/communities/${id}`);
    return response.data;
  }

  // Alias for backward compatibility
  async getCommunity(id: number): Promise<{ community: Community }> {
    return this.getCommunityById(id);
  }

  async createCommunity(data: CreateCommunityRequest): Promise<{ community: Community }> {
    const response = await apiClient.post('/api/community/communities', data);
    return response.data;
  }

  async updateCommunity(id: number, data: UpdateCommunityRequest): Promise<{ community: Community }> {
    const response = await apiClient.put(`/api/community/communities/${id}`, data);
    return response.data;
  }

  async deleteCommunity(id: number): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/api/community/communities/${id}`);
    return response.data;
  }

  async uploadCommunityMedia(id: number, file: File, type: 'banner' | 'logo'): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('media', file);
    formData.append('type', type);
    
    const response = await apiClient.post(`/api/community/communities/${id}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // ============================================================================
  // MEMBERSHIP MANAGEMENT
  // ============================================================================

  async joinCommunity(communityId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/api/community/communities/${communityId}/join`);
    return response.data;
  }

  async leaveCommunity(communityId: number): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/api/community/communities/${communityId}/leave`);
    return response.data;
  }

  async getCommunityMembers(communityId: number, params?: {
    page?: number;
    limit?: number;
    role?: 'admin' | 'moderator' | 'member';
  }): Promise<PaginatedResponse<CommunityMember>> {
    const response = await apiClient.get(`/api/community/communities/${communityId}/members`, { params });
    return response.data;
  }

  async updateMemberRole(communityId: number, userId: number, role: 'admin' | 'moderator' | 'member'): Promise<{ success: boolean }> {
    const response = await apiClient.put(`/api/community/communities/${communityId}/members/${userId}/role`, { role });
    return response.data;
  }

  async removeMember(communityId: number, userId: number): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/api/community/communities/${communityId}/members/${userId}`);
    return response.data;
  }

  async getUserMemberships(params?: PaginationParams): Promise<PaginatedResponse<{ community: Community; role: string; joinedAt: string }>> {
    const response = await apiClient.get('/api/community/user/memberships', { params });
    return response.data;
  }

  // ============================================================================
  // POSTS MANAGEMENT
  // ============================================================================

  async getCommunityPosts(communityId: number, params?: {
    page?: number;
    limit?: number;
    sort?: 'newest' | 'oldest' | 'popular' | 'trending';
    type?: 'text' | 'image' | 'video' | 'poll';
  }): Promise<PaginatedResponse<CommunityPost>> {
    const response = await apiClient.get(`/api/community/communities/${communityId}/posts`, { params });
    return response.data;
  }

  async getPost(postId: number): Promise<{ post: CommunityPost }> {
    const response = await apiClient.get(`/api/community/posts/${postId}`);
    return response.data;
  }

  async createPost(communityId: number, data: CreatePostRequest, files?: File[]): Promise<{ post: CommunityPost }> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('type', data.type);
    
    if (data.pollOptions) {
      formData.append('pollOptions', JSON.stringify(data.pollOptions));
    }
    
    if (files) {
      files.forEach(file => {
        formData.append('media', file);
      });
    }
    
    const response = await apiClient.post(`/api/community/communities/${communityId}/posts`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updatePost(postId: number, data: Partial<CreatePostRequest>): Promise<{ post: CommunityPost }> {
    const response = await apiClient.put(`/api/community/posts/${postId}`, data);
    return response.data;
  }

  async deletePost(postId: number): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/api/community/posts/${postId}`);
    return response.data;
  }

  async uploadPostMedia(postId: number, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('media', file);
    
    const response = await apiClient.post(`/api/community/posts/${postId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getCommunityPost(postId: number): Promise<{ post: CommunityPost }> {
    return this.getPost(postId);
  }

  async togglePinPost(postId: number): Promise<{ success: boolean; isPinned: boolean }> {
    const response = await apiClient.put(`/api/community/posts/${postId}/pin`);
    return response.data;
  }

  async voteOnPoll(postId: number, optionId: number): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/community/posts/${postId}/vote`, { optionId });
    return response.data;
  }

  // ============================================================================
  // COMMENTS MANAGEMENT
  // ============================================================================

  async getPostComments(postId: number, params?: {
    page?: number;
    limit?: number;
    sort?: 'newest' | 'oldest' | 'popular';
  }): Promise<PaginatedResponse<Comment>> {
    const response = await apiClient.get(`/api/community/posts/${postId}/comments`, { params });
    return response.data;
  }

  async getCommentReplies(commentId: number, params?: PaginationParams): Promise<PaginatedResponse<Comment>> {
    const response = await apiClient.get(`/api/community/comments/${commentId}/replies`, { params });
    return response.data;
  }

  async createComment(postId: number, data: CreateCommentRequest): Promise<{ comment: Comment }> {
    const response = await apiClient.post(`/api/community/posts/${postId}/comments`, data);
    return response.data;
  }

  async updateComment(commentId: number, content: string): Promise<{ comment: Comment }> {
    const response = await apiClient.put(`/api/community/comments/${commentId}`, { content });
    return response.data;
  }

  async deleteComment(commentId: number): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/api/community/comments/${commentId}`);
    return response.data;
  }

  // ============================================================================
  // ENGAGEMENT FEATURES
  // ============================================================================

  async togglePostLike(postId: number): Promise<{ success: boolean; hasLiked: boolean; likeCount: number }> {
    const response = await apiClient.post(`/api/community/posts/${postId}/like`);
    return response.data;
  }

  async toggleCommentLike(commentId: number): Promise<{ success: boolean; hasLiked: boolean; likeCount: number }> {
    const response = await apiClient.post(`/api/community/comments/${commentId}/like`);
    return response.data;
  }

  async getUserLikedPosts(params?: PaginationParams): Promise<PaginatedResponse<CommunityPost>> {
    const response = await apiClient.get('/api/community/user/liked-posts', { params });
    return response.data;
  }

  // ============================================================================
  // REPORTING & MODERATION
  // ============================================================================

  async reportPost(postId: number, reason: string, description?: string): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/community/posts/${postId}/report`, { reason, description });
    return response.data;
  }

  async reportComment(commentId: number, reason: string, description?: string): Promise<{ success: boolean }> {
    const response = await apiClient.post(`/api/community/comments/${commentId}/report`, { reason, description });
    return response.data;
  }

  // ============================================================================
  // SEARCH & DISCOVERY
  // ============================================================================

  async searchCommunities(query: string, params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<PaginatedResponse<Community>> {
    const response = await apiClient.get('/api/community/search/communities', {
      params: { search: query, ...params }
    });
    return response.data;
  }
}

// Export singleton instance
export const communityApi = new CommunityApiService();
export default communityApi;