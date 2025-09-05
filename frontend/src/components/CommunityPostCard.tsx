import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityApi, CommunityPost } from '../services/communityApi';
import Button from './Button';

interface CommunityPostCardProps {
  post: CommunityPost;
  onUpdate: (post: CommunityPost) => void;
  onDelete: (postId: number) => void;
  canModerate?: boolean;
}

const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  post,
  onUpdate,
  onDelete,
  canModerate = false
}) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.hasLiked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const handleLike = async () => {
    setLoading(true);
    try {
      await communityApi.togglePostLike(post.id);
      setLiked(!liked);
      setLikeCount(prev => liked ? prev - 1 : prev + 1);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await communityApi.deletePost(post.id);
      onDelete(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    
    setLoading(true);
    try {
      await communityApi.reportPost(post.id, reportReason);
      setShowReportModal(false);
      setReportReason('');
      // Show success message or notification
    } catch (error) {
      console.error('Error reporting post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: number) => {
    if (!post.pollOptions) return;
    
    setLoading(true);
    try {
      const response = await communityApi.voteOnPoll(post.id, optionId);
      // Update the post with new poll data if available
      if (response.success) {
        // Refresh the post data or update optimistically
        onUpdate(post);
      }
    } catch (error) {
      console.error('Error voting on poll:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTotalVotes = () => {
    if (!post.pollOptions) return 0;
    return post.pollOptions.reduce((total, option) => total + option.votes, 0);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Post Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {(post.author.displayName || post.author.name).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-gray-900">{post.author.displayName || post.author.name}</h4>
                {post.isPinned && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    Pinned
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{formatDate(post.createdAt)}</p>
            </div>
          </div>
          
          {/* Post Actions Menu */}
          <div className="relative">
            <div className="flex items-center space-x-2">
              {canModerate && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setShowReportModal(true)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="p-4">
        {/* Title */}
        {post.title && (
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
        )}
        
        {/* Content */}
        {post.content && (
          <div className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</div>
        )}

        {/* Media */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <div className="mb-4">
            {post.mediaUrls.length === 1 ? (
              <div className="rounded-lg overflow-hidden">
                {post.mediaUrls[0].endsWith('.mp4') || post.mediaUrls[0].endsWith('.webm') ? (
                  <video
                    src={post.mediaUrls[0]}
                    controls
                    className="w-full max-h-96 object-contain bg-black"
                  />
                ) : (
                  <img
                    src={post.mediaUrls[0]}
                    alt="Post media"
                    className="w-full max-h-96 object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {post.mediaUrls.slice(0, 4).map((url, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden">
                    {url.endsWith('.mp4') || url.endsWith('.webm') ? (
                      <video
                        src={url}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <img
                        src={url}
                        alt={`Post media ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    {index === 3 && post.mediaUrls && post.mediaUrls.length > 4 && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-medium">+{post.mediaUrls.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Poll */}
        {post.pollOptions && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Poll</h4>
            <div className="space-y-2">
              {post.pollOptions.map((option) => {
                const totalVotes = getTotalVotes();
                const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                const hasVoted = false; // TODO: Implement user vote tracking
                
                return (
                  <div key={option.id} className="relative">
                    <button
                      onClick={() => handleVote(option.id)}
                      disabled={loading || option.hasVoted}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        hasVoted
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : false
                          ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{option.text}</span>
                        <span className="text-sm">
                          {option.votes} votes ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      {false && (
                        <div className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-b-md transition-all duration-300" 
                             style={{ width: `${percentage}%` }}>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-sm text-gray-500">
              Total votes: {getTotalVotes()}
            </div>
          </div>
        )}
      </div>

      {/* Post Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Like Button */}
            <button
              onClick={handleLike}
              disabled={loading}
              className={`flex items-center space-x-2 text-sm transition-colors ${
                liked
                  ? 'text-red-600 hover:text-red-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{likeCount}</span>
            </button>

            {/* Comment Button */}
            <button
              onClick={() => navigate(`/communities/${post.community.id}/posts/${post.id}`)}
              className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{post.commentCount || 0}</span>
            </button>

            {/* Share Button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + `/communities/${post.community.id}/posts/${post.id}`);
              }}
              className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span>Share</span>
            </button>
          </div>

          {/* View Post Button */}
          <Button
            onClick={() => navigate(`/communities/${post.community.id}/posts/${post.id}`)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View Post
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Post</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this post? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Report Post</h3>
            <div className="mb-4">
              <label htmlFor="report-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reporting
              </label>
              <textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please describe why you're reporting this post..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReport}
                disabled={loading || !reportReason.trim()}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Reporting...' : 'Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPostCard;