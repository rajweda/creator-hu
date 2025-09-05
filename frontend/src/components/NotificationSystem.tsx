import React, { useState, useEffect } from 'react';
import { Bell, X, MessageCircle, AtSign, Heart, FileText } from 'lucide-react';

interface Notification {
  id: string;
  type: 'mention' | 'reaction' | 'reply' | 'file_share' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  roomId?: string;
  roomName?: string;
}

interface NotificationSystemProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'mention':
        return <AtSign className="w-4 h-4 text-blue-500" />;
      case 'reaction':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'reply':
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'file_share':
        return <FileText className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div className="notification-system">
      {/* Notification Bell */}
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3 className="notification-title">Notifications</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button
                  className="btn-text"
                  onClick={onMarkAllAsRead}
                >
                  Mark all read
                </button>
              )}
              <button
                className="btn-text"
                onClick={onClearAll}
              >
                Clear all
              </button>
              <button
                className="btn-icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell className="w-8 h-8 text-gray-300" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    notification.read ? 'read' : 'unread'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-item-title">
                      {notification.title}
                    </div>
                    <div className="notification-message">
                      {notification.message}
                    </div>
                    <div className="notification-meta">
                      {notification.roomName && (
                        <span className="notification-room">
                          in {notification.roomName}
                        </span>
                      )}
                      <span className="notification-time">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                  </div>

                  {!notification.read && (
                    <div className="notification-unread-dot" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div 
          className="notification-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationSystem;