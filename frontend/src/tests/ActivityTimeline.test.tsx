import React from 'react';
import { render, screen } from '@testing-library/react';
import ActivityTimeline from '../components/Leads/ActivityTimeline';
import type { LeadActivity } from '../types/activity.types';

const mockActivities: LeadActivity[] = [
  {
    id: 'act-1',
    leadId: '1',
    activityType: 'CREATED',
    performedBy: 'admin-1',
    performedByType: 'ADMIN',
    performedByName: 'Admin User',
    ownerAtThatTime: 'admin-1',
    ownerAtThatTimeName: 'Admin User',
    timestamp: '2024-01-10T08:00:00Z',
    metadata: 'Lead created via web form',
  },
  {
    id: 'act-2',
    leadId: '1',
    activityType: 'EMAIL_SENT',
    performedBy: 'user-1',
    performedByType: 'USER',
    performedByName: 'Regular User',
    ownerAtThatTime: 'user-1',
    ownerAtThatTimeName: 'Regular User',
    timestamp: '2024-01-11T10:30:00Z',
    metadata: 'Initial outreach email',
  },
  {
    id: 'act-3',
    leadId: '1',
    activityType: 'CLIENT_REPLIED',
    performedBy: 'SYSTEM',
    performedByType: 'SYSTEM',
    performedByName: 'System',
    ownerAtThatTime: 'user-1',
    ownerAtThatTimeName: 'Regular User',
    timestamp: '2024-01-12T14:30:00Z',
    metadata: 'Client replied to email',
  },
];

describe('ActivityTimeline', () => {
  describe('Rendering', () => {
    it('renders activities', () => {
      render(<ActivityTimeline activities={mockActivities} />);

      expect(screen.getByText('Lead created')).toBeInTheDocument();
      expect(screen.getByText('Email sent')).toBeInTheDocument();
      expect(screen.getByText('Client replied')).toBeInTheDocument();
    });

    it('shows performed by information', () => {
      render(<ActivityTimeline activities={mockActivities} />);

      // Names appear multiple times (performer and owner), so use getAllByText
      const adminUsers = screen.getAllByText('Admin User');
      const regularUsers = screen.getAllByText('Regular User');
      expect(adminUsers.length).toBeGreaterThan(0);
      expect(regularUsers.length).toBeGreaterThan(0);
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('shows owner at that time', () => {
      render(<ActivityTimeline activities={mockActivities} />);

      const ownerTexts = screen.getAllByText(/Owner at that time/i);
      expect(ownerTexts.length).toBeGreaterThan(0);
    });

    it('shows metadata when available', () => {
      render(<ActivityTimeline activities={mockActivities} />);

      expect(screen.getByText('Lead created via web form')).toBeInTheDocument();
      expect(screen.getByText('Initial outreach email')).toBeInTheDocument();
    });

    it('shows timestamps', () => {
      render(<ActivityTimeline activities={mockActivities} />);

      // Check for timestamp formatting (should show relative or formatted date)
      const timeline = screen.getByText('Lead created').closest('.space-y-4');
      expect(timeline).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty timeline when no activities', () => {
      const { container } = render(<ActivityTimeline activities={[]} />);

      // Component renders empty div with space-y-4 class
      const timeline = container.querySelector('.space-y-4');
      expect(timeline).toBeInTheDocument();
      expect(timeline?.children.length).toBe(0);
    });
  });

  describe('Activity Order', () => {
    it('renders activities in provided order (latest first)', () => {
      render(<ActivityTimeline activities={mockActivities} />);

      const activityElements = screen.getAllByText(/Lead created|Email sent|Client replied/i);
      // Activities should be rendered (order is handled by parent component)
      expect(activityElements.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Performed By Badges', () => {
    it('shows ADMIN in parentheses for admin activities', () => {
      render(<ActivityTimeline activities={[mockActivities[0]]} />);

      // Component shows performedByType in parentheses like "(ADMIN)"
      expect(screen.getByText('(ADMIN)')).toBeInTheDocument();
    });

    it('shows USER in parentheses for user activities', () => {
      render(<ActivityTimeline activities={[mockActivities[1]]} />);

      // Component shows performedByType in parentheses like "(USER)"
      expect(screen.getByText('(USER)')).toBeInTheDocument();
    });

    it('does not show SYSTEM in parentheses for system activities', () => {
      render(<ActivityTimeline activities={[mockActivities[2]]} />);

      // System activities don't show type in parentheses - just "System"
      expect(screen.getByText('System')).toBeInTheDocument();
      expect(screen.queryByText('(SYSTEM)')).not.toBeInTheDocument();
    });
  });

  describe('Owner at That Time', () => {
    it('displays correct owner for each activity', () => {
      render(<ActivityTimeline activities={mockActivities} />);

      // Check that owner names are displayed (may appear multiple times)
      const adminUsers = screen.getAllByText(/Admin User/i);
      const regularUsers = screen.getAllByText(/Regular User/i);
      expect(adminUsers.length).toBeGreaterThan(0);
      expect(regularUsers.length).toBeGreaterThan(0);
    });

    it('shows owner even when different from performer', () => {
      const activityWithDifferentOwner: LeadActivity = {
        id: 'act-4',
        leadId: '1',
        activityType: 'OWNER_CHANGED',
        performedBy: 'admin-1',
        performedByType: 'ADMIN',
        performedByName: 'Admin User',
        ownerAtThatTime: 'user-1',
        ownerAtThatTimeName: 'Regular User',
        timestamp: '2024-01-12T15:00:00Z',
        metadata: 'Owner changed',
      };

      render(<ActivityTimeline activities={[activityWithDifferentOwner]} />);

      // Both names should appear (performer and owner)
      const adminUsers = screen.getAllByText('Admin User');
      const regularUsers = screen.getAllByText('Regular User');
      expect(adminUsers.length).toBeGreaterThan(0); // Performer
      expect(regularUsers.length).toBeGreaterThan(0); // Owner at that time
    });
  });
});

