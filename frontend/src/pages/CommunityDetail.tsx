import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { communityApi, Community, CommunityMember, CommunityPost } from '../services/communityApi';
import Button from '../components/Button';
import CommunityPostCard from '../components/CommunityPostCard';
import CreatePost from '../components/CreatePost';

interface CommunityDetailProps {}

const CommunityDetail: React.FC<CommunityDetailProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [userMembership, setUserMembership] = useState<{ community: Community; role: string; joinedAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [sortBy, setSortBy] = useState<'new' | 'top' | 'trending'>('new');
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'about'>('posts');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadCommunityData();
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === 'posts') {
      loadPosts();
    } else if (id && activeTab === 'members') {
      loadMembers();
    }
  }, [id, activeTab, sortBy, currentPage]);

  const loadCommunityData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const [communityResponse, membershipResponse] = await Promise.all([
        communityApi.getCommunity(parseInt(id)),
        communityApi.getUserMemberships().catch(() => ({ data: [] }))
      ]);
      
      setCommunity(communityResponse.community);
      
      // Check if user is a member
      const membership = membershipResponse.data.find(
        (m: { community: Community; role: string; joinedAt: string }) => m.community.id === parseInt(id)
      );
      setUserMembership(membership || null);
    } catch (error) {
      console.error('Error loading community:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    if (!id) return;
    
    setPostsLoading(true);
    try {
      const response = await communityApi.getCommunityPosts(parseInt(id), {
        page: currentPage,
        limit: 10,
        sort: sortBy === 'new' ? 'newest' : sortBy === 'top' ? 'popular' : sortBy
      });
      setPosts(response.data);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!id) return;
    
    try {
      const response = await communityApi.getCommunityMembers(parseInt(id), {
        page: currentPage,
        limit: 20
      });
      setMembers(response.data);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleJoinCommunity = async () => {
    if (!id || !community) return;
    
    setJoinLoading(true);
    try {
      await communityApi.joinCommunity(parseInt(id));
      // Reload community data to get updated membership status
      await loadCommunityData();
    } catch (error) {
      console.error('Error joining community:', error);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!id || !confirm('Are you sure you want to leave this community?')) return;
    
    setJoinLoading(true);
    try {
      await communityApi.leaveCommunity(parseInt(id));
      // Reload community data to get updated membership status
      await loadCommunityData();
    } catch (error) {
      console.error('Error leaving community:', error);
    } finally {
      setJoinLoading(false);
    }
  };

  const handlePostCreated = (newPost: CommunityPost) => {
    setPosts(prev => [newPost, ...prev]);
    setShowCreatePost(false);
  };

  const handlePostUpdated = (updatedPost: CommunityPost) => {
    setPosts(prev => prev.map(post => 
      post.id === updatedPost.id ? updatedPost : post
    ));
  };

  const handlePostDeleted = (postId: number) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  const canCreatePost = userMembership && ['admin', 'moderator', 'member'].includes(userMembership.role);
  const canModerate = userMembership && ['admin', 'moderator'].includes(userMembership.role);
  const isAdmin = userMembership?.role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-300 rounded-lg mb-6"></div>
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Community Not Found</h2>
          <p className="text-gray-600 mb-6">The community you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/communities')} className="bg-blue-600 text-white hover:bg-blue-700">
            Back to Communities
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Community Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative overflow-hidden">
          {community.bannerUrl && (
            <img
              src={community.bannerUrl}
              alt={`${community.name} banner`}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        </div>

        {/* Community Info */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-16 pb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Logo */}
              <div className="relative">
                <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg overflow-hidden">
                  {community.logoUrl ? (
                    <img
                      src={community.logoUrl}
                      alt={`${community.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-3xl font-bold text-gray-500">
                        {community.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Community Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h1 className="text-3xl font-bold text-white sm:text-gray-900">
                        {community.name}
                      </h1>
                      {community.isPrivate && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="text-white sm:text-gray-600 mt-1">
                      {community.memberCount} members • {community.category}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 mt-4 sm:mt-0">
                    {userMembership ? (
                      <>
                        <Button
                          onClick={handleLeaveCommunity}
                          disabled={joinLoading}
                          className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {joinLoading ? 'Leaving...' : 'Leave'}
                        </Button>
                        {isAdmin && (
                          <Button
                            onClick={() => navigate(`/communities/${id}/settings`)}
                            className="bg-gray-600 text-white hover:bg-gray-700"
                          >
                            Settings
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        onClick={handleJoinCommunity}
                        disabled={joinLoading}
                        className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {joinLoading ? 'Joining...' : community.isPrivate ? 'Request to Join' : 'Join Community'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {['posts', 'members', 'about'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab as any);
                        setCurrentPage(1);
                      }}
                      className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'posts' && (
              <div className="space-y-6">
                {/* Create Post Button */}
                {canCreatePost && (
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <Button
                      onClick={() => setShowCreatePost(true)}
                      className="w-full bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Create New Post
                    </Button>
                  </div>
                )}

                {/* Sort Options */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex space-x-4">
                    {(['new', 'top', 'trending'] as const).map((sort) => (
                      <button
                        key={sort}
                        onClick={() => {
                          setSortBy(sort);
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${
                          sortBy === sort
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {sort}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Posts */}
                {postsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : posts.length > 0 ? (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <CommunityPostCard
                        key={post.id}
                        post={post}
                        onUpdate={handlePostUpdated}
                        onDelete={handlePostDeleted}
                        canModerate={canModerate || false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                    <p className="text-gray-500 mb-4">Be the first to start a conversation in this community!</p>
                    {canCreatePost && (
                      <Button
                        onClick={() => setShowCreatePost(true)}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Create First Post
                      </Button>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center space-x-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'members' && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Members ({community.memberCount})</h3>
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {(member.user.displayName || member.user.name).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.user.displayName || member.user.name}</p>
                            <p className="text-xs text-gray-500">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.role === 'admin' ? 'bg-red-100 text-red-800' :
                          member.role === 'moderator' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">About</h3>
                <p className="text-gray-700 mb-6">{community.description}</p>
                
                {community.tags && community.tags.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {community.tags.map((tag, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {community.rules && community.rules.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Community Rules</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                      {community.rules.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Community Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Community Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Members</span>
                  <span className="font-medium">{community.memberCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Posts</span>
                  <span className="font-medium">{community.postCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-medium">{new Date(community.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="text-sm text-gray-500">
                <p>Activity feed coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePost
          communityId={parseInt(id!)}
          onClose={() => setShowCreatePost(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
};

export default CommunityDetail;