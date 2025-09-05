import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../AuthContext";
import { Link } from "react-router-dom";
import ChatRooms from "../components/ChatRooms";
import DirectMessage from "../components/DirectMessage";
import MessageReactions from '../components/MessageReactions';
import FileShare from '../components/FileShare';
import SearchBar from '../components/SearchBar';
import Avatar from '../components/Avatar';
import NotificationSystem from '../components/NotificationSystem';
import MentionSystem, { parseMentions, renderTextWithMentions, type User } from '../components/MentionSystem';
import ModerationSystem from '../components/ModerationSystem';
import "./Chat.css";

interface Reaction {
  id: number;
  emoji: string;
  messageId: number;
  userId: number;
  count?: number;
  users?: string[];
  user: {
    id: number;
    name: string;
    displayName: string;
  };
}

interface Message {
  id: number;
  content: string;
  type: 'text' | 'file' | 'image';
  senderId: number;
  chatRoomId: number;
  replyToId?: number;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    displayName: string;
  };
  replyTo?: {
    id: number;
    content: string;
    sender: {
      id: number;
      name: string;
      displayName: string;
    };
  };
  reactions?: Reaction[];
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  isDelivered?: boolean;
  isRead?: boolean;
  readBy?: string[];
}

interface TypingUser {
  userId: number;
  roomId: number;
  isTyping: boolean;
  timestamp: string;
  username?: string;
}

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

