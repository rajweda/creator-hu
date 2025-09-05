import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { feedApi, FeedItem } from '../services/feedApi';
import { communityApi } from '../services/communityApi';
import { useAuth } from '../AuthContext';
import './Homepage.css';

interface HomepageProps {}

const Homepage: React.FC<HomepageProps> = () => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [showNewPostsIndicator, setShowNewPostsIndicator] = useState(false);
  const { user } = useAuth();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch initial feed
  const fetchFeed = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const response = await feedApi.getPublicFeed({
        page: pageNum,
        limit: 10,
        sort: 'newest'
      });

      if (append) {
        setFeedItems(prev => [...prev, ...response.items]);
      } else {
        setFeedItems(response.items);
      }

      setHasMore(response.pagination.hasNext);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Error fetching feed:', err);
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Check for new posts
  const checkForNewPosts = useCallback(async () => {
    if (feedItems.length === 0) return;

    try {
      const response = await feedApi.getPublicFeed({
        page: 1,
        limit: 5,
        sort: 'newest'
      });

      const latestItemTime = new Date(feedItems[0]?.createdAt || 0).getTime();
      const newItems = response.items.filter(
        item => new Date(item.createdAt).getTime() > latestItemTime
      );

      if (newItems.length > 0) {
        setNewPostsCount(newItems.length);
        setShowNewPostsIndicator(true);
      }
    } catch (err) {
      console.error('Error checking for new posts:', err);
    }
  }, [feedItems]);

  // Load more posts (infinite scroll)
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchFeed(page + 1, true);
    }
  }, [fetchFeed, page, loadingMore, hasMore]);

  // Refresh feed with new posts
  const refreshFeed = useCallback(() => {
    setShowNewPostsIndicator(false);
    setNewPostsCount(0);
    fetchFeed(1, false);
  }, [fetchFeed]);

  // Handle like toggle
  const handleLike = useCallback(async (itemId: string, type: 'content' | 'community_post') => {
    if (!user) {
      // Redirect to login for unauthenticated users
      return;
    }

    try {
      const result = await feedApi.toggleLike(itemId, type);
      
      setFeedItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, hasLiked: result.hasLiked, likeCount: result.likeCount }
          : item
      ));
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  }, [user]);

  // Handle share
  const handleShare = useCallback(async (itemId: string, type: 'content' | 'community_post') => {
    try {
      const result = await feedApi.shareItem(itemId, type);
      
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this post on CreatorHub',
          url: result.shareUrl
        });
      } else {
        await navigator.clipboard.writeText(result.shareUrl);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  }, []);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore]); // Remove loadMore dependency

  // Setup auto-refresh
  useEffect(() => {
    fetchFeed();

    // Auto-refresh every 30 seconds
    refreshIntervalRef.current = setInterval(checkForNewPosts, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []); // Remove dependencies to prevent infinite re-renders

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="homepage">
        <header className="homepage-header">
          <div className="header-content">
            <Link to="/" className="logo">CreatorHub</Link>
            <nav className="main-nav">
              <Link to="/communities" className="nav-link">Communities</Link>
              <Link to="/videos" className="nav-link">Videos</Link>
            </nav>
            <div className="auth-buttons">
              <Link to="/auth?mode=login" className="btn btn-outline">Login</Link>
              <Link to="/auth?mode=signup" className="btn btn-primary">Sign Up</Link>
            </div>
          </div>
        </header>
        <main className="homepage-main">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your feed...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="homepage">
        <header className="homepage-header">
          <div className="header-content">
            <Link to="/" className="logo">CreatorHub</Link>
            <nav className="main-nav">
              <Link to="/communities" className="nav-link">Communities</Link>
              <Link to="/videos" className="nav-link">Videos</Link>
            </nav>
            <div className="auth-buttons">
              <Link to="/auth?mode=login" className="btn btn-outline">Login</Link>
              <Link to="/auth?mode=signup" className="btn btn-primary">Sign Up</Link>
            </div>
          </div>
        </header>
        <main className="homepage-main">
          <div className="error-container">
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
            <button onClick={() => fetchFeed()} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="homepage">
      <header className="homepage-header">
        <div className="header-content">
          <Link to="/" className="logo">CreatorHub</Link>
          <nav className="main-nav">
            <Link to="/communities" className="nav-link">Communities</Link>
            <Link to="/videos" className="nav-link">Videos</Link>
          </nav>
          {user ? (
            <div className="user-menu">
              <Link to="/dashboard" className="btn btn-outline">Dashboard</Link>
              <Link to="/feed" className="btn btn-primary">My Feed</Link>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/auth?mode=login" className="btn btn-outline">Login</Link>
              <Link to="/auth?mode=signup" className="btn btn-primary">Sign Up</Link>
            </div>
          )}
        </div>
      </header>

      <main className="homepage-main">
        {/* New Posts Indicator */}
        {showNewPostsIndicator && (
          <div className="new-posts-indicator" onClick={refreshFeed}>
            <div className="new-posts-content">
              <span className="new-posts-icon">↑</span>
              <span>{newPostsCount} new post{newPostsCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}

        {/* Hero Section for Unauthenticated Users */}
        {!user && (
          <section className="hero-section">
            <div className="hero-content">
              <h1>Welcome to CreatorHub</h1>
              <p>Discover amazing content from creators around the world. Join our community to interact, share, and create.</p>
              <div className="hero-actions">
                <Link to="/auth?mode=signup" className="btn btn-primary btn-large">
                  Join CreatorHub
                </Link>
                <Link to="/auth?mode=login" className="btn btn-outline btn-large">
                  Sign In
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Feed Section */}
        <section className="feed-section">
          <div className="feed-header">
            <h2>{user ? 'Latest Updates' : 'Discover Content'}</h2>
            <p>Real-time updates from creators and communities</p>
          </div>

          {feedItems.length === 0 ? (
            <div className="empty-feed">
              <div className="empty-feed-icon">📝</div>
              <h3>No posts yet</h3>
              <p>Be the first to share something amazing!</p>
              {!user && (
                <Link to="/auth?mode=signup" className="btn btn-primary">
                  Join to Post
                </Link>
              )}
            </div>
          ) : (
            <div className="feed-container">
              {feedItems.map((item) => (
                <article key={`${item.type}-${item.id}`} className="feed-item">
                  <div className="feed-item-header">
                    <div className="author-info">
                      <div className="author-avatar">
                        {item.author.displayName?.[0] || item.author.name[0]}
                      </div>
                      <div className="author-details">
                        <h4 className="author-name">
                          {item.author.displayName || item.author.name}
                        </h4>
                        {item.community && (
                          <span className="community-name">
                            in {item.community.name}
                          </span>
                        )}
                        <time className="post-time">
                          {formatTimeAgo(item.createdAt)}
                        </time>
                      </div>
                    </div>
                    <div className="post-type-badge">
                      {item.type === 'community_post' ? 'Community' : 'Post'}
                    </div>
                  </div>

                  <div className="feed-item-content">
                    <h3 className="post-title">{item.title}</h3>
                    <div className="post-body">
                      {item.body && item.body.length > 300 
                        ? `${item.body.substring(0, 300)}...` 
                        : item.body || 'No content available'
                      }
                    </div>
                    
                    {item.mediaUrls && item.mediaUrls.length > 0 && (
                      <div className="post-media">
                        {item.mediaUrls.slice(0, 3).map((url, index) => (
                          <img 
                            key={index} 
                            src={url} 
                            alt="Post media" 
                            className="media-thumbnail"
                          />
                        ))}
                        {item.mediaUrls && item.mediaUrls.length > 3 && (
                          <div className="media-more">
                            +{item.mediaUrls.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="feed-item-actions">
                    <button 
                      className={`action-btn like-btn ${item.hasLiked ? 'liked' : ''}`}
                      onClick={() => handleLike(item.id, item.type)}
                      disabled={!user}
                    >
                      <span className="action-icon">❤️</span>
                      <span className="action-count">{item.likeCount}</span>
                    </button>
                    
                    <button className="action-btn comment-btn">
                      <span className="action-icon">💬</span>
                      <span className="action-count">{item.commentCount}</span>
                    </button>
                    
                    <button 
                      className="action-btn share-btn"
                      onClick={() => handleShare(item.id, item.type)}
                    >
                      <span className="action-icon">🔗</span>
                      <span className="action-text">Share</span>
                    </button>

                    {!user && (
                      <div className="auth-prompt">
                        <Link to="/auth?mode=login" className="auth-link">
                          Sign in to interact
                        </Link>
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {/* Load More Trigger */}
              <div ref={loadMoreRef} className="load-more-trigger">
                {loadingMore && (
                  <div className="loading-more">
                    <div className="loading-spinner small"></div>
                    <span>Loading more posts...</span>
                  </div>
                )}
                {!hasMore && feedItems.length > 0 && (
                  <div className="end-of-feed">
                    <p>You've reached the end! 🎉</p>
                    <button onClick={() => fetchFeed()} className="btn btn-outline">
                      Refresh Feed
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="homepage-footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link to="/about">About</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/help">Help</Link>
          </div>
          <p>&copy; 2024 CreatorHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;