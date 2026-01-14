export type ActivityType =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'OWNER_CHANGED'
  | 'OWNER_CHANGE_REQUESTED'
  | 'OWNER_CHANGE_REJECTED'
  | 'CONTACTED'
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'EMAIL_RECEIVED'
  | 'CLIENT_REPLIED'
  | 'NOTE_ADDED'
  | 'FOLLOW_UP_SCHEDULED'
  | 'FOLLOW_UP_COMPLETED'
  | 'FOLLOWUP_TRIGGERED'
  | 'SCHEDULE_PAUSED'
  | 'SCHEDULE_RESUMED'
  | 'CUSTOMER_CREATED'
  | 'PRODUCT_ASSIGNED'
  | 'PRODUCT_EXPIRED';

export type PerformedByType = 'USER' | 'ADMIN' | 'SYSTEM';

export interface LeadActivity {
  id: string;
  leadId: string;
  activityType: ActivityType;
  performedBy: string; // User ID or 'SYSTEM'
  performedByType: PerformedByType;
  performedByName: string; // Display name
  ownerAtThatTime: string; // Owner ID at the time of activity
  ownerAtThatTimeName: string; // Owner name at that time
  timestamp: string;
  metadata?: Record<string, any> | string; // Optional additional info (can be object or string)
  description?: string | null; // Optional description
}

// Activity interface for Activity Logs page (from backend)
export interface Activity {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail?: string | null;
  activityType: ActivityType;
  performedBy: {
    id: string;
    name: string;
    email?: string | null;
  };
  ownerAtTime: {
    id: string;
    name: string;
    email?: string | null;
  };
  description?: string | null;
  metadata?: Record<string, any>;
  timestamp: string;
}

