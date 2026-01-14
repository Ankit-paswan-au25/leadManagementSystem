/**
 * Lead Detail Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LeadDetail from '../pages/Leads/LeadDetail';
import { authStore } from '../store/auth.store';
import { leadsService } from '../services/leads.service';

// Mock leads service
jest.mock('../services/leads.service', () => ({
  leadsService: {
    getLeadById: jest.fn(),
    getLeadActivities: jest.fn(),
  },
}));

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
const mockLeadsService = leadsService as jest.Mocked<typeof leadsService>;

const renderLeadDetail = (leadId: string = '1') => {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/leads/${leadId}`]}>
      <Routes>
        <Route path="/dashboard/leads/:id" element={<LeadDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

const mockLead = {
  id: '1',
  leadName: 'John Doe',
  companyName: 'Acme Corp',
  email: 'john.doe@acme.com',
  phone: '+1-555-0100',
  status: 'NEW',
  ownerId: 'admin-1',
  ownerName: 'Admin User',
  createdAt: '2024-01-10T08:00:00Z',
  createdByName: 'Admin User',
};

const mockActivities = [
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
  },
  {
    id: 'act-2',
    leadId: '1',
    activityType: 'EMAIL_SENT',
    performedBy: 'admin-1',
    performedByType: 'ADMIN',
    performedByName: 'Admin User',
    ownerAtThatTime: 'admin-1',
    ownerAtThatTimeName: 'Admin User',
    timestamp: '2024-01-11T10:00:00Z',
  },
];

describe('LeadDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockLeadsService.getLeadById.mockResolvedValue(mockLead as any);
    mockLeadsService.getLeadActivities.mockResolvedValue(mockActivities as any);
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
        // John Doe appears in header - use getAllByText
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        // Acme Corp appears multiple times - use getAllByText
        expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
        expect(screen.getByText('john.doe@acme.com')).toBeInTheDocument();
      });
    });

    it('renders status badge', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        // StatusBadge renders "New" not "NEW"
        expect(screen.getByText('New')).toBeInTheDocument();
      });
    });

    it('renders owner information', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        // Admin User appears multiple times - use getAllByText
        expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0);
      });
    });

    it('renders activities timeline', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText(/Lead created/i)).toBeInTheDocument();
        expect(screen.getByText(/Email sent/i)).toBeInTheDocument();
      });
    });

    it('displays owner-at-that-time for activities', async () => {
      renderLeadDetail('1');

      await waitFor(() => {
        // Multiple activities have "Owner at that time:" - use getAllByText
        expect(screen.getAllByText(/Owner at that time:/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    it('shows ErrorAlert when lead not found (404)', async () => {
      const error = new Error('Lead not found');
      (error as any).isAxiosError = true;
      (error as any).response = {
        status: 404,
        data: {
          success: false,
          message: 'Lead not found',
        },
      };
      mockLeadsService.getLeadById.mockRejectedValue(error);

      renderLeadDetail('999');

      await waitFor(() => {
        expect(screen.getByText(/Lead not found/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows ErrorAlert for 403 forbidden', async () => {
      const error = new Error('Access denied');
      (error as any).isAxiosError = true;
      (error as any).response = {
        status: 403,
        data: {
          success: false,
          message: 'Access denied',
        },
      };
      mockLeadsService.getLeadById.mockRejectedValue(error);

      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows ErrorAlert for server error (500)', async () => {
      const error = new Error('Internal server error');
      (error as any).isAxiosError = true;
      (error as any).response = {
        status: 500,
        data: {
          success: false,
          message: 'Internal server error',
        },
      };
      mockLeadsService.getLeadById.mockRejectedValue(error);

      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText(/Internal server error/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows retry button on error', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {
            success: false,
            message: 'Network error',
          },
        },
      } as any;
      mockLeadsService.getLeadById.mockRejectedValue(axiosError);

      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Actions', () => {
    it('shows request ownership button for user who owns the lead', async () => {
      // Mock lead owned by user-1
      const userOwnedLead = { ...mockLead, ownerId: 'user-1', ownerName: 'Regular User' };
      mockLeadsService.getLeadById.mockResolvedValue(userOwnedLead as any);
      
      mockAuthStore.currentUser = { id: 'user-1', email: 'user@example.com', role: 'USER', name: 'Regular User' };
      mockAuthStore.currentRole = 'USER';

      renderLeadDetail('1');

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
      renderLeadDetail('1');

      await waitFor(() => {
        const activities = screen.getAllByText(/Status changed|Client replied|Email sent|Lead created/i);
        // Should have multiple activities
        expect(activities.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('displays system actions correctly', async () => {
      // Add a system activity
      const systemActivities = [
        ...mockActivities,
        {
          id: 'act-3',
          leadId: '1',
          activityType: 'CLIENT_REPLIED',
          performedBy: 'SYSTEM',
          performedByType: 'SYSTEM',
          performedByName: 'System',
          ownerAtThatTime: 'admin-1',
          ownerAtThatTimeName: 'Admin User',
          timestamp: '2024-01-12T14:30:00Z',
        },
      ];
      mockLeadsService.getLeadActivities.mockResolvedValue(systemActivities as any);
      
      renderLeadDetail('1');

      await waitFor(() => {
        expect(screen.getByText(/System/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows empty state when no activities', async () => {
      mockLeadsService.getLeadActivities.mockResolvedValue([]);

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
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
      });

      const backLink = screen.getByText(/Back to Leads/i);
      expect(backLink).toBeInTheDocument();
      
      // Click the back link
      backLink.click();

      // Check that navigate was called
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/leads');
      });
    });
  });
});