function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [directMessageUser, setDirectMessageUser] = useState<OnlineUser | null>(null);
  const [showDirectMessage, setShowDirectMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<any>({});
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Mention states
  const [mentionableUsers, setMentionableUsers] = useState<User[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Moderation states
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const { logout, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user) return;

    socketRef.current = io("http://localhost:4000");
    const socket = socketRef.current;

    socket.on("connect", () => {
      setIsConnected(true);
      // Authenticate the socket connection
      socket.emit("authenticate", { userId: user.id });
      console.log("Connected to chat server");
    });

    socket.on("authenticated", (data) => {
      if (data.success) {
        console.log("Socket authenticated successfully");
      }
    });

    socket.on("authentication_error", (data) => {
      console.error("Socket authentication failed:", data.error);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from chat server");
    });

    socket.on("receive_room_message", (message: Message) => {
      if (selectedRoom && message.chatRoomId === selectedRoom.id) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on("user_typing", (data: TypingUser) => {
      if (selectedRoom && data.roomId === selectedRoom.id) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.userId);
          return data.isTyping ? [...filtered, data] : filtered;
        });
      }
    });

    socket.on("user_joined", (data) => {
      console.log(`User ${data.userId} joined room ${data.roomId}`);
    });

    socket.on("user_left", (data) => {
      console.log(`User ${data.userId} left room ${data.roomId}`);
    });

    socket.on("user_offline", (data) => {
      console.log(`User ${data.userId} went offline`);
    });

    socket.on("error", (data) => {
      console.error("Socket error:", data.message);
    });

    // Handle message reactions
    socket.on("reaction_added", (data: { messageId: number; reactions: Reaction[] }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            reactions: data.reactions
          };
        }
        return msg;
      }));
    });

    socket.on("reaction_removed", (data: { messageId: number; reactions: Reaction[] }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          return {
            ...msg,
            reactions: data.reactions
          };
        }
        return msg;
      }));
    });

    // Handle read receipts
    socket.on("message_read_receipt", (data: { messageId: number; userId: number; username: string }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          const readBy = msg.readBy || [];
          if (!readBy.some(r => typeof r === 'string' ? r === data.userId.toString() : (r as any).userId === data.userId)) {
            return {
              ...msg,
              readBy: [...readBy, data.userId.toString()]
            };
          }
        }
        return msg;
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !socketRef.current || !user || !selectedRoom) return;
    
    // Parse mentions from the message
    const { mentions } = parseMentions(input, mentionableUsers);
    
    const messageData = {
      content: input.trim(),
      roomId: selectedRoom.id,
      type: 'text',
      replyToId: replyingTo?.id || null,
      mentions: mentions.map(user => user.id)
    };

    socketRef.current.emit("send_room_message", messageData);
    
    setInput("");
    setReplyingTo(null);
    
    // Create notifications for mentioned users
    mentions.forEach(mentionedUser => {
      if (user && mentionedUser.id !== user.id) {
        addNotification({
          type: 'mention',
          title: 'You were mentioned',
          message: `${user.displayName} mentioned you in ${selectedRoom.name}`,
          userId: user?.id,
          userName: user.displayName,
          userAvatar: user?.displayName || user?.name || '',
          roomId: selectedRoom.id,
          roomName: selectedRoom.name
        });
      }
    });
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    socketRef.current.emit("typing", { 
      roomId: selectedRoom.id,
      isTyping: false
    });
  };

  const handleTyping = (isTyping: boolean) => {
    if (!socketRef.current || !user || !selectedRoom) return;
    
    socketRef.current.emit("typing", {
      roomId: selectedRoom.id,
      isTyping
    });
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    
    if (!socketRef.current || !user || !selectedRoom) return;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing indicator
    socketRef.current.emit("typing", {
      roomId: selectedRoom.id,
      isTyping: true
    });
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && selectedRoom) {
        socketRef.current.emit("typing", {
          roomId: selectedRoom.id,
          isTyping: false
        });
      }
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleEmojiClick = (emoji: string) => {
    setInput(prev => prev + emoji);
  };



  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleReactionAdd = (messageId: string, emoji: string) => {
    if (!socketRef.current || !user) return;
    
    socketRef.current.emit('add_reaction', {
      messageId: parseInt(messageId),
      emoji
    });
  };

  const handleReactionRemove = (messageId: string, emoji: string) => {
    if (!socketRef.current || !user) return;
    
    socketRef.current.emit('remove_reaction', {
      messageId: parseInt(messageId),
      emoji
    });
  };

  const handleFileSelect = async (file: File) => {
    if (!socketRef.current || !user || !selectedRoom) return;
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', selectedRoom.id.toString());
      formData.append('replyToId', replyingTo?.id?.toString() || '');
      
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:4000/api/chat/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        // File upload successful, message will be received via WebSocket
        setReplyingTo(null);
      } else {
        console.error('File upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  // Search functionality
  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    setSearchFilters(filters);
    setIsSearching(true);

    if (!query.trim() && Object.values(filters).every(f => !f || f === 'all')) {
      setFilteredMessages([]);
      setIsSearching(false);
      return;
    }

    const filtered = messages.filter(message => {
      // Text search
      const matchesQuery = !query.trim() || 
        message.content.toLowerCase().includes(query.toLowerCase()) ||
        message.sender.name.toLowerCase().includes(query.toLowerCase()) ||
        (message.sender.displayName && message.sender.displayName.toLowerCase().includes(query.toLowerCase()));

      // Date filter
      const matchesDate = !filters.dateRange || filters.dateRange === 'all' || (() => {
        const messageDate = new Date(message.createdAt);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        switch (filters.dateRange) {
          case 'today': return messageDate >= today;
          case 'week': return messageDate >= weekAgo;
          case 'month': return messageDate >= monthAgo;
          default: return true;
        }
      })();

      // Message type filter
      const matchesType = !filters.messageType || filters.messageType === 'all' || (() => {
        switch (filters.messageType) {
          case 'text': return message.type === 'text';
          case 'file': return message.type === 'file';
          case 'image': return message.type === 'image';
          default: return true;
        }
      })();

      // Sender filter
      const matchesSender = !filters.sender || 
        message.sender.name.toLowerCase().includes(filters.sender.toLowerCase()) ||
        (message.sender.displayName && message.sender.displayName.toLowerCase().includes(filters.sender.toLowerCase()));

      return matchesQuery && matchesDate && matchesType && matchesSender;
    });

    setFilteredMessages(filtered);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchFilters({});
    setFilteredMessages([]);
    setIsSearching(false);
  };

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  };

  // Notification functions
  const addNotification = (notification: any) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Mention functions
  const handleMention = (mentionedUser: User) => {
    // Add notification for mentioned user
    if (user && mentionedUser.id !== user.id) {
      addNotification({
        type: 'mention',
        title: 'You were mentioned',
        message: `${user?.displayName} mentioned you in ${selectedRoom?.name}`,
        userId: user?.id,
        userName: user?.displayName,
        userAvatar: user?.displayName || user?.name || '',
        roomId: selectedRoom?.id,
        roomName: selectedRoom?.name
      });
    }
  };

  const displayMessages = isSearching ? filteredMessages : messages;

  // Moderation functions
  const handleUserAction = (action: any) => {
    if (!socketRef.current || !user) return;
    
    // Emit moderation action to server
    socketRef.current.emit('moderation_action', action);
    
    // Add notification for the action
    addNotification({
      type: 'moderation',
      title: 'Moderation Action',
      message: `${action.type} action taken against ${action.targetUsername}`,
      userId: user.id,
      userName: user.displayName,
      roomId: selectedRoom?.id,
      roomName: selectedRoom?.name
    });
  };

  const handleMessageDelete = (messageId: string) => {
    if (!socketRef.current || !user) return;
    
    socketRef.current.emit('delete_message', { messageId });
    
    // Remove message from local state
    setMessages(prev => prev.filter(msg => msg.id !== parseInt(messageId)));
  };

  const handleUserRoleChange = (userId: string, newRole: string) => {
    if (!socketRef.current || !user) return;
    
    socketRef.current.emit('change_user_role', { userId, newRole, roomId: selectedRoom?.id });
    
    // Update local room members
    setRoomMembers(prev => prev.map(member => 
      member.id === userId ? { ...member, role: newRole } : member
    ));
  };

  // Populate room members when room is selected
  useEffect(() => {
    if (selectedRoom) {
      // Mock room members data - in real app, this would come from the server
      const mockMembers = [
        {
          id: user?.id || '',
          username: user?.displayName || user?.name || '',
          avatar: user?.displayName || user?.name || '',
          role: 'admin',
          isOnline: true,
          joinedAt: new Date(),
          lastActive: new Date()
        },
        {
          id: '2',
          username: 'John Doe',
          avatar: null,
          role: 'moderator',
          isOnline: true,
          joinedAt: new Date(Date.now() - 86400000),
          lastActive: new Date()
        },
        {
          id: '3',
          username: 'Jane Smith',
          avatar: null,
          role: 'member',
          isOnline: false,
          joinedAt: new Date(Date.now() - 172800000),
          lastActive: new Date(Date.now() - 3600000)
        },
        {
          id: '4',
          username: 'Bob Wilson',
          avatar: null,
          role: 'member',
          isOnline: true,
          joinedAt: new Date(Date.now() - 259200000),
          lastActive: new Date()
        }
      ];
      
      setRoomMembers(mockMembers);
      
      // Set mentionable users from room members
      setMentionableUsers(mockMembers.map(member => ({
          id: member.id,
          username: member.username,
          displayName: member.username,
          avatar: member.avatar || undefined,
          role: member.role,
          isOnline: member.isOnline
        })));
    }
  }, [selectedRoom, user]);

  // Room management functions
  const handleRoomSelect = async (room: ChatRoom) => {
    if (selectedRoom?.id === room.id) return;
    
    // Leave current room if any
    if (selectedRoom && socketRef.current) {
      socketRef.current.emit("leave_room", { roomId: selectedRoom.id });
    }
    
    // Join new room
    if (socketRef.current) {
      socketRef.current.emit("join_room", { roomId: room.id, userId: user?.id });
    }
    
    setSelectedRoom(room);
    setMessages([]);
    setShowDirectMessage(false);
    
    // Populate mentionable users from room members
    const users: User[] = roomMembers?.map((member: any) => ({
      id: member.id,
      username: member.username || member.displayName?.toLowerCase().replace(/\s+/g, ''),
      displayName: member.displayName || member.username,
      avatar: member.avatar,
      isOnline: member.isOnline
    })) || [];
    setMentionableUsers(users);
    
    // Fetch room messages
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`http://localhost:4000/api/chat/rooms/${room.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const roomMessages = await response.json();
        setMessages(roomMessages);
      }
    } catch (error) {
      console.error('Error fetching room messages:', error);
    }
  };

  const handleDirectMessageSelect = (user: OnlineUser) => {
    setDirectMessageUser(user);
    setShowDirectMessage(true);
    setSelectedRoom(null);
    setMessages([]);
  };

  const handleBackToRooms = () => {
    setShowDirectMessage(false);
    setDirectMessageUser(null);
  };

  const handleMessageSelect = (messageId: number) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('bg-yellow-100');
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-100');
      }, 2000);
    }
  };



  return (
    <div className="chat-container">
      {!user ? (
        <div className="chat-loading">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to access chat</h2>
            <p className="text-gray-600">You need to be logged in to participate in the chat.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Navigation Header */}
          <nav className="chat-nav">
            <div className="chat-nav-content">
              <div className="chat-nav-header">
                <div className="chat-nav-left">
                  <h1 className="chat-nav-title">Creator Hub Chat</h1>
                  <div className="chat-nav-breadcrumb">
                    {showDirectMessage && directMessageUser && (
                      <>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="text-lg font-medium text-blue-600">
                           {directMessageUser.displayName || directMessageUser.name}
                         </span>
                      </>
                    )}
                    {selectedRoom && !showDirectMessage && (
                      <>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="text-lg font-medium text-blue-600">
                          {selectedRoom.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="chat-nav-actions">
                  {showDirectMessage && (
                    <button
                      onClick={handleBackToRooms}
                      className="text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      ← Back to Rooms
                    </button>
                  )}
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                    Search
                  </button>
                  <NotificationSystem
                    notifications={notifications}
                    onMarkAsRead={markNotificationAsRead}
                    onMarkAllAsRead={markAllNotificationsAsRead}
                    onClearAll={clearAllNotifications}
                  />
                  {selectedRoom && (
                    <ModerationSystem
                      currentUser={{
                        id: user.id,
                        username: user.displayName || user.name,
                        avatar: user.displayName || user.name,
                        role: roomMembers.find(m => m.id === user.id)?.role || 'member',
                        isOnline: true,
                        joinedAt: new Date(),
                        lastActive: new Date()
                      }}
                      roomMembers={roomMembers}
                      messages={messages.map(msg => ({
                        id: msg.id.toString(),
                        content: msg.content,
                        userId: msg.senderId.toString(),
                        username: msg.sender.displayName || msg.sender.name,
                        timestamp: new Date(msg.createdAt),
                        isReported: false,
                        reportCount: 0
                      }))}
                      onUserAction={handleUserAction}
                      onMessageDelete={handleMessageDelete}
                      onUserRoleChange={handleUserRoleChange}
                    />
                  )}
                  <Link
                    to="/dashboard"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hidden-mobile"
                  >
                    Creator Studio
                  </Link>
                  <Link
                    to="/feed"
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hidden-mobile"
                  >
                    Feed
                  </Link>
                  <div className="connection-status">
                    <div className={`connection-dot ${
                      isConnected ? 'connected' : 'disconnected'
                    }`}></div>
                    <span className="text-sm text-gray-600">
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
          
          {/* Main Content */}
          <div className="chat-main-content">
            <div className="chat-layout">
              {/* Sidebar */}
              {!showDirectMessage && (
                <div className="chat-sidebar">
                  <ChatRooms
                    socket={socketRef.current}
                    user={user}
                    selectedRoom={selectedRoom}
                    onRoomSelect={handleRoomSelect}
                    onDirectMessageSelect={handleDirectMessageSelect}
                  />
                </div>
              )}
              
              {/* Chat Area */}
              <div className="chat-area">
                {showDirectMessage && directMessageUser ? (
                  <DirectMessage
                    socket={socketRef.current}
                    recipientUser={directMessageUser}
                    onClose={() => setDirectMessageUser(null)}
                  />
                ) : selectedRoom ? (
                   <>
                     {/* Room Chat Interface */}
                    {/* Room Header */}
                    <div className="p-4 border-b">
                      <h2 className="text-lg font-semibold text-gray-900">{selectedRoom.name}</h2>
                      <p className="text-sm text-gray-600">{selectedRoom.description}</p>
                    </div>
                    
                    {/* Search Bar */}
                    <SearchBar 
                      onSearch={handleSearch}
                      onClear={handleClearSearch}
                      placeholder="Search messages..."
                    />
                    
                    {/* Search Results Count */}
                    {isSearching && (
                      <div className="search-results-count">
                        {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} found
                        {searchQuery && ` for "${searchQuery}"`}
                      </div>
                    )}
                    
                    {/* Messages Container */}
                    <div className="chat-messages">
                      {displayMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-500">{isSearching ? 'No messages found matching your search.' : 'No messages yet. Start the conversation!'}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {displayMessages.map(msg => {
                            const isOwnMessage = msg.sender.id === parseInt(user.id);
                            return (
                              <div key={msg.id} className={`chat-message flex items-end gap-2 ${
                                isOwnMessage ? 'justify-end' : 'justify-start'
                              }`}>
                                {!isOwnMessage && (
                                  <Avatar 
                                    user={{
                                      id: msg.sender.id,
                                      displayName: msg.sender.displayName,
                                      username: msg.sender.name
                                    }} 
                                    size="sm" 
                                    className="mb-1"
                                  />
                                )}
                                <div 
                                  id={`message-${msg.id}`}
                                  className={`message-bubble max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-3 sm:px-4 py-2 rounded-lg transition-colors duration-500 ${
                                    isOwnMessage 
                                      ? 'bg-blue-500 text-white' 
                                      : 'bg-white border shadow-sm'
                                  }`}>
                                  {!isOwnMessage && (
                                     <div className="message-sender text-xs font-semibold text-gray-600 mb-1">
                                       {msg.sender.displayName || msg.sender.name}
                                     </div>
                                   )}
                                   
                                   {/* Reply Preview */}
                                   {msg.replyTo && (
                                     <div className={`reply-preview p-2 mb-2 rounded border-l-4 ${
                                       isOwnMessage 
                                         ? 'bg-blue-400 border-blue-200 text-blue-100' 
                                         : 'bg-gray-50 border-gray-300 text-gray-600'
                                     }`}>
                                       <div className="text-xs font-semibold mb-1">
                                         {msg.replyTo.sender.displayName || msg.replyTo.sender.name}
                                       </div>
                                       <div className="text-xs opacity-80 truncate">
                                         {msg.replyTo.content}
                                       </div>
                                     </div>
                                   )}
                                   
                                   <div className="message-text text-sm">
                                     {renderTextWithMentions(msg.content, mentionableUsers)}
                                   </div>
                                   
                                   {/* Message Actions */}
                                   <div className="message-actions flex items-center justify-between mt-2">
                                     <div className={`message-time text-xs ${
                                       isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                                     }`}>
                                       {formatTime(msg.createdAt)}
                                     </div>
                                     <button
                                       onClick={() => setReplyingTo(msg)}
                                       className={`reply-btn text-xs px-2 py-1 rounded hover:bg-opacity-20 ${
                                         isOwnMessage 
                                           ? 'text-blue-100 hover:bg-white' 
                                           : 'text-gray-500 hover:bg-gray-200'
                                       }`}
                                     >
                                       Reply
                                     </button>
                                   </div>
                                  
                                  {/* Message Reactions */}
                                   <MessageReactions
                                     messageId={msg.id.toString()}
                                     reactions={msg.reactions?.map(r => ({
                                       emoji: r.emoji,
                                       count: r.count || 1,
                                       users: r.users || [r.user?.displayName || r.user?.name || 'Unknown']
                                     })) || []}
                                     currentUser={user.displayName || user.name}
                                     onReactionAdd={handleReactionAdd}
                                     onReactionRemove={handleReactionRemove}
                                   />
                                   
                                   {/* Read Receipts */}
                                   {msg.readBy && msg.readBy.length > 0 && (
                                     <div className="text-xs text-gray-400 mt-1">
                                       Read by {msg.readBy.join(', ')}
                                     </div>
                                   )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Typing Indicators */}
                       {typingUsers.length > 0 && (
                         <div className="mt-3 flex items-center gap-2">
                           <div className="flex -space-x-1">
                             {typingUsers.slice(0, 3).map((user, index) => (
                               <Avatar 
                                 key={user.userId} 
                                 user={{
                                   id: user.userId,
                                   displayName: user.username
                                 }} 
                                 size="sm" 
                                 className={`border-2 border-white ${index > 0 ? 'ml-0' : ''}`}
                               />
                             ))}
                             {typingUsers.length > 3 && (
                               <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-xs text-white font-semibold border-2 border-white">
                                 +{typingUsers.length - 3}
                               </div>
                             )}
                           </div>
                           <div className="text-sm text-gray-500 italic">
                             {typingUsers.length === 1 
                               ? `${typingUsers[0].username || 'Someone'} is typing...`
                               : `${typingUsers.length} people are typing...`
                             }
                           </div>
                           <div className="flex space-x-1">
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                             <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                           </div>
                         </div>
                       )}
                      
                      {/* Auto-scroll anchor */}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Input Area */}
                    <div className="chat-input-area">
                      {/* Reply Indicator */}
                      {replyingTo && (
                        <div className="reply-indicator bg-gray-100 border-l-4 border-blue-500 p-3 mb-2 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-gray-600 mb-1">
                              Replying to {replyingTo.sender.displayName || replyingTo.sender.name}
                            </div>
                            <div className="text-sm text-gray-800 truncate">
                              {replyingTo.content}
                            </div>
                          </div>
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="ml-3 text-gray-500 hover:text-gray-700 p-1"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      
                      <div className="chat-input-container">
                        <div className="mention-input-wrapper">
                           <input
                             ref={inputRef}
                             type="text"
                             value={input}
                             onChange={(e) => handleInputChange(e.target.value)}
                             onKeyPress={handleKeyPress}
                             placeholder="Type a message... (use @ to mention)"
                             className="chat-input"
                             disabled={!isConnected}
                           />
                           <MentionSystem
                             inputRef={inputRef}
                             value={input}
                             onChange={handleInputChange}
                             users={mentionableUsers}
                             onMention={handleMention}
                           />
                         </div>
                         <FileShare
                           onFileSelect={handleFileSelect}
                           disabled={!isConnected}
                         />
                         <button
                           onClick={handleSend}
                           disabled={!isConnected || !input.trim()}
                           className="chat-send-button"
                         >
                           Send
                         </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Creator Hub Chat</h3>
                      <p className="text-gray-600">Select a room or start a direct message to begin chatting.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Chat Search Modal - TODO: Implement */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Search Messages</h3>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 text-center text-gray-500">
              Search functionality coming soon!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;