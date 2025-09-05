import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import VideoPlayer from './VideoPlayer';
import PaymentModal from './PaymentModal';
import Button from './Button';
import './VideoLibrary.css';

interface Video {
  id: number;
  title: string;
  description: string;
  filePath?: string;
  thumbnailPath?: string;
  duration: number;
  price: number;
  category: string;
  tags: string[];
  viewCount: number;
  createdAt: string;
  isPurchased?: boolean;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  channelTitle?: string;
  creator: {
    id: number;
    name: string;
    displayName?: string;
    subscriberCount: number;
  };
}

interface VideoLibraryProps {
  onVideoSelect?: (video: Video) => void;
  onPurchaseVideo?: (videoId: number) => void;
  userPurchases?: number[]; // Array of purchased video IDs
}

const VideoLibrary: React.FC<VideoLibraryProps> = ({
  onVideoSelect,
  onPurchaseVideo,
  userPurchases = []
}) => {
  const { user, logout } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [paymentVideo, setPaymentVideo] = useState<Video | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('720p');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [localPurchases, setLocalPurchases] = useState<number[]>(userPurchases);

  const categories = [
    'all',
    'technology',
    'food-science',
    'programming',
    'youtube-growth',
    'mobile-tech',
    'blogging'
  ];

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12'
      });
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`http://localhost:4000/api/videos?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      // Parse tags from JSON strings to arrays
      const videosWithParsedTags = data.videos.map((video: any) => ({
        ...video,
        tags: typeof video.tags === 'string' ? JSON.parse(video.tags || '[]') : video.tags || []
      }));
      setVideos(videosWithParsedTags);
      setTotalPages(data.pagination.pages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [currentPage, selectedCategory, searchQuery]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchVideos();
  };

  const handleVideoClick = async (video: Video) => {
    if (localPurchases.includes(video.id)) {
      setSelectedVideo(video);
      onVideoSelect?.(video);
      
      // Fetch available qualities for this video
      try {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch(`http://localhost:4000/api/videos/${video.id}/qualities`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAvailableQualities(data.qualities || ['720p']);
          
          // Set default quality based on available options
          if (data.qualities && data.qualities.length > 0) {
            setSelectedQuality(data.qualities.includes('720p') ? '720p' : data.qualities[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch video qualities:', error);
        setAvailableQualities(['720p']);
      }
    }
  };

  const handlePurchase = (video: Video) => {
    setPaymentVideo(video);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (videoId: number) => {
    // Update local purchases
    setLocalPurchases(prev => [...prev, videoId]);
    
    // Update the video as purchased in the local state
    setVideos(prevVideos =>
      prevVideos.map(video =>
        video.id === videoId
          ? { ...video, isPurchased: true }
          : video
      )
    );

    // Call the parent callback if provided
    onPurchaseVideo?.(videoId);

    // Close the payment modal
    setPaymentVideo(null);
  };

  const formatPrice = (price: number | string | null | undefined) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `₹${(numPrice || 0).toFixed(0)}`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (selectedVideo) {
    return (
      <div className="video-library">
        <div className="video-header">
          <button 
            className="back-button"
            onClick={() => setSelectedVideo(null)}
          >
            ← Back to Library
          </button>
          <div className="video-info">
            <h1>{selectedVideo.title}</h1>
            <div className="video-meta">
              <span className="creator-name">
                {selectedVideo.creator.displayName || selectedVideo.creator.name}
              </span>
              <span className="video-stats">
                {selectedVideo.viewCount.toLocaleString()} views • {formatDate(selectedVideo.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="video-player-wrapper">
          <div className="player-controls-header">
            {availableQualities.length > 1 && (
              <select 
                className="quality-selector"
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
              >
                {availableQualities.map(quality => (
                  <option key={quality} value={quality}>
                    {quality}
                  </option>
                ))}
              </select>
            )}
          </div>
          <VideoPlayer
            videoUrl={selectedVideo.youtubeVideoId ? '' : `http://localhost:4000/api/videos/${selectedVideo.id}/stream?quality=${selectedQuality}`}
            thumbnailUrl={selectedVideo.thumbnailPath ? (selectedVideo.thumbnailPath.startsWith('http') ? selectedVideo.thumbnailPath : `http://localhost:4000${selectedVideo.thumbnailPath}`) : undefined}
            title={selectedVideo.title}
            youtubeVideoId={selectedVideo.youtubeVideoId}
            key={`${selectedVideo.id}-${selectedQuality}`}
          />
        </div>
        
        <div className="video-description">
          <h3>Description</h3>
          <p>{selectedVideo.description}</p>
          
          <div className="video-tags">
            {selectedVideo.tags.map((tag, index) => (
              <span key={index} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-library">
      {/* Header Navigation */}
      <div className="video-library-header">
        <div className="header-content">
          <h1>Video Library</h1>
          <div className="header-nav">
            <Link to="/dashboard">
                  <Button variant="outline">Creator Studio</Button>
            </Link>
            <Link to="/creator">
              <Button variant="outline">Creator Hub</Button>
            </Link>
            <Link to="/feed">
              <Button variant="outline">Feed</Button>
            </Link>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="library-header">
        <h1>Educational Video Library</h1>
        <p>Premium content from creators with under 100 subscribers</p>
      </div>

      <div className="library-filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            Search
          </button>
        </form>

        <div className="category-filters">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-button ${
                selectedCategory === category ? 'active' : ''
              }`}
              onClick={() => handleCategoryChange(category)}
            >
              {category === 'all' ? 'All Categories' : 
               category.split('-').map(word => 
                 word.charAt(0).toUpperCase() + word.slice(1)
               ).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading videos...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={fetchVideos} className="retry-button">
            Try Again
          </button>
        </div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <p>No videos found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="video-grid">
          {videos.map((video) => {
            const isPurchased = localPurchases.includes(video.id);
              
              return (
                <div key={video.id} className="video-card">
                  <div className="video-thumbnail">
                    {video.thumbnailPath ? (
                      <img 
                        src={video.thumbnailPath.startsWith('http') ? video.thumbnailPath : `http://localhost:4000${video.thumbnailPath}`}
                        alt={video.title}
                        className="thumbnail-image"
                      />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    )}
                    
                    {video.duration > 0 && (
                      <span className="duration-badge">
                        {formatDuration(video.duration)}
                      </span>
                    )}
                    
                    {isPurchased && (
                      <div className="purchased-badge">
                        ✓ Owned
                      </div>
                    )}
                  </div>
                  
                  <div className="video-content">
                    <h3 className="video-title">{video.title}</h3>
                    
                    <div className="video-creator">
                      <span className="creator-name">
                        {video.creator.displayName || video.creator.name}
                      </span>
                      <span className="subscriber-count">
                        {video.creator.subscriberCount} subscribers
                      </span>
                    </div>
                    
                    <p className="video-description">
                      {video.description.length > 100 
                        ? `${video.description.substring(0, 100)}...`
                        : video.description
                      }
                    </p>
                    
                    <div className="video-stats">
                      <span>{video.viewCount.toLocaleString()} views</span>
                      <span>{formatDate(video.createdAt)}</span>
                    </div>
                    
                    <div className="video-tags">
                      {video.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="video-actions">
                      <div className="price-display">
                        {formatPrice(video.price)}
                      </div>
                      
                      {isPurchased ? (
                        <button 
                          className="watch-button"
                          onClick={() => handleVideoClick(video)}
                        >
                          Watch Now
                        </button>
                      ) : (
                        <button 
                          className="purchase-button"
                          onClick={() => handlePurchase(video)}
                        >
                          Purchase
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="pagination-button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                className="pagination-button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
      
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentVideo(null);
        }}
        video={paymentVideo}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default VideoLibrary;