import React, { useState, useEffect } from 'react';
import Button from './Button';
import TextInput from './TextInput';

interface Message {
  id: number;
  sender: string;
  text: string;
  timestamp: string;
  type?: 'text' | 'file';
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
}

interface ChatSearchProps {
  messages: Message[];
  onMessageSelect: (messageId: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ChatSearch: React.FC<ChatSearchProps> = ({
  messages,
  onMessageSelect,
  isOpen,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const results = messages.filter(message => {
        // Search in message text
        if (message.text && message.text.toLowerCase().includes(query)) {
          return true;
        }
        // Search in file names
        if (message.fileName && message.fileName.toLowerCase().includes(query)) {
          return true;
        }
        // Search in sender name
        if (message.sender && message.sender.toLowerCase().includes(query)) {
          return true;
        }
        return false;
      });
      
      setSearchResults(results.reverse()); // Show newest first
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, messages]);

  const handleMessageClick = (messageId: number) => {
    onMessageSelect(messageId);
    onClose();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40" 
        onClick={onClose}
      />
      
      {/* Search Modal */}
      <div className="
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        w-full max-w-2xl max-h-[80vh] z-50
        bg-white rounded-lg shadow-xl border
        flex flex-col
      ">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Search Messages</h3>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>
          
          <TextInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages, files, or users..."
            className="w-full"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSearching ? (
            <div className="text-center py-8 text-gray-500">
              Searching...
            </div>
          ) : searchQuery.trim() && searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No messages found for "{searchQuery}"
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((message) => (
                <div
                  key={message.id}
                  onClick={() => handleMessageClick(message.id)}
                  className="
                    p-3 rounded-lg border border-gray-200 hover:bg-gray-50
                    cursor-pointer transition-colors duration-200
                  "
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">
                      {message.sender}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-700">
                    {message.type === 'file' ? (
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                        <span>
                          {highlightText(message.fileName || 'File', searchQuery)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        {highlightText(message.text, searchQuery)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Enter a search term to find messages
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChatSearch;