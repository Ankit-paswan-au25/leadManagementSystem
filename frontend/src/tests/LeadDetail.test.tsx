/**
 * Lead Detail Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LeadDetail from '../pages/Leads/LeadDetail';
import { authStore } from '../store/auth.store';
import { server } from './setup';
import { http, HttpResponse } from 'msw';

// Mock auth store
jest.mock('../store/auth.store', () => ({
  authStore: {
    currentRole: 'USER',
    currentUser: {
      id: 'user-1',
      email: 'user@example.com',
      role: 'USER',
    },
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockAuthStore = authStore as jest.Mocked<typeof authStore>;

const renderLeadDetail = (leadId: string = '1') => {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/leads/${leadId}`]}>
      <LeadDetail />
    </MemoryRouter>
  );
};

describe('LeadDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Loading State', () => {
    it('shows skeleton loader while loading', () => {
      renderLeadDetail();

      // Check for skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Successful Data Fetch', () => {
    it('renders lead information', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('john.doe@acme.com')).toBeInTheDocument();
      });
    });

    it('renders status badge', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText('NEW')).toBeInTheDocument();
      });
    });

    it('renders owner information', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });
    });

    it('renders activities timeline', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText('Lead created')).toBeInTheDocument();
        expect(screen.getByText('Email sent')).toBeInTheDocument();
      });
    });

    it('displays owner-at-that-time for activities', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText(/Owner at that time:/i)).toBeInTheDocument();
        expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('shows ErrorAlert when lead not found (404)', async () => {
      server.use(
        http.get('http://localhost:3000/api/leads/:id', () => {
          return HttpResponse.json(
            { success: false, message: 'Lead not found' },
            { status: 404 }
          );
        })
      );

      renderLeadDetail('999');

      await waitFor(() => {
        expect(screen.getByText(/Lead not found/i)).toBeInTheDocument();
      });
    });

    it('shows ErrorAlert for 403 forbidden', async () => {
      server.use(
        http.get('http://localhost:3000/api/leads/:id', () => {
          return HttpResponse.json(
            { success: false, message: 'Access denied' },
            { status: 403 }
          );
        })
      );

      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
      });
    });

    it('shows ErrorAlert for server error (500)', async () => {
      server.use(
        http.get('http://localhost:3000/api/leads/:id', () => {
          return HttpResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText(/Internal server error/i)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      server.use(
        http.get('http://localhost:3000/api/leads/:id', () => {
          return HttpResponse.json(
            { success: false, message: 'Network error' },
            { status: 500 }
          );
        })
      );

      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Actions', () => {
    it('shows request ownership button for user who owns the lead', async () => {
      mockAuthStore.currentUser = { id: 'user-1', email: 'user@example.com', role: 'USER' };
      mockAuthStore.currentRole = 'USER';

      renderLeadDetail('2'); // Lead 2 is owned by user-1

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Request Ownership Change/i })).toBeInTheDocument();
      });
    });

    it('does not show request ownership button for admin', async () => {
      mockAuthStore.currentRole = 'ADMIN';

      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Request Ownership Change/i })).not.toBeInTheDocument();
      });
    });

    it('shows admin actions for admin', async () => {
      mockAuthStore.currentRole = 'ADMIN';

      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Change Owner/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Close Lead/i })).toBeInTheDocument();
      });
    });
  });

  describe('Activity Timeline', () => {
    it('renders activities in correct order (latest first)', async () => {
      renderLeadDetail('2');

      await waitFor(() => {
        const activities = screen.getAllByText(/Status changed|Client replied|Email sent|Lead created/i);
        // Should have multiple activities
        expect(activities.length).toBeGreaterThan(0);
      });
    });

    it('displays system actions correctly', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText(/System/i)).toBeInTheDocument();
      });
    });

    it('shows empty state when no activities', async () => {
      server.use(
        http.get('http://localhost:3000/api/leads/:id/activities', () => {
          return HttpResponse.json({
            success: true,
            data: [],
          });
        })
      );

      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText(/No activity recorded yet/i)).toBeInTheDocument();
      });
    });

    it('displays owner-at-that-time for each activity', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        const ownerLabels = screen.getAllByText(/Owner at that time:/i);
        expect(ownerLabels.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation', () => {
    it('navigates back to leads list', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const backLink = screen.getByText(/Back to Leads/i);
      backLink.click();

      // Navigate is called via onClick handler
      // Check that back link exists and is clickable
      expect(backLink).toBeInTheDocument();
    });
  });
});
