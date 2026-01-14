import type { ActivityType } from '../types/activity.types';

/**
 * Map activity types to human-readable labels
 */
export const getActivityLabel = (activityType: ActivityType): string => {
  const labels: Record<ActivityType, string> = {
    CREATED: 'Lead created',
    STATUS_CHANGED: 'Status changed',
    OWNER_CHANGED: 'Owner changed',
    OWNER_CHANGE_REQUESTED: 'Ownership change requested',
    OWNER_CHANGE_REJECTED: 'Ownership change rejected',
    CONTACTED: 'Contacted',
    EMAIL_SENT: 'Email sent',
    EMAIL_FAILED: 'Email failed',
    EMAIL_RECEIVED: 'Email received',
    CLIENT_REPLIED: 'Client replied',
    NOTE_ADDED: 'Note added',
    FOLLOW_UP_SCHEDULED: 'Follow-up scheduled',
    FOLLOW_UP_COMPLETED: 'Follow-up completed',
    FOLLOWUP_TRIGGERED: 'Follow-up triggered',
    SCHEDULE_PAUSED: 'Schedule paused',
    SCHEDULE_RESUMED: 'Schedule resumed',
    CUSTOMER_CREATED: 'Customer created',
    PRODUCT_ASSIGNED: 'Product assigned',
    PRODUCT_EXPIRED: 'Product expired',
  };

  return labels[activityType] || activityType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get activity icon (emoji for now)
 */
export const getActivityIcon = (activityType: ActivityType): string => {
  const icons: Record<ActivityType, string> = {
    CREATED: '✨',
    STATUS_CHANGED: '🔄',
    OWNER_CHANGED: '👤',
    OWNER_CHANGE_REQUESTED: '👤',
    OWNER_CHANGE_REJECTED: '❌',
    CONTACTED: '📞',
    EMAIL_SENT: '📧',
    EMAIL_FAILED: '❌',
    EMAIL_RECEIVED: '📨',
    CLIENT_REPLIED: '💬',
    NOTE_ADDED: '📝',
    FOLLOW_UP_SCHEDULED: '📅',
    FOLLOW_UP_COMPLETED: '✅',
    FOLLOWUP_TRIGGERED: '⏰',
    SCHEDULE_PAUSED: '⏸️',
    SCHEDULE_RESUMED: '▶️',
    CUSTOMER_CREATED: '👥',
    PRODUCT_ASSIGNED: '📦',
    PRODUCT_EXPIRED: '⏰',
  };

  return icons[activityType] || '•';
};

