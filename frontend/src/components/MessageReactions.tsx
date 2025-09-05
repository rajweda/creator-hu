import React, { useState } from 'react';
import Button from './Button';

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUser: string;
  onReactionAdd: (messageId: string, emoji: string) => void;
  onReactionRemove: (messageId: string, emoji: string) => void;
}

const COMMON_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUser,
  onReactionAdd,
  onReactionRemove
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    const userHasReacted = existingReaction?.users.includes(currentUser);

    if (userHasReacted) {
      onReactionRemove(messageId, emoji);
    } else {
      onReactionAdd(messageId, emoji);
    }
  };

  const handleAddReaction = (emoji: string) => {
    handleReactionClick(emoji);
    setShowReactionPicker(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1 relative">
      {/* Existing reactions */}
      {reactions.map((reaction) => {
        const userHasReacted = reaction.users?.includes(currentUser) || false;
        return (
          <button
            key={reaction.emoji}
            onClick={() => handleReactionClick(reaction.emoji)}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs
              transition-colors duration-200
              ${userHasReacted 
                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
            title={`${reaction.users.join(', ')} reacted with ${reaction.emoji}`}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowReactionPicker(!showReactionPicker)}
          className="
            w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200
            flex items-center justify-center text-gray-500 hover:text-gray-700
            transition-colors duration-200
          "
          title="Add reaction"
        >
          <span className="text-xs">+</span>
        </button>

        {/* Reaction picker */}
        {showReactionPicker && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowReactionPicker(false)}
            />
            
            {/* Picker */}
            <div className="
              absolute bottom-full left-0 mb-2 z-20
              bg-white border border-gray-200 rounded-lg shadow-lg
              p-2 flex gap-1
            ">
              {COMMON_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAddReaction(emoji)}
                  className="
                    w-8 h-8 rounded hover:bg-gray-100
                    flex items-center justify-center
                    transition-colors duration-200
                  "
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageReactions;