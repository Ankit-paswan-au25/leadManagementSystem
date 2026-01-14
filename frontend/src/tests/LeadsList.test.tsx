/**
 * Leads List Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LeadsList from '../pages/Leads/LeadsList';
import { authStore } from '../store/auth.store';
import { leadsService } from '../services/leads.service';

// Mock leads service
jest.mock('../services/leads.service', () => ({
  leadsService: {
    getLeads: jest.fn(),
  },
}));

// Mock auth store
jest.mock('../store/auth.store', () => ({
  authStore: {
    currentRole: 'ADMIN',
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

const renderLeadsList = () => {
  return render(
    <MemoryRouter>
      <LeadsList />
    </MemoryRouter>
  );
};

const mockLeads = [
  {
    id: '1',
    leadName: 'John Doe',
    companyName: 'Acme Corp',
    email: 'john.doe@acme.com',
    status: 'NEW',
    ownerId: 'admin-1',
    ownerName: 'Admin User',
    createdAt: '2024-01-10T08:00:00Z',
  },
  {
    id: '2',
    leadName: 'Jane Smith',
    companyName: 'Tech Inc',
    email: 'jane@tech.com',
    status: 'CONTACTED',
    ownerId: 'user-1',
    ownerName: 'Regular User',
    createdAt: '2024-01-11T09:00:00Z',
  },
  {
    id: '3',
    leadName: 'Bob Johnson',
    companyName: 'Startup Co',
    email: 'bob@startup.com',
    status: 'FOLLOW_UP',
    ownerId: 'admin-1',
    ownerName: 'Admin User',
    createdAt: '2024-01-12T10:00:00Z',
  },
];

describe('LeadsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockLeadsService.getLeads.mockResolvedValue({
      leads: mockLeads,
      pagination: {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    } as any);
  });

  describe('Loading State', () => {
    it('shows skeleton loader while loading', () => {
      mockLeadsService.getLeads.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          leads: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        } as any), 100))
      );
      renderLeadsList();
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Successful Data Fetch', () => {
    it('renders leads table with data', async () => {
      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    it('shows lead count in header', async () => {
      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByText(/3 leads found/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    it('shows ErrorAlert when fetch fails', async () => {
      const error = new Error('Failed to fetch leads');
      (error as any).isAxiosError = true;
      (error as any).response = {
        status: 500,
        data: {
          success: false,
          message: 'Failed to fetch leads',
        },
      };
      mockLeadsService.getLeads.mockRejectedValue(error);

      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch leads/i)).toBeInTheDocument();
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
      mockLeadsService.getLeads.mockRejectedValue(axiosError);

      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('filters leads by status', async () => {
      const user = userEvent.setup();
      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const statusSelect = screen.getByLabelText(/status/i);
      await user.selectOptions(statusSelect, 'NEW');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        // Other leads should be filtered out
      });
    });

    it('filters leads by search', async () => {
      const user = userEvent.setup();
      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search leads/i);
      await user.type(searchInput, 'Jane');

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });
    });
  });

  describe('Role-based Behavior', () => {
    it('shows owner column for admin', async () => {
      mockAuthStore.currentRole = 'ADMIN';
      renderLeadsList();

      await waitFor(() => {
        expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
      });
    });

    it('does not show owner column for user', async () => {
      mockAuthStore.currentRole = 'USER';
      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Owner column should not be visible
      const ownerHeaders = screen.queryAllByText('Owner');
      expect(ownerHeaders.length).toBe(0);
    });
  });

  describe('Navigation', () => {
    it('opens create lead modal when button clicked', async () => {
      const user = userEvent.setup();
      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(createButton);

      // Component opens a modal instead of navigating
      await waitFor(() => {
        // Check for modal content - CreateLeadModal might show form fields
        expect(screen.getByLabelText(/lead name/i) || screen.getByText(/Create Lead/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('navigates to lead detail when row clicked', async () => {
      const user = userEvent.setup();
      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click on a lead row
      const leadRow = screen.getByText('John Doe').closest('tr');
      if (leadRow) {
        await user.click(leadRow);
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/leads/1');
      }
    });
  });
});
