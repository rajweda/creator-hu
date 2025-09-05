import React, { useState, useRef, useEffect } from 'react';
import { AtSign, X } from 'lucide-react';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isOnline?: boolean;
}

interface MentionSystemProps {
  users: User[];
  onMention: (user: User) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}

interface MentionSuggestion {
  user: User;
  startIndex: number;
  query: string;
}

const MentionSystem: React.FC<MentionSystemProps> = ({
  users,
  onMention,
  inputRef,
  value,
  onChange
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Parse mentions from text
  const parseMentions = (text: string): { text: string; mentions: User[] } => {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions: User[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const username = match[1];
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (user && !mentions.find(m => m.id === user.id)) {
        mentions.push(user);
      }
    }

    return { text, mentions };
  };

  // Render text with highlighted mentions
  const renderTextWithMentions = (text: string) => {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const username = match[1];
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add mention
      if (user) {
        parts.push(
          <span key={match.index} className="mention-highlight">
            @{user.username}
          </span>
        );
      } else {
        parts.push(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  // Handle input change
  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    if (!inputRef.current) return;

    const cursorPosition = inputRef.current.selectionStart || 0;
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ');

      if (!hasSpaceAfterAt && textAfterAt.length <= 20) {
        // Show suggestions
        const query = textAfterAt.toLowerCase();
        const filteredUsers = users.filter(user => 
          user.username.toLowerCase().includes(query) ||
          user.displayName.toLowerCase().includes(query)
        ).slice(0, 5);

        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        setSuggestions(filteredUsers);
        setShowSuggestions(filteredUsers.length > 0);
        setSelectedIndex(0);
        return;
      }
    }

    // Hide suggestions
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        selectMention(suggestions[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  // Select a mention
  const selectMention = (user: User) => {
    if (mentionStartIndex === -1) return;

    const beforeMention = value.slice(0, mentionStartIndex);
    const afterMention = value.slice(mentionStartIndex + mentionQuery.length + 1);
    const newValue = `${beforeMention}@${user.username} ${afterMention}`;
    
    onChange(newValue);
    onMention(user);
    
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery('');
    setMentionStartIndex(-1);

    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPosition = mentionStartIndex + user.username.length + 2;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // Calculate suggestion position
  const getSuggestionPosition = () => {
    if (!inputRef.current || mentionStartIndex === -1) {
      return { top: 0, left: 0 };
    }

    const input = inputRef.current;
    const rect = input.getBoundingClientRect();
    
    // Simple positioning - above the input
    return {
      top: rect.top - 10,
      left: rect.left
    };
  };

  return (
    <>
      {/* Mention Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionRef}
          className="mention-suggestions"
          style={{
            position: 'fixed',
            ...getSuggestionPosition(),
            transform: 'translateY(-100%)'
          }}
        >
          <div className="mention-suggestions-header">
            <AtSign className="w-4 h-4" />
            <span>Mention someone</span>
          </div>
          
          <div className="mention-suggestions-list">
            {suggestions.map((user, index) => (
              <div
                key={user.id}
                className={`mention-suggestion-item ${
                  index === selectedIndex ? 'selected' : ''
                }`}
                onClick={() => selectMention(user)}
              >
                <div className="mention-user-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.displayName} />
                  ) : (
                    <div className="mention-user-avatar-placeholder">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {user.isOnline && <div className="mention-user-online-dot" />}
                </div>
                
                <div className="mention-user-info">
                  <div className="mention-user-name">{user.displayName}</div>
                  <div className="mention-user-username">@{user.username}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export { MentionSystem, type User };

// Helper function to parse mentions (can be used outside component)
export const parseMentions = (text: string, users: User[]): { text: string; mentions: User[] } => {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const mentions: User[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && !mentions.find(m => m.id === user.id)) {
      mentions.push(user);
    }
  }

  return { text, mentions };
};

// Helper function to render text with mentions (can be used outside component)
export const renderTextWithMentions = (text: string, users: User[]) => {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add mention
    if (user) {
      parts.push(
        <span key={match.index} className="mention-highlight">
          @{user.username}
        </span>
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

export default MentionSystem;