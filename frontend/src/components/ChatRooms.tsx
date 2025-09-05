import React, { useState, useEffect } from 'react';
import Button from './Button';
import { CategoryService, CategoryData, RegionData } from '../services/categoryService';
import './Chat.css';

interface ChatRoom {
  id: number;
  name: string;
  description: string;
  category: 'topic' | 'region';
  subcategory: string;
  participantCount: number;
  maxUsers: number;
  isPrivate: boolean;
  createdAt: string;
}

interface OnlineUser {
  id: number;
  name: string;
  displayName: string;
  status: 'online' | 'away' | 'busy';
  lastSeen: string;
}

interface ChatRoomsProps {
  socket?: any;
  user?: any;
  selectedRoom?: ChatRoom | null;
  onRoomSelect: (room: ChatRoom) => void;
  onDirectMessageSelect: (user: OnlineUser) => void;
}

// Categories are now managed by CategoryService

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'away': return 'bg-yellow-500';
    case 'busy': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

function ChatRooms({ socket, user, selectedRoom, onRoomSelect, onDirectMessageSelect }: ChatRoomsProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [allUsers, setAllUsers] = useState<{id: number; name: string; displayName: string}[]>([]);
  const [categoryTab, setCategoryTab] = useState<'topics' | 'regions' | 'users'>('topics');
  const [activeTab, setActiveTab] = useState<'rooms' | 'users'>('rooms');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [topicCategories] = useState(CategoryService.getTopicCategories());
  const [regionCategories] = useState(CategoryService.getRegionCategories());
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    description: '',
    category: 'topic' as 'topic' | 'region',
    subcategory: '',
    maxUsers: 50,
    isPrivate: false
  });
  const [loading, setLoading] = useState(true);
  const [currentUserStatus, setCurrentUserStatus] = useState<'online' | 'away' | 'busy'>('online');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  // User is passed as prop, no need for useAuth hook

  // Handle category selection and show subcategories
  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setShowSubcategories(true);
    setSelectedSubcategory('');
  };

  // Handle subcategory selection and create/join room
  const handleSubcategorySelect = async (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    
    // Generate room name and check if it exists
    const roomName = CategoryService.generateRoomName(selectedCategory, subcategory);
    const existingRoom = rooms.find(room => room.name === roomName);
    
    if (existingRoom) {
      // Join existing room
      onRoomSelect(existingRoom);
    } else {
      // Create new room automatically
      await createCategoryRoom(selectedCategory, subcategory);
    }
    
    setShowSubcategories(false);
  };

  // Create a new room for the selected category and subcategory
  const createCategoryRoom = async (category: string, subcategory: string) => {
    try {
      const roomData = {
        name: CategoryService.generateRoomName(category, subcategory),
        description: CategoryService.generateRoomDescription(category, subcategory, categoryTab === 'topics' ? 'topic' : 'region'),
        type: categoryTab === 'topics' ? 'topic' : 'region',
        category: category,
        subcategory: subcategory,
        maxUsers: 100,
        isPrivate: false
      };

      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:4000/api/chat/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(roomData),
      });

      if (response.ok) {
        const newRoom = await response.json();
        setRooms(prev => [...prev, newRoom]);
        onRoomSelect(newRoom);
      }
    } catch (error) {
      console.error('Error creating category room:', error);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchOnlineUsers();
    fetchAllUsers();
    
    // Set up real-time presence updates
    if (socket) {
      socket.on('user_online', (data: { userId: number; status: string; timestamp: string }) => {
        setOnlineUsers(prev => {
          const existingIndex = prev.findIndex(u => u.id === data.userId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], status: data.status as any, lastSeen: data.timestamp };
            return updated;
          }
          return prev;
        });
      });
      
      socket.on('user_offline', (data: { userId: number; timestamp: string }) => {
        setOnlineUsers(prev => prev.filter(u => u.id !== data.userId));
      });
      
      socket.on('user_status_change', (data: { userId: number; status: string; timestamp: string }) => {
        setOnlineUsers(prev => {
          const updated = prev.map(u => 
            u.id === data.userId 
              ? { ...u, status: data.status as any, lastSeen: data.timestamp }
              : u
          );
          return updated;
        });
      });
      
      socket.on('status_changed', (data: { status: string }) => {
        setCurrentUserStatus(data.status as any);
      });
    }
    
    return () => {
      if (socket) {
        socket.off('user_online');
        socket.off('user_offline');
        socket.off('user_status_change');
        socket.off('status_changed');
      }
    };
  }, [socket]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showStatusDropdown) {
        setShowStatusDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown]);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:4000/api/chat/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:4000/api/chat/users/online', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOnlineUsers(data);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };
  
  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:4000/api/chat/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const createRoom = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:4000/api/chat/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newRoomData,
          type: newRoomData.category,
          category: newRoomData.subcategory
        })
      });
      
      if (response.ok) {
        const room = await response.json();
        setRooms(prev => [...prev, room]);
        setShowCreateRoom(false);
        setNewRoomData({
          name: '',
          description: '',
          category: 'topic',
          subcategory: '',
          maxUsers: 50,
          isPrivate: false
        });
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const getFilteredRooms = () => {
    let filtered = rooms;
    
    if (categoryTab === 'topics') {
      filtered = rooms.filter(room => room.category === 'topic');
    } else if (categoryTab === 'regions') {
      filtered = rooms.filter(room => room.category === 'region');
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(room => room.subcategory === selectedCategory);
    }
    
    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Chat Rooms</h2>
          {/* User Status Indicator */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className={`w-3 h-3 rounded-full ${getStatusColor(currentUserStatus)}`}></div>
              <span className="text-sm text-gray-700 capitalize">{currentUserStatus}</span>
            </button>
            
            {/* Status Dropdown */}
            {showStatusDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                {['online', 'away', 'busy'].map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      setCurrentUserStatus(status as any);
                      setShowStatusDropdown(false);
                      if (socket) {
                        socket.emit('change_status', { status });
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                    <span className="text-sm text-gray-700 capitalize">{status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'rooms'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Chat Rooms
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Direct Messages
          </button>
        </div>
        {activeTab === 'rooms' && (
          <Button
            onClick={() => setShowCreateRoom(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
          >
            + Create Room
          </Button>
        )}
      </div>

      {activeTab === 'rooms' ? (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { key: 'topics', label: 'Topics', icon: '💬' },
              { key: 'regions', label: 'Regions', icon: '🌍' },
              { key: 'users', label: 'Users', icon: '👥' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setCategoryTab(tab.key as any);
                  setSelectedCategory('');
                }}
                className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  categoryTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dynamic Category Selection */}
          {categoryTab !== 'users' && (
            <div className="p-3 border-b border-gray-200">
              {/* Search Bar */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder={`Search ${categoryTab === 'topics' ? 'topics' : 'regions'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Category Cards */}
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {Object.entries(categoryTab === 'topics' ? topicCategories : regionCategories)
                  .filter(([name]) => 
                    searchQuery === '' || name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(([name, data]) => (
                    <button
                      key={name}
                      onClick={() => handleCategorySelect(name)}
                      className="p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
                      style={{
                        borderColor: selectedCategory === name ? (categoryTab === 'topics' ? (data as CategoryData).color : '#3B82F6') : undefined,
                        backgroundColor: selectedCategory === name ? (categoryTab === 'topics' ? (data as CategoryData).color + '10' : '#EBF8FF') : undefined
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {categoryTab === 'topics' ? (data as CategoryData).icon : (data as RegionData).icon}
                        </span>
                        <span className="text-xs font-medium text-gray-900 truncate">
                          {name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {categoryTab === 'topics' ? (data as CategoryData).description : (data as RegionData).description}
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        {categoryTab === 'topics' 
                          ? `${(data as CategoryData).subcategories.length} topics`
                          : `${(data as RegionData).countries.length} countries`
                        }
                      </div>
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {categoryTab === 'users' ? (
              /* Online Users */
              <div className="p-3">
                <div className="text-sm font-medium text-gray-700 mb-3">
                  Online Users ({onlineUsers.length})
                </div>
                <div className="space-y-2">
                  {onlineUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => onDirectMessageSelect(user)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {(user.displayName || user.name).charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {user.displayName || user.name}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {user.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Chat Rooms */
              <div className="p-3">
                <div className="space-y-2">
                  {getFilteredRooms().map(room => (
                    <div
                      key={room.id}
                      onClick={() => onRoomSelect(room)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        selectedRoom?.id === room.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {room.isPrivate && '🔒'} {room.name}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {room.participantCount}/{room.maxUsers}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate mb-2">
                        {room.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {room.subcategory}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-500">
                            {room.participantCount} online
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* All Users for Direct Messages */
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-sm font-medium text-gray-700 mb-3">
            Start a conversation
          </div>
          {allUsers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No users available</p>
          ) : (
            <div className="space-y-2">
              {allUsers.map(user => {
                const onlineUser = onlineUsers.find(ou => ou.id === user.id);
                const status = onlineUser?.status || 'offline';
                return (
                  <div
                    key={user.id}
                    onClick={() => onDirectMessageSelect({...user, status: status as any, lastSeen: onlineUser?.lastSeen || ''})}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200 hover:border-gray-300"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {(user.displayName || user.name).charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(status)}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.displayName || user.name}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Room</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomData.name}
                  onChange={(e) => setNewRoomData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter room name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newRoomData.description}
                  onChange={(e) => setNewRoomData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe your room"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Type
                </label>
                <select
                  value={newRoomData.category}
                  onChange={(e) => setNewRoomData(prev => ({ ...prev, category: e.target.value as 'topic' | 'region', subcategory: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="topic">Topic</option>
                  <option value="region">Region</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {newRoomData.category === 'topic' ? 'Topic' : 'Region'}
                </label>
                <select
                  value={newRoomData.subcategory}
                  onChange={(e) => setNewRoomData(prev => ({ ...prev, subcategory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select {newRoomData.category}</option>
                  {Object.keys(newRoomData.category === 'topic' ? topicCategories : regionCategories).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Users
                </label>
                <input
                  type="number"
                  value={newRoomData.maxUsers}
                  onChange={(e) => setNewRoomData(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || 50 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="2"
                  max="500"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={newRoomData.isPrivate}
                  onChange={(e) => setNewRoomData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="isPrivate" className="text-sm text-gray-700">
                  Private room (invite only)
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowCreateRoom(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={createRoom}
                disabled={!newRoomData.name || !newRoomData.subcategory}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Selection Modal */}
      {showSubcategories && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">
                  {CategoryService.getCategoryIcon(selectedCategory, categoryTab === 'topics' ? 'topic' : 'region')}
                </span>
                {selectedCategory}
              </h3>
              <button
                onClick={() => setShowSubcategories(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              {categoryTab === 'topics' 
                ? topicCategories[selectedCategory]?.description
                : regionCategories[selectedCategory]?.description
              }
            </p>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Choose a {categoryTab === 'topics' ? 'topic' : 'region'} to join or create a chat room:
              </h4>
              
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {(categoryTab === 'topics' 
                  ? CategoryService.getTopicSubcategories(selectedCategory)
                  : CategoryService.getRegionCountries(selectedCategory)
                ).map(subcategory => {
                  const roomName = CategoryService.generateRoomName(selectedCategory, subcategory);
                  const existingRoom = rooms.find(room => room.name === roomName);
                  
                  return (
                    <button
                      key={subcategory}
                      onClick={() => handleSubcategorySelect(subcategory)}
                      className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {subcategory}
                          </div>
                          {existingRoom && (
                            <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              {existingRoom.participantCount} members active
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {existingRoom ? 'Join' : 'Create'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowSubcategories(false)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Back to Categories
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatRooms;