import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../services/api';
import Button from '../components/Button';
import TextInput from '../components/TextInput';
import { Link, useNavigate } from 'react-router-dom';

interface ProfileFormData {
  displayName: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'communities'>('profile');
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: user?.displayName || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.put('/users/profile', {
        displayName: formData.displayName
      });
      
      setMessage(response.data.message || 'Profile updated successfully!');
      await refreshUser();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.put('/users/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setMessage(response.data.message || 'Password changed successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProfileFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
    if (message) setMessage('');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading user data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creator Studio</h1>
          <p className="text-gray-600 mt-1">Your creative command center - manage your profile, content, and communities</p>
        </div>
        <div className="flex gap-2">
          <Link to="/creator">
            <Button className="bg-purple-600 hover:bg-purple-700">
              Creator Hub
            </Button>
          </Link>
          <Link to="/videos">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Video Library
            </Button>
          </Link>
          <Link to="/creator/verify">
            <Button className="bg-yellow-600 hover:bg-yellow-700">
              ✅ Creator Verification
            </Button>
          </Link>
          <Link to="/feed">
            <Button className="bg-green-600 hover:bg-green-700">
              Go to Feed
            </Button>
          </Link>
          <Link to="/chat">
            <Button className="bg-orange-600 hover:bg-orange-700">
              Go to Chat
            </Button>
          </Link>
          <Button onClick={logout} className="bg-gray-600 hover:bg-gray-700">
            Logout
          </Button>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {(user.displayName || user.name).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {user.displayName || user.name}
            </h2>
            <p className="text-gray-600">@{user.name}</p>
            <p className="text-sm text-gray-500">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile Settings
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('communities')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'communities'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Communities
          </button>
        </nav>
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <p className="text-green-600">{message}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        {activeTab === 'profile' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
            <form onSubmit={handleProfileUpdate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <TextInput
                    value={user.name}
                    onChange={() => {}} // Username is not editable
                    disabled={true}
                    className="w-full bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name
                  </label>
                  <TextInput
                    value={formData.displayName}
                    onChange={handleInputChange('displayName')}
                    placeholder="Enter display name"
                    disabled={loading}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange}>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <TextInput
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleInputChange('currentPassword')}
                    placeholder="Enter current password"
                    disabled={loading}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <TextInput
                    type="password"
                    value={formData.newPassword}
                    onChange={handleInputChange('newPassword')}
                    placeholder="Enter new password (min 6 characters)"
                    disabled={loading}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <TextInput
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    placeholder="Confirm new password"
                    disabled={loading}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'communities' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Community Hub</h3>
            <p className="text-gray-600 mb-6">Discover, join, and manage your communities</p>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    🌟
                  </div>
                  <h4 className="ml-3 font-semibold text-gray-900">Explore Communities</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4">Discover new communities that match your interests and connect with like-minded creators.</p>
                <Link to="/communities">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Browse All Communities
                  </Button>
                </Link>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    ➕
                  </div>
                  <h4 className="ml-3 font-semibold text-gray-900">Create Community</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4">Start your own community and bring together creators who share your passion.</p>
                <Link to="/communities/create">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Create New Community
                  </Button>
                </Link>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    👥
                  </div>
                  <h4 className="ml-3 font-semibold text-gray-900">My Communities</h4>
                </div>
                <p className="text-gray-600 text-sm mb-4">Manage the communities you've joined or created. View posts, moderate content, and engage with members.</p>
                <Button 
                  onClick={() => navigate('/communities')} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  View My Communities
                </Button>
              </div>
            </div>

            {/* Trending Categories */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">🔥 Trending Categories</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div 
                  onClick={() => navigate('/communities?category=ai-tech')} 
                  className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-2 group-hover:scale-110 transition-transform">
                      🤖
                    </div>
                    <h5 className="font-semibold text-gray-900 text-sm">AI & Tech</h5>
                    <p className="text-xs text-gray-600 mt-1">Machine Learning, Programming, Innovation</p>
                  </div>
                </div>
                
                <div 
                  onClick={() => navigate('/communities?category=fashion-style')} 
                  className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-2 group-hover:scale-110 transition-transform">
                      ✨
                    </div>
                    <h5 className="font-semibold text-gray-900 text-sm">Fashion & Style</h5>
                    <p className="text-xs text-gray-600 mt-1">Trends, Design, Beauty</p>
                  </div>
                </div>
                
                <div 
                  onClick={() => navigate('/communities?category=entertainment')} 
                  className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-2 group-hover:scale-110 transition-transform">
                      🎬
                    </div>
                    <h5 className="font-semibold text-gray-900 text-sm">Entertainment</h5>
                    <p className="text-xs text-gray-600 mt-1">Movies, Music, Gaming</p>
                  </div>
                </div>
                
                <div 
                  onClick={() => navigate('/communities?category=learning')} 
                  className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-2 group-hover:scale-110 transition-transform">
                      📚
                    </div>
                    <h5 className="font-semibold text-gray-900 text-sm">Learning</h5>
                    <p className="text-xs text-gray-600 mt-1">Education, Skills, Courses</p>
                  </div>
                </div>
                
                <div 
                  onClick={() => navigate('/communities?category=fitness-health')} 
                  className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-2 group-hover:scale-110 transition-transform">
                      💪
                    </div>
                    <h5 className="font-semibold text-gray-900 text-sm">Fitness & Health</h5>
                    <p className="text-xs text-gray-600 mt-1">Wellness, Nutrition, Exercise</p>
                  </div>
                </div>
                
                <div 
                  onClick={() => navigate('/communities?category=art-design')} 
                  className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-2 group-hover:scale-110 transition-transform">
                      🎨
                    </div>
                    <h5 className="font-semibold text-gray-900 text-sm">Art & Design</h5>
                    <p className="text-xs text-gray-600 mt-1">Creative, Visual, Digital Art</p>
                  </div>
                </div>
                
                <div 
                  onClick={() => navigate('/communities?category=business')} 
                  className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-2 group-hover:scale-110 transition-transform">
                      💼
                    </div>
                    <h5 className="font-semibold text-gray-900 text-sm">Business</h5>
                    <p className="text-xs text-gray-600 mt-1">Entrepreneurship, Finance, Marketing</p>
                  </div>
                </div>
                
                <div 
                  onClick={() => navigate('/communities?category=travel-culture')} 
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-2 group-hover:scale-110 transition-transform">
                      ✈️
                    </div>
                    <h5 className="font-semibold text-gray-900 text-sm">Travel & Culture</h5>
                    <p className="text-xs text-gray-600 mt-1">Adventure, Food, Lifestyle</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Community Guidelines</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Be respectful and supportive of fellow creators</li>
                <li>• Share valuable content that benefits the community</li>
                <li>• Follow each community's specific rules and guidelines</li>
                <li>• Report inappropriate content to help maintain a safe environment</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;