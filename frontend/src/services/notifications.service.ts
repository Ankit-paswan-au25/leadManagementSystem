import type { Notification, NotificationType, NotificationCategory } from '../types/notification.types';

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'EMAIL_SENT',
    title: 'Email Sent',
    description: 'Initial outreach email sent to John Doe',
    timestamp: '2024-01-15T10:30:00Z',
    isRead: false,
    relatedEntityType: 'LEAD',
    relatedEntityId: '1',
    relatedEntityName: 'John Doe',
  },
  {
    id: 'notif-2',
    type: 'CLIENT_REPLIED',
    title: 'Client Replied',
    description: 'Jane Smith replied to your email',
    timestamp: '2024-01-14T14:20:00Z',
    isRead: false,
    relatedEntityType: 'LEAD',
    relatedEntityId: '2',
    relatedEntityName: 'Jane Smith',
  },
  {
    id: 'notif-3',
    type: 'OWNER_CHANGED',
    title: 'Owner Changed',
    description: 'Lead "Bob Johnson" ownership changed to Admin User',
    timestamp: '2024-01-13T09:15:00Z',
    isRead: true,
    relatedEntityType: 'LEAD',
    relatedEntityId: '3',
    relatedEntityName: 'Bob Johnson',
  },
  {
    id: 'notif-4',
    type: 'FOLLOW_UP_TRIGGERED',
    title: 'Follow-up Triggered',
    description: 'Follow-up scheduled for Alice Williams',
    timestamp: '2024-01-12T11:00:00Z',
    isRead: true,
    relatedEntityType: 'LEAD',
    relatedEntityId: '4',
    relatedEntityName: 'Alice Williams',
  },
  {
    id: 'notif-5',
    type: 'SCHEDULE_PAUSED',
    title: 'Schedule Paused',
    description: 'Email schedule paused for Charlie Brown',
    timestamp: '2024-01-11T16:45:00Z',
    isRead: false,
    relatedEntityType: 'LEAD',
    relatedEntityId: '5',
    relatedEntityName: 'Charlie Brown',
  },
  {
    id: 'notif-6',
    type: 'PRODUCT_EXPIRING',
    title: 'Product Expiring Soon',
    description: 'Premium Support for Tech Solutions Inc expires in 15 days',
    timestamp: '2024-01-10T08:30:00Z',
    isRead: true,
    relatedEntityType: 'CUSTOMER',
    relatedEntityId: '1',
    relatedEntityName: 'Tech Solutions Inc',
  },
  {
    id: 'notif-7',
    type: 'LEAD_CREATED',
    title: 'Lead Created',
    description: 'New lead "David Miller" created',
    timestamp: '2024-01-09T13:20:00Z',
    isRead: true,
    relatedEntityType: 'LEAD',
    relatedEntityId: '6',
    relatedEntityName: 'David Miller',
  },
];

/**
 * Mock notifications service
 * Simulates API calls for notifications
 */
class NotificationsService {
  private delay(ms: number = 500): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all notifications
   */
  async getNotifications(category?: NotificationCategory): Promise<Notification[]> {
    await this.delay(500);
    
    let filtered = [...mockNotifications];

    // Apply category filter
    if (category && category !== 'ALL') {
      const categoryMap: Record<NotificationCategory, NotificationType[]> = {
        ALL: [],
        EMAIL: ['EMAIL_SENT', 'CLIENT_REPLIED'],
        OWNERSHIP: ['OWNER_CHANGED', 'LEAD_CREATED'],
        SCHEDULING: ['FOLLOW_UP_TRIGGERED', 'SCHEDULE_PAUSED'],
      };

      const types = categoryMap[category] || [];
      if (types.length > 0) {
        filtered = filtered.filter((notif) => types.includes(notif.type));
      }
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.delay(200);
    const notification = mockNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
    }
  }

  /**
   * Mark notification as unread
   */
  async markAsUnread(notificationId: string): Promise<void> {
    await this.delay(200);
    const notification = mockNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.isRead = false;
    }
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(): Promise<void> {
    await this.delay(300);
    mockNotifications.forEach((notif) => {
      notif.isRead = true;
    });
  }
}

export const notificationsService = new NotificationsService();

