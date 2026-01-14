import { get, post } from './httpClient';
import type { Notification, NotificationCategory } from '../types/notification.types';

/**
 * Notification Service
 * Handles API calls for notifications/events
 */
export const notificationService = {
  /**
   * Get all notifications
   * @returns Array of notifications
   */
  async getNotifications(): Promise<Notification[]> {
    const response = await get<any>('/notifications');

    const backendResponse = response as any;
    const isSuccess = backendResponse.status === 'success' || response.success === true;

    if (!isSuccess) {
      throw new Error(response.message || backendResponse.message || 'Failed to fetch notifications');
    }

    const data = backendResponse.data || response.data;

    // Handle backend format: { status: 'success', data: { notifications: [...], count: ... } }
    let notifications: Notification[] = [];
    if (data && typeof data === 'object' && 'notifications' in data && Array.isArray(data.notifications)) {
      notifications = data.notifications;
    } else if (Array.isArray(data)) {
      notifications = data;
    } else {
      console.error('Invalid response format - Full response:', JSON.stringify(response, null, 2));
      throw new Error(`Invalid response format from server. Expected notifications array but got: ${JSON.stringify(response).substring(0, 200)}`);
    }

    // Map backend data and derive category from type
    const mappedNotifications = notifications.map((n) => ({
      ...n,
      category: deriveCategory(n.type),
    }));

    // Sort by createdAt descending (newest first)
    return mappedNotifications.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  },

  /**
   * Mark a notification as read
   * @param id Notification ID
   */
  async markAsRead(id: string): Promise<void> {
    const response = await post<void>(`/notifications/${id}/read`, {});

    if (!response.success) {
      throw new Error(response.message || 'Failed to mark notification as read');
    }
  },
};

/**
 * Derive category from notification type
 */
function deriveCategory(type: Notification['type']): NotificationCategory {
  switch (type) {
    case 'EMAIL_SENT':
    case 'EMAIL_FAILED':
    case 'CLIENT_REPLIED':
      return 'EMAIL';
    case 'FOLLOWUP_TRIGGERED':
    case 'SCHEDULE_PAUSED':
      return 'FOLLOW_UP';
    case 'OWNER_CHANGED':
    case 'LEAD_CREATED':
      return 'OWNERSHIP';
    default:
      return 'SYSTEM';
  }
}
