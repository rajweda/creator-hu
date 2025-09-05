import React, { useState, useEffect } from 'react';
import './CreatorDashboard.css';

interface Video {
  id: number;
  title: string;
  price: number;
  createdAt: string;
  totalSales: number;
  totalEarnings: number;
  viewCount: number;
  thumbnailPath?: string;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  channelTitle?: string;
}

interface Transaction {
  id: number;
  videoId: number;
  videoTitle: string;
  amount: number;
  platformFee: number;
  creatorEarning: number;
  buyerName: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
}

interface EarningsStats {
  totalEarnings: number;
  totalSales: number;
  totalVideos: number;
  averageEarningPerVideo: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  platformFeePaid: number;
}

const CreatorDashboard: React.FC = () => {
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'transactions'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Fetch earnings stats
      const statsResponse = await fetch(`http://localhost:4000/api/videos/creator/earnings?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch earnings data');
      }

      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch creator videos
      const videosResponse = await fetch('http://localhost:4000/api/videos/creator/videos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!videosResponse.ok) {
        throw new Error('Failed to fetch videos');
      }

      const videosData = await videosResponse.json();
      setVideos(videosData.videos || []);

      // Fetch transactions
      const transactionsResponse = await fetch(`http://localhost:4000/api/payments/creator/transactions?range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!transactionsResponse.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const transactionsData = await transactionsResponse.json();
      setTransactions(transactionsData.transactions || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | string | null | undefined) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    return `₹${numPrice.toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGrowthPercentage = () => {
    if (!stats || stats.lastMonthEarnings === 0) return 0;
    return ((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#059669';
      case 'pending': return '#d97706';
      case 'failed': return '#dc2626';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="creator-dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="creator-dashboard">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Failed to Load Dashboard</h3>
          <p>{error}</p>
          <button className="retry-button" onClick={fetchDashboardData}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="creator-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Creator Dashboard</h1>
          <p>Track your video sales and earnings</p>
        </div>
        
        <div className="date-range-selector">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value as any)}
            className="date-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          My Videos ({videos.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions ({transactions.length})
        </button>
      </div>

      {activeTab === 'overview' && stats && (
        <div className="overview-tab">
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Total Earnings</h3>
                <div className="stat-value">{formatPrice(stats.totalEarnings)}</div>
                <div className="stat-subtitle">
                  Platform fee paid: {formatPrice(stats.platformFeePaid)}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>Total Sales</h3>
                <div className="stat-value">{stats.totalSales}</div>
                <div className="stat-subtitle">
                  Across {stats.totalVideos} videos
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <h3>This Month</h3>
                <div className="stat-value">{formatPrice(stats.thisMonthEarnings)}</div>
                <div className={`stat-subtitle ${getGrowthPercentage() >= 0 ? 'positive' : 'negative'}`}>
                  {getGrowthPercentage() >= 0 ? '↗️' : '↘️'} 
                  {Math.abs(getGrowthPercentage()).toFixed(1)}% vs last month
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <h3>Avg per Video</h3>
                <div className="stat-value">{formatPrice(stats.averageEarningPerVideo)}</div>
                <div className="stat-subtitle">
                  After platform fee (15%)
                </div>
              </div>
            </div>
          </div>

          <div className="earnings-breakdown">
            <h3>Earnings Breakdown</h3>
            <div className="breakdown-chart">
              <div className="breakdown-item">
                <div className="breakdown-label">
                  <span className="color-indicator creator"></span>
                  Your Earnings (85%)
                </div>
                <div className="breakdown-value">{formatPrice(stats.totalEarnings)}</div>
              </div>
              <div className="breakdown-item">
                <div className="breakdown-label">
                  <span className="color-indicator platform"></span>
                  Platform Fee (15%)
                </div>
                <div className="breakdown-value">{formatPrice(stats.platformFeePaid)}</div>
              </div>
              <div className="breakdown-total">
                <div className="breakdown-label">Total Revenue</div>
                <div className="breakdown-value">{formatPrice(stats.totalEarnings + stats.platformFeePaid)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'videos' && (
        <div className="videos-tab">
          {videos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📹</div>
              <h3>No Videos Yet</h3>
              <p>Upload your first video to start earning!</p>
            </div>
          ) : (
            <div className="videos-grid">
              {videos.map(video => (
                <div key={video.id} className="video-card">
                  <div className="video-thumbnail">
                    {video.thumbnailPath ? (
                      <img src={video.thumbnailPath.startsWith('http') ? video.thumbnailPath : `http://localhost:4000${video.thumbnailPath}`} alt={video.title} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <span>📹</span>
                      </div>
                    )}
                  </div>
                  <div className="video-info">
                    <h4>{video.title}</h4>
                    <div className="video-stats">
                      <div className="stat">
                        <span className="label">Price:</span>
                        <span className="value">{formatPrice(video.price)}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Sales:</span>
                        <span className="value">{video.totalSales}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Earnings:</span>
                        <span className="value">{formatPrice(video.totalEarnings)}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Views:</span>
                        <span className="value">{video.viewCount}</span>
                      </div>
                    </div>
                    <div className="video-date">
                      Uploaded {formatDate(video.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="transactions-tab">
          {transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <h3>No Transactions Yet</h3>
              <p>Your sales transactions will appear here.</p>
            </div>
          ) : (
            <div className="transactions-list">
              {transactions.map(transaction => (
                <div key={transaction.id} className="transaction-card">
                  <div className="transaction-main">
                    <div className="transaction-info">
                      <h4>{transaction.videoTitle}</h4>
                      <p className="buyer-name">Purchased by {transaction.buyerName}</p>
                      <p className="transaction-date">{formatDateTime(transaction.createdAt)}</p>
                    </div>
                    <div className="transaction-amounts">
                      <div className="amount-row">
                        <span className="label">Sale Amount:</span>
                        <span className="value">{formatPrice(transaction.amount)}</span>
                      </div>
                      <div className="amount-row platform-fee">
                        <span className="label">Platform Fee:</span>
                        <span className="value">-{formatPrice(transaction.platformFee)}</span>
                      </div>
                      <div className="amount-row earnings">
                        <span className="label">Your Earning:</span>
                        <span className="value">{formatPrice(transaction.creatorEarning)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="transaction-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(transaction.status) }}
                    >
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatorDashboard;