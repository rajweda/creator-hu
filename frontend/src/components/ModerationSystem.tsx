import React, { useState, useEffect } from 'react';
import './Chat.css';

interface User {
  id: string;
  username: string;
  avatar?: string;
  role: 'admin' | 'moderator' | 'member';
  isOnline: boolean;
  joinedAt: Date;
  lastActive: Date;
}

interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  timestamp: Date;
  isReported?: boolean;
  reportCount?: number;
}

interface ModerationAction {
  id: string;
  type: 'mute' | 'kick' | 'ban' | 'warn' | 'delete_message';
  targetUserId: string;
  targetUsername: string;
  moderatorId: string;
  moderatorUsername: string;
  reason: string;
  timestamp: Date;
  duration?: number; // in minutes
}

interface ModerationSystemProps {
  currentUser: User;
  roomMembers: User[];
  messages: Message[];
  onUserAction: (action: ModerationAction) => void;
  onMessageDelete: (messageId: string) => void;
  onUserRoleChange: (userId: string, newRole: User['role']) => void;
}

export const ModerationSystem: React.FC<ModerationSystemProps> = ({
  currentUser,
  roomMembers,
  messages,
  onUserAction,
  onMessageDelete,
  onUserRoleChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'actions'>('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<ModerationAction['type']>('warn');
  const [actionReason, setActionReason] = useState('');
  const [actionDuration, setActionDuration] = useState(60);
  const [reportedMessages, setReportedMessages] = useState<Message[]>([]);
  const [moderationHistory, setModerationHistory] = useState<ModerationAction[]>([]);

  // Check if current user has moderation permissions
  const canModerate = currentUser.role === 'admin' || currentUser.role === 'moderator';
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    // Filter reported messages
    const reported = messages.filter(msg => msg.isReported && msg.reportCount && msg.reportCount > 0);
    setReportedMessages(reported);
  }, [messages]);

  const handleUserAction = () => {
    if (!selectedUser || !actionReason.trim()) return;

    const action: ModerationAction = {
      id: Date.now().toString(),
      type: actionType,
      targetUserId: selectedUser.id,
      targetUsername: selectedUser.username,
      moderatorId: currentUser.id,
      moderatorUsername: currentUser.username,
      reason: actionReason,
      timestamp: new Date(),
      duration: ['mute', 'ban'].includes(actionType) ? actionDuration : undefined
    };

    onUserAction(action);
    setModerationHistory(prev => [action, ...prev]);
    setSelectedUser(null);
    setActionReason('');
    setActionDuration(60);
  };

  const handleRoleChange = (userId: string, newRole: User['role']) => {
    if (!isAdmin) return;
    onUserRoleChange(userId, newRole);
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin': return '#ff6b6b';
      case 'moderator': return '#4ecdc4';
      default: return '#95a5a6';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  if (!canModerate) {
    return null;
  }

  return (
    <>
      <button
        className="moderation-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Moderation Tools"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 7C13.1 7 14 7.9 14 9S13.1 11 12 11 10 10.1 10 9 10.9 7 12 7ZM18 15H6V13.5C6 11.84 9.33 11 12 11S18 11.84 18 13.5V15Z"/>
        </svg>
        {reportedMessages.length > 0 && (
          <span className="moderation-badge">{reportedMessages.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="moderation-panel">
          <div className="moderation-header">
            <h3>Moderation Tools</h3>
            <button
              className="moderation-close"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="moderation-tabs">
            <button
              className={`moderation-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users ({roomMembers.length})
            </button>
            <button
              className={`moderation-tab ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              Reports ({reportedMessages.length})
            </button>
            <button
              className={`moderation-tab ${activeTab === 'actions' ? 'active' : ''}`}
              onClick={() => setActiveTab('actions')}
            >
              History ({moderationHistory.length})
            </button>
          </div>

          <div className="moderation-content">
            {activeTab === 'users' && (
              <div className="moderation-users">
                <div className="users-list">
                  {roomMembers.map(user => (
                    <div key={user.id} className="user-item">
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.username} />
                          ) : (
                            <div className="avatar-placeholder">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className={`user-status ${user.isOnline ? 'online' : 'offline'}`} />
                        </div>
                        <div className="user-details">
                          <span className="username">{user.username}</span>
                          <span 
                            className="user-role" 
                            style={{ color: getRoleColor(user.role) }}
                          >
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <div className="user-actions">
                        {isAdmin && user.id !== currentUser.id && (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as User['role'])}
                            className="role-select"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                        {user.id !== currentUser.id && (
                          <button
                            className="moderate-user-btn"
                            onClick={() => setSelectedUser(user)}
                          >
                            Moderate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="moderation-reports">
                {reportedMessages.length === 0 ? (
                  <div className="no-reports">
                    <p>No reported messages</p>
                  </div>
                ) : (
                  <div className="reports-list">
                    {reportedMessages.map(message => (
                      <div key={message.id} className="report-item">
                        <div className="report-header">
                          <span className="reporter-username">{message.username}</span>
                          <span className="report-count">{message.reportCount} reports</span>
                          <span className="report-time">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="report-content">{message.content}</div>
                        <div className="report-actions">
                          <button
                            className="delete-message-btn"
                            onClick={() => onMessageDelete(message.id)}
                          >
                            Delete Message
                          </button>
                          <button className="dismiss-report-btn">
                            Dismiss Report
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="moderation-history">
                {moderationHistory.length === 0 ? (
                  <div className="no-history">
                    <p>No moderation actions yet</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {moderationHistory.map(action => (
                      <div key={action.id} className="history-item">
                        <div className="action-header">
                          <span className={`action-type ${action.type}`}>
                            {action.type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="action-time">
                            {action.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <div className="action-details">
                          <span className="moderator">{action.moderatorUsername}</span>
                          <span className="action-arrow">→</span>
                          <span className="target">{action.targetUsername}</span>
                          {action.duration && (
                            <span className="duration">({formatDuration(action.duration)})</span>
                          )}
                        </div>
                        <div className="action-reason">{action.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="moderation-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h4>Moderate {selectedUser.username}</h4>
              <button
                className="modal-close"
                onClick={() => setSelectedUser(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="action-select">
                <label>Action:</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ModerationAction['type'])}
                >
                  <option value="warn">Warn</option>
                  <option value="mute">Mute</option>
                  <option value="kick">Kick</option>
                  <option value="ban">Ban</option>
                </select>
              </div>
              {['mute', 'ban'].includes(actionType) && (
                <div className="duration-select">
                  <label>Duration (minutes):</label>
                  <input
                    type="number"
                    value={actionDuration}
                    onChange={(e) => setActionDuration(parseInt(e.target.value))}
                    min="1"
                    max="43200"
                  />
                </div>
              )}
              <div className="reason-input">
                <label>Reason:</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason for this action..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setSelectedUser(null)}
              >
                Cancel
              </button>
              <button
                className="confirm-btn"
                onClick={handleUserAction}
                disabled={!actionReason.trim()}
              >
                Confirm {actionType}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModerationSystem;