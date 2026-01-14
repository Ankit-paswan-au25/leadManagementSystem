export type NotificationType =
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'CLIENT_REPLIED'
  | 'FOLLOWUP_TRIGGERED'
  | 'OWNER_CHANGED'
  | 'SCHEDULE_PAUSED'
  | 'LEAD_CREATED'
  | 'PRODUCT_EXPIRING';

export type NotificationCategory = 'ALL' | 'EMAIL' | 'FOLLOW_UP' | 'OWNERSHIP' | 'SYSTEM';

/**
 * Notification interface matching backend API
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  entityType: 'LEAD' | 'CUSTOMER' | null;
  entityId: string | null;
  createdAt: string;
  read: boolean;
  category?: NotificationCategory; // Derived from type, optional for backward compatibility
  // User info (only present for admins when viewing all notifications)
  user?: {
    id: string;
    name: string;
    email: string;
  };
}
