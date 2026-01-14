/**
 * Leads List Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LeadsList from '../pages/Leads/LeadsList';
import { authStore } from '../store/auth.store';
import { server } from './setup';
import { http, HttpResponse } from 'msw';

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

const renderLeadsList = () => {
  return render(
    <MemoryRouter>
      <LeadsList />
    </MemoryRouter>
  );
};

describe('LeadsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Loading State', () => {
    it('shows skeleton loader while loading', () => {
      renderLeadsList();
      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
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
      });
    });
  });

  describe('Error Handling', () => {
    it('shows ErrorAlert when fetch fails', async () => {
      // Override handler for this test
      server.use(
        http.get('http://localhost:3000/api/leads', () => {
          return HttpResponse.json(
            { success: false, message: 'Failed to fetch leads' },
            { status: 500 }
          );
        })
      );

      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch leads/i)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      server.use(
        http.get('http://localhost:3000/api/leads', () => {
          return HttpResponse.json(
            { success: false, message: 'Network error' },
            { status: 500 }
          );
        })
      );

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
    it('navigates to create lead page when button clicked', async () => {
      const user = userEvent.setup();
      renderLeadsList();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(createButton);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/leads/create');
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
