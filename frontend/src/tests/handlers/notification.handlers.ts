/**
 * MSW Handlers for Notifications API
 */

import { http, HttpResponse, delay } from 'msw';
import type { Notification } from '../../types/notification.types';

const API_BASE_URL = 'http://localhost:3000/api';

// Mock notifications data (matching backend API structure)
let mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'EMAIL_SENT',
    title: 'Email Sent',
    description: 'Follow-up email sent to John Doe',
    entityType: 'LEAD',
    entityId: '1',
    createdAt: '2024-01-15T10:00:00Z',
    read: false,
  },
  {
    id: 'notif-2',
    type: 'FOLLOWUP_TRIGGERED',
    title: 'Follow-up Scheduled',
    description: 'Next follow-up scheduled for Jane Smith',
    entityType: 'LEAD',
    entityId: '2',
    createdAt: '2024-01-15T09:30:00Z',
    read: false,
  },
  {
    id: 'notif-3',
    type: 'CLIENT_REPLIED',
    title: 'Client Replied',
    description: 'Bob Johnson replied to your email',
    entityType: 'LEAD',
    entityId: '3',
    createdAt: '2024-01-15T08:00:00Z',
    read: true,
  },
  {
    id: 'notif-4',
    type: 'EMAIL_FAILED',
    title: 'Email Failed',
    description: 'Failed to send email to John Doe',
    entityType: 'LEAD',
    entityId: '1',
    createdAt: '2024-01-14T15:00:00Z',
    read: false,
  },
  {
    id: 'notif-5',
    type: 'OWNER_CHANGED',
    title: 'Owner Changed',
    description: 'Lead ownership changed for Jane Smith',
    entityType: 'LEAD',
    entityId: '2',
    createdAt: '2024-01-14T12:00:00Z',
    read: true,
  },
];

export const notificationHandlers = [
  // GET /notifications
  http.get(`${API_BASE_URL}/notifications`, async () => {
    await delay(100);

    return HttpResponse.json({
      success: true,
      data: [...mockNotifications],
    });
  }),

  // POST /notifications/:id/read
  http.post(`${API_BASE_URL}/notifications/:id/read`, async ({ params }) => {
    await delay(100);
    const { id } = params;

    // Mark notification as read
    mockNotifications = mockNotifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );

    return HttpResponse.json({
      success: true,
    });
  }),
];
