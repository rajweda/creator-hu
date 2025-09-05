import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import Button from './Button';
import TextInput from './TextInput';
import EmojiPickerComponent from './EmojiPicker';
import { Socket } from 'socket.io-client';

interface DirectMessageData {
  id: number;
  content: string;
  type: 'text' | 'file' | 'image';
  senderId: number;
  recipientId: number;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    displayName: string;
  };
  recipient: {
    id: number;
    name: string;
    displayName: string;
  };
}

interface DirectMessageProps {
  recipientUser: {
    id: number;
    name: string;
    displayName: string;
    status: 'online' | 'away' | 'busy';
  };
  socket: Socket | null;
  onClose: () => void;
}

function DirectMessage({ recipientUser, socket, onClose }: DirectMessageProps) {
  const [messages, setMessages] = useState<DirectMessageData[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && recipientUser) {
      fetchMessages();
    }
  }, [user, recipientUser]);

  useEffect(() => {
    if (socket) {
      socket.on('receive_direct_message', handleReceiveMessage);
      socket.on('direct_message_sent', handleMessageSent);
      socket.on('user_typing_dm', handleTypingIndicator);

      return () => {
        socket.off('receive_direct_message', handleReceiveMessage);
        socket.off('direct_message_sent', handleMessageSent);
        socket.off('user_typing_dm', handleTypingIndicator);
      };
    }
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(
        `http://localhost:4000/api/chat/direct/${recipientUser.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching direct messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveMessage = (message: DirectMessageData) => {
    if (
      (message.senderId === recipientUser.id && message.recipientId === Number(user?.id || 0)) ||
      (message.senderId === Number(user?.id || 0) && message.recipientId === recipientUser.id)
    ) {
      setMessages(prev => [...prev, message]);
    }
  };

  const handleMessageSent = (message: DirectMessageData) => {
    // Message already added optimistically, just update with server data
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.content === message.content) {
        return [...prev.slice(0, -1), message];
      }
      return prev;
    });
  };

  const handleTypingIndicator = (data: { userId: number; isTyping: boolean }) => {
    if (data.userId === recipientUser.id) {
      setIsTyping(data.isTyping);
    }
  };

  const sendMessage = () => {
    if (!input.trim() || !socket || !user) return;

    const optimisticMessage: DirectMessageData = {
      id: Date.now(), // Temporary ID
      content: input.trim(),
      type: 'text',
      senderId: Number(user.id),
      recipientId: recipientUser.id,
      createdAt: new Date().toISOString(),
      sender: {
        id: Number(user.id),
        name: user.name,
        displayName: user.displayName || user.name
      },
      recipient: {
        id: recipientUser.id,
        name: recipientUser.name,
        displayName: recipientUser.displayName
      }
    };

    // Add message optimistically
    setMessages(prev => [...prev, optimisticMessage]);

    // Send to server
    socket.emit('send_direct_message', {
      recipientId: recipientUser.id,
      content: input.trim(),
      type: 'text'
    });

    setInput('');
    handleTyping(false);
  };

  const handleTyping = (typing: boolean) => {
    if (!socket || !user) return;

    socket.emit('typing_dm', {
      recipientId: recipientUser.id,
      isTyping: typing
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (e.target.value.trim()) {
      handleTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false);
      }, 1000);
    } else {
      handleTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setInput(prev => prev + emoji);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-3/4 flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {recipientUser.displayName.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(recipientUser.status)}`}></div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {recipientUser.displayName}
              </h3>
              <p className="text-sm text-gray-500 capitalize">
                {recipientUser.status}
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 px-3 py-1 text-sm"
          >
            ✕
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Start a conversation with {recipientUser.displayName}!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(msg => {
                const isOwnMessage = msg.senderId === parseInt(user.id);
                return (
                  <div key={msg.id} className={`flex ${
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  }`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border shadow-sm'
                    }`}>
                      <div className="text-sm">{msg.content}</div>
                      <div className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="mt-3 text-sm text-gray-500 italic">
              {recipientUser.displayName} is typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2 items-end">
            <EmojiPickerComponent
              onEmojiClick={handleEmojiClick}
              disabled={false}
            />
            <TextInput
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${recipientUser.displayName}...`}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim()}
              className={!input.trim() ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DirectMessage;