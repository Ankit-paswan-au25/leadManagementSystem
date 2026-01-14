/**
 * Create Lead Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CreateLead from '../pages/Leads/CreateLead';
import { authStore } from '../store/auth.store';
import { leadsService } from '../services/leads.service';

// Mock leads service
jest.mock('../services/leads.service', () => ({
  leadsService: {
    createLead: jest.fn(),
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

const renderCreateLead = () => {
  return render(
    <MemoryRouter>
      <CreateLead />
    </MemoryRouter>
  );
};

describe('CreateLead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockLeadsService.createLead.mockResolvedValue({
      id: 'lead-1',
      leadName: 'Test Lead',
      email: 'test@example.com',
      status: 'NEW',
      ownerId: 'user-1',
      ownerName: 'Regular User',
      createdAt: '2024-01-14T10:00:00Z',
    } as any);
  });

  describe('Rendering', () => {
    it('renders create lead form', () => {
      renderCreateLead();

      expect(screen.getByRole('heading', { name: /create lead/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/lead name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/frequency type/i)).toBeInTheDocument();
    });

    it('shows owner dropdown for admin', () => {
      mockAuthStore.currentRole = 'ADMIN';
      renderCreateLead();

      expect(screen.getByLabelText(/owner/i)).toBeInTheDocument();
    });

    it('does not show owner dropdown for user', () => {
      mockAuthStore.currentRole = 'USER';
      renderCreateLead();

      expect(screen.queryByLabelText(/owner/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty lead name', async () => {
      const user = userEvent.setup();
      renderCreateLead();

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/lead name is required/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid email', async () => {
      const user = userEvent.setup();
      renderCreateLead();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Lead Creation', () => {
    it('creates lead and redirects on success', async () => {
      const user = userEvent.setup();
      renderCreateLead();

      // Fill form
      await user.type(screen.getByLabelText(/lead name/i), 'Test Lead');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');

      // Submit
      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Lead created successfully!/i)).toBeInTheDocument();
      });

      // Check redirect
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/dashboard/leads');
        },
        { timeout: 2000 }
      );
    });

    it('shows success alert on creation', async () => {
      const user = userEvent.setup();
      renderCreateLead();

      await user.type(screen.getByLabelText(/lead name/i), 'Test Lead');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Lead created successfully!/i)).toBeInTheDocument();
      });
    });
  });

  describe('Validation Error Handling', () => {
    it('shows inline validation errors for 422 response', async () => {
      const user = userEvent.setup();

      // Mock service to throw validation error
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            success: false,
            message: 'Validation failed',
            errors: {
              email: 'Invalid email format',
              leadName: 'Lead name is too short',
            },
          },
        },
      } as any;

      mockLeadsService.createLead.mockRejectedValue(axiosError);

      renderCreateLead();

      await user.type(screen.getByLabelText(/lead name/i), 'Test');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid email format/i)).toBeInTheDocument();
        expect(screen.getByText(/Lead name is too short/i)).toBeInTheDocument();
      });

      // Should NOT show generic ErrorAlert for validation errors
      const alerts = screen.queryAllByRole('alert');
      const hasGenericError = alerts.some((alert) =>
        alert.textContent?.toLowerCase().includes('validation failed')
      );
      expect(hasGenericError).toBe(false);
    });
  });

  describe('Server Error Handling', () => {
    it('shows ErrorAlert for server error', async () => {
      const user = userEvent.setup();

      // Mock service to throw server error
      // The httpClient interceptor transforms errors, so we need to throw an Error with the message
      const error = new Error('Internal server error');
      (error as any).isAxiosError = true;
      (error as any).response = {
        status: 500,
        data: {
          success: false,
          message: 'Internal server error',
        },
      };
      mockLeadsService.createLead.mockRejectedValue(error);

      renderCreateLead();

      await user.type(screen.getByLabelText(/lead name/i), 'Test Lead');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Internal server error/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Loading State', () => {
    it('disables submit button during creation', async () => {
      const user = userEvent.setup();
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });

      // Mock service to delay response
      mockLeadsService.createLead.mockImplementation(
        () => requestPromise.then(() => ({
          id: 'lead-1',
          leadName: 'Test Lead',
          email: 'test@example.com',
          status: 'NEW',
          ownerId: 'user-1',
          ownerName: 'Regular User',
          createdAt: '2024-01-14T10:00:00Z',
        } as any))
      );

      renderCreateLead();

      await user.type(screen.getByLabelText(/lead name/i), 'Test Lead');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Resolve request
      resolveRequest!({});

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
