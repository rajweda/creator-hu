import React from 'react';

interface ReadReceiptProps {
  messageId: string;
  isOwnMessage: boolean;
  isDelivered: boolean;
  isRead: boolean;
  readBy?: string[];
}

const ReadReceipts: React.FC<ReadReceiptProps> = ({
  messageId,
  isOwnMessage,
  isDelivered,
  isRead,
  readBy = []
}) => {
  // Only show read receipts for own messages
  if (!isOwnMessage) {
    return null;
  }

  return (
    <div className="flex items-center justify-end mt-1">
      <div className="flex items-center gap-1 text-xs text-gray-500">
        {/* Delivery status */}
        {isDelivered ? (
          <div className="flex items-center gap-1">
            {/* Double checkmark for delivered */}
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              className={`${isRead ? 'text-blue-500' : 'text-gray-400'}`}
            >
              <path 
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" 
                fill="currentColor"
              />
              <path 
                d="M15 16.17L10.83 12l-1.42 1.41L15 19 27 7l-1.41-1.41L15 16.17z" 
                fill="currentColor"
                opacity="0.6"
              />
            </svg>
            
            {/* Read status text */}
            {isRead ? (
              <span className="text-blue-500">
                {readBy.length > 0 ? `Read by ${readBy.join(', ')}` : 'Read'}
              </span>
            ) : (
              <span>Delivered</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {/* Single checkmark for sent */}
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              className="text-gray-400"
            >
              <path 
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" 
                fill="currentColor"
              />
            </svg>
            <span>Sent</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadReceipts;