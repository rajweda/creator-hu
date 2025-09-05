import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import CreatorDashboard from '../components/CreatorDashboard';
import VideoUpload from '../components/VideoUpload';
import VideoLibrary from '../components/VideoLibrary';
import Button from '../components/Button';

type TabType = 'dashboard' | 'upload' | 'library' | 'verification';

const CreatorHub: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [userPurchases, setUserPurchases] = useState<number[]>([]);

  const handleVideoUploadComplete = (videoData: any) => {
    console.log('Video uploaded:', videoData);
    // Refresh the dashboard or show success message
    setActiveTab('dashboard');
  };

  const handleVideoPurchase = (videoId: number) => {
    setUserPurchases(prev => [...prev, videoId]);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading user data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creator Hub</h1>
          <p className="text-gray-600 mt-1">Monetize your educational content and track earnings</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard">
              <Button className="bg-gray-600 hover:bg-gray-700">
                Back to Creator Studio
              </Button>
            </Link>
          <Button onClick={logout} className="bg-red-600 hover:bg-red-700">
            Logout
          </Button>
        </div>
      </div>

      {/* Creator Info Card */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {(user.displayName || user.name).charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {user.displayName || user.name}
              </h2>
              <p className="text-gray-600">Educational Content Creator</p>
              <p className="text-sm text-gray-500">
                Eligible for ₹10-₹50 video pricing • 85% earnings retention
              </p>
            </div>
          </div>
          <div className="text-right">
            <Link to="/creator/verify">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Get Verified
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Earnings Dashboard
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📤 Upload Video
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'library'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🎥 Video Library
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white border rounded-lg shadow-sm">
        {activeTab === 'dashboard' && (
          <div className="p-6">
            <CreatorDashboard />
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="p-6">
            <VideoUpload onUploadComplete={handleVideoUploadComplete} />
          </div>
        )}

        {activeTab === 'library' && (
          <div className="p-6">
            <VideoLibrary 
              onPurchaseVideo={handleVideoPurchase}
              userPurchases={userPurchases}
            />
          </div>
        )}
      </div>

      {/* Feature Highlights */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border">
          <div className="text-2xl mb-2">🎯</div>
          <h3 className="font-semibold text-gray-900 mb-2">Ad-Free Experience</h3>
          <p className="text-sm text-gray-600">
            Your videos play without YouTube ads or redirects, providing viewers with an uninterrupted learning experience.
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border">
          <div className="text-2xl mb-2">💰</div>
          <h3 className="font-semibold text-gray-900 mb-2">Direct Monetization</h3>
          <p className="text-sm text-gray-600">
            Set prices between ₹10-₹50 per video and keep 85% of earnings. UPI payments processed instantly.
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border">
          <div className="text-2xl mb-2">📈</div>
          <h3 className="font-semibold text-gray-900 mb-2">Growth Support</h3>
          <p className="text-sm text-gray-600">
            Designed for creators with under 100 subscribers. Build your audience while earning from quality content.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreatorHub;