import React from 'react';
import { authStore } from '../../store/auth.store';
import type { Notification } from '../../types/notification.types';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead }) => {
  const isAdmin = authStore.currentRole === 'ADMIN';

  const getIcon = (type: string): string => {
    const icons: Record<string, string> = {
      EMAIL_SENT: '📧',
      EMAIL_FAILED: '❌',
      CLIENT_REPLIED: '💬',
      FOLLOWUP_TRIGGERED: '📅',
      OWNER_CHANGED: '👤',
      SCHEDULE_PAUSED: '⏸️',
      LEAD_CREATED: '✨',
      PRODUCT_EXPIRING: '⏰',
    };
    return icons[type] || '🔔';
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <div
      className={`p-4 border-b border-border-default hover:bg-background-secondary transition-colors ${!notification.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
        }`}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-background-tertiary flex items-center justify-center text-xl">
            {getIcon(notification.type)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className={`text-sm font-medium ${!notification.read ? 'text-text-primary font-semibold' : 'text-text-secondary'
                    }`}
                >
                  {notification.title}
                </h3>
                {!notification.read && (
                  <span className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0"></span>
                )}
              </div>
              <p className="text-sm text-text-secondary mb-2">{notification.description}</p>
              {/* Show user info for admins */}
              {isAdmin && notification.user && (
                <p className="text-xs text-text-tertiary mt-1">
                  User: <span className="font-medium">{notification.user.name}</span> ({notification.user.email})
                </p>
              )}
            </div>
            <div className="text-xs text-text-tertiary whitespace-nowrap">
              {formatTimestamp(notification.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
