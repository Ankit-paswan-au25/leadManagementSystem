import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notification.service';
import type { Notification, NotificationCategory } from '../../types/notification.types';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import ErrorAlert from '../../components/alerts/ErrorAlert';
import NotificationItem from '../../components/Notifications/NotificationItem';

const POLL_INTERVAL = 30000; // 30 seconds

const NotificationsLog: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'ALL'>('ALL');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadNotifications();

    // Set up polling
    pollIntervalRef.current = setInterval(() => {
      loadNotifications();
    }, POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Filter notifications when category or notifications change
  useEffect(() => {
    if (selectedCategory === 'ALL') {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(notifications.filter((n) => n.category === selectedCategory));
    }
  }, [selectedCategory, notifications]);

  const loadNotifications = async () => {
    setIsLoading(true);
    setError(null);

    notificationService
      .getNotifications()
      .then((data) => {
        setNotifications(data);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load notifications';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    notificationService.markAsRead(id).catch((err) => {
      // Silent retry on failure - revert optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
      // Could add a retry mechanism here if needed
    });
  };

  const handleMarkAllAsRead = async () => {
    // Mark all unread notifications as read optimistically
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );

    try {
      // Mark each as read in parallel
      await Promise.all(unreadIds.map((id) => notificationService.markAsRead(id)));
    } catch {
      // On failure, revert optimistic update
      setNotifications((prev) =>
        prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read: false } : n))
      );
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate to related entity if available
    if (notification.entityType === 'LEAD' && notification.entityId) {
      navigate(`/dashboard/leads/${notification.entityId}`);
    } else if (notification.entityType === 'CUSTOMER' && notification.entityId) {
      navigate(`/dashboard/customers/${notification.entityId}`);
    }
  };

  const categories: Array<{ value: NotificationCategory | 'ALL'; label: string }> = [
    { value: 'ALL', label: 'All' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'FOLLOW_UP', label: 'Follow-up' },
    { value: 'OWNERSHIP', label: 'Ownership' },
    { value: 'SYSTEM', label: 'System' },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading && notifications.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <div className="space-y-6">
        <ErrorAlert message={error} onClose={() => setError(null)} />
        <Card>
          <button
            onClick={loadNotifications}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Notifications</h1>
          <p className="text-text-secondary mt-1">
            {unreadCount > 0 ? (
              <span>
                {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
              </span>
            ) : (
              <span>All caught up!</span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {/* Error Alert (if error occurs after initial load) */}
      {error && notifications.length > 0 && (
        <ErrorAlert message={error} onClose={() => setError(null)} />
      )}

      {/* Filters */}
      <Card>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications List */}
      <Card>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">
              {selectedCategory === 'ALL'
                ? 'No notifications yet'
                : `No ${categories.find((c) => c.value === selectedCategory)?.label.toLowerCase()} notifications`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="cursor-pointer"
              >
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationsLog;
