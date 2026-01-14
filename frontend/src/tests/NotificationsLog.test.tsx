/**
 * Notifications Log Tests
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NotificationsLog from '../pages/Notifications/NotificationsLog';
import { notificationService } from '../services/notification.service';
import { server } from './setup';
import { http, HttpResponse } from 'msw';

// Mock notification service
jest.mock('../services/notification.service', () => ({
  notificationService: {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

const mockNotifications = [
  {
    id: 'notif-1',
    type: 'EMAIL_SENT' as const,
    title: 'Email Sent',
    description: 'Follow-up email sent to John Doe',
    entityType: 'LEAD' as const,
    entityId: '1',
    createdAt: '2024-01-15T10:00:00Z',
    read: false,
    category: 'EMAIL' as const,
  },
  {
    id: 'notif-2',
    type: 'FOLLOWUP_TRIGGERED' as const,
    title: 'Follow-up Scheduled',
    description: 'Next follow-up scheduled for Jane Smith',
    entityType: 'LEAD' as const,
    entityId: '2',
    createdAt: '2024-01-15T09:30:00Z',
    read: false,
    category: 'FOLLOW_UP' as const,
  },
  {
    id: 'notif-3',
    type: 'CLIENT_REPLIED' as const,
    title: 'Client Replied',
    description: 'Bob Johnson replied to your email',
    entityType: 'LEAD' as const,
    entityId: '3',
    createdAt: '2024-01-15T08:00:00Z',
    read: true,
    category: 'EMAIL' as const,
  },
];

const renderNotificationsLog = () => {
  return render(
    <MemoryRouter>
      <NotificationsLog />
    </MemoryRouter>
  );
};

describe('NotificationsLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Loading State', () => {
    it('shows skeleton while loading', () => {
      mockNotificationService.getNotifications.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      renderNotificationsLog();

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Successful Data Fetch', () => {
    it('renders notifications from API', async () => {
      mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);

      renderNotificationsLog();

      await waitFor(() => {
        expect(screen.getByText('Email Sent')).toBeInTheDocument();
        expect(screen.getByText('Follow-up Scheduled')).toBeInTheDocument();
        expect(screen.getByText('Client Replied')).toBeInTheDocument();
      });
    });

    it('displays unread count', async () => {
      mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);

      renderNotificationsLog();

      await waitFor(() => {
        expect(screen.getByText(/2 unread notifications/i)).toBeInTheDocument();
      });
    });

    it('shows "All caught up!" when no unread notifications', async () => {
      const allReadNotifications = mockNotifications.map((n) => ({ ...n, read: true }));
      mockNotificationService.getNotifications.mockResolvedValue(allReadNotifications);

      renderNotificationsLog();

      await waitFor(() => {
        expect(screen.getByText(/All caught up!/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no notifications', async () => {
      mockNotificationService.getNotifications.mockResolvedValue([]);

      renderNotificationsLog();

      await waitFor(() => {
        expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows ErrorAlert on fetch failure', async () => {
      const errorMessage = 'Failed to load notifications';
      mockNotificationService.getNotifications.mockRejectedValue(new Error(errorMessage));

      renderNotificationsLog();

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockNotificationService.getNotifications.mockRejectedValue(new Error('Failed to load'));

      renderNotificationsLog();

      await waitFor(() => {
        expect(screen.getByText(/Retry/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('filters notifications by category', async () => {
      mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);

      renderNotificationsLog();

      await waitFor(() => {
        expect(screen.getByText('Email Sent')).toBeInTheDocument();
      });

      const emailFilter = screen.getByText('Email');
      await userEvent.click(emailFilter);

      await waitFor(() => {
        expect(screen.getByText('Email Sent')).toBeInTheDocument();
        expect(screen.queryByText('Follow-up Scheduled')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mark as Read', () => {
    it('marks notification as read when clicked', async () => {
      mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);
      mockNotificationService.markAsRead.mockResolvedValue();

      renderNotificationsLog();

      await waitFor(() => {
        expect(screen.getByText('Email Sent')).toBeInTheDocument();
      });

      // Find and click the notification (it should trigger mark as read)
      const notificationItem = screen.getByText('Email Sent').closest('.cursor-pointer');
      if (notificationItem) {
        await userEvent.click(notificationItem);
      }

      await waitFor(() => {
        expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notif-1');
      });
    });
  });

  describe('Mark All as Read', () => {
    it('marks all notifications as read', async () => {
      mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);
      mockNotificationService.markAsRead.mockResolvedValue();

      renderNotificationsLog();

      await waitFor(() => {
        expect(screen.getByText('Mark All as Read')).toBeInTheDocument();
      });

      const markAllButton = screen.getByText('Mark All as Read');
      
      await act(async () => {
        await userEvent.click(markAllButton);
      });

      // Wait for service calls to complete
      await waitFor(() => {
        // Should be called for each unread notification (2 unread: notif-1 and notif-2)
        expect(mockNotificationService.markAsRead).toHaveBeenCalledTimes(2);
      });

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notif-1');
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notif-2');
    });
  });

  describe('Navigation', () => {
    it('navigates to lead detail when notification clicked', async () => {
      mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);
      mockNotificationService.markAsRead.mockResolvedValue();

      renderNotificationsLog();

      await waitFor(() => {
        expect(screen.getByText('Email Sent')).toBeInTheDocument();
      });

      const notificationItem = screen.getByText('Email Sent').closest('.cursor-pointer');
      if (notificationItem) {
        await userEvent.click(notificationItem);
      }

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/leads/1');
      });
    });
  });

  describe('Polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('polls for notifications every 30 seconds', async () => {
      mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);

      renderNotificationsLog();

      await waitFor(() => {
        expect(mockNotificationService.getNotifications).toHaveBeenCalledTimes(1);
      });

      // Fast-forward time by 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockNotificationService.getNotifications).toHaveBeenCalledTimes(2);
      });
    });

    it('clears polling interval on unmount', async () => {
      mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);

      const { unmount } = renderNotificationsLog();

      await waitFor(() => {
        expect(mockNotificationService.getNotifications).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Fast-forward time - should not trigger another call
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should still be called only once (initial load)
      expect(mockNotificationService.getNotifications).toHaveBeenCalledTimes(1);
    });
  });
});
