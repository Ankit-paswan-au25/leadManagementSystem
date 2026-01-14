import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OwnershipRequests from '../pages/Admin/OwnershipRequests';
import { authStore } from '../store/auth.store';
import { ownershipService } from '../services/ownership.service';

// Mock auth store
jest.mock('../store/auth.store', () => ({
  authStore: {
    currentRole: 'ADMIN',
  },
}));

// Mock ownership service
jest.mock('../services/ownership.service', () => ({
  ownershipService: {
    getPendingRequests: jest.fn(),
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
  },
}));

const mockAuthStore = authStore as jest.Mocked<typeof authStore>;
const mockOwnershipService = ownershipService as jest.Mocked<typeof ownershipService>;

const mockRequests = [
  {
    id: 'req-1',
    leadId: '1',
    leadName: 'John Doe',
    currentOwnerId: 'user-1',
    currentOwnerName: 'Regular User',
    requestedOwnerId: 'admin-1',
    requestedOwnerName: 'Admin User',
    requestedById: 'user-1',
    requestedByName: 'Regular User',
    requestedAt: '2024-01-14T10:00:00Z',
    status: 'PENDING' as const,
    reason: 'Need admin expertise',
  },
  {
    id: 'req-2',
    leadId: '2',
    leadName: 'Jane Smith',
    currentOwnerId: 'user-1',
    currentOwnerName: 'Regular User',
    requestedOwnerId: 'user-2',
    requestedOwnerName: 'User Two',
    requestedById: 'user-1',
    requestedByName: 'Regular User',
    requestedAt: '2024-01-13T14:30:00Z',
    status: 'PENDING' as const,
  },
];

const renderOwnershipRequests = () => {
  return render(
    <MemoryRouter>
      <OwnershipRequests />
    </MemoryRouter>
  );
};

describe('OwnershipRequests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOwnershipService.getPendingRequests.mockResolvedValue(mockRequests);
    mockOwnershipService.approveRequest.mockResolvedValue(mockRequests[0]);
    mockOwnershipService.rejectRequest.mockResolvedValue(mockRequests[0]);
  });

  describe('Rendering', () => {
    it('renders page title', async () => {
      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('Ownership Requests')).toBeInTheDocument();
      });
    });

    it('loads and displays requests', async () => {
      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('shows table columns', async () => {
      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('Lead Name')).toBeInTheDocument();
        expect(screen.getByText('Current Owner')).toBeInTheDocument();
        expect(screen.getByText('Requested Owner')).toBeInTheDocument();
        expect(screen.getByText('Requested By')).toBeInTheDocument();
        expect(screen.getByText('Requested At')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows skeleton while loading', () => {
      mockOwnershipService.getPendingRequests.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      renderOwnershipRequests();

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no requests', async () => {
      mockOwnershipService.getPendingRequests.mockResolvedValue([]);

      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('No pending ownership requests')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('shows error alert on load failure', async () => {
      const errorMessage = 'Failed to load requests';
      mockOwnershipService.getPendingRequests.mockRejectedValue(new Error(errorMessage));

      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockOwnershipService.getPendingRequests.mockRejectedValue(new Error('Failed to load'));

      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('Approve Flow', () => {
    it('opens approve modal when approve button clicked', async () => {
      const user = userEvent.setup();
      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByText('Approve');
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Approve Ownership Change')).toBeInTheDocument();
      });
    });

    it('calls approveRequest on confirm', async () => {
      const user = userEvent.setup();
      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByText('Approve');
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Approve Ownership Change')).toBeInTheDocument();
      });

      // Find the confirm button in the modal (should be the last one)
      const allApproveButtons = screen.getAllByRole('button', { name: /Approve/i });
      const confirmButton = allApproveButtons[allApproveButtons.length - 1];
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOwnershipService.approveRequest).toHaveBeenCalledWith('1'); // leadId
      }, { timeout: 3000 });
    });

    it('shows success alert after approval', async () => {
      const user = userEvent.setup();
      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByText('Approve');
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Approve Ownership Change')).toBeInTheDocument();
      });

      // Find the confirm button in the modal (should be the last one)
      const allApproveButtons = screen.getAllByRole('button', { name: /Approve/i });
      const confirmButton = allApproveButtons[allApproveButtons.length - 1];
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Ownership request approved successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Reject Flow', () => {
    it('opens reject modal when reject button clicked', async () => {
      const user = userEvent.setup();
      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByText('Reject');
      await user.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Reject Ownership Change')).toBeInTheDocument();
      });
    });

    it('calls rejectRequest on confirm', async () => {
      const user = userEvent.setup();
      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByText('Reject');
      await user.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Reject Ownership Change')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /Reject Request/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOwnershipService.rejectRequest).toHaveBeenCalledWith('1', undefined); // leadId
      });
    });

    it('includes rejection reason when provided', async () => {
      const user = userEvent.setup();
      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByText('Reject');
      await user.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Reject Ownership Change')).toBeInTheDocument();
      });

      const reasonTextarea = screen.getByLabelText(/Reason/i);
      await user.type(reasonTextarea, 'Not appropriate');

      const confirmButtons = screen.getAllByRole('button', { name: /Reject Request/i });
      const confirmButton = confirmButtons[confirmButtons.length - 1];
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOwnershipService.rejectRequest).toHaveBeenCalledWith('1', 'Not appropriate'); // leadId
      }, { timeout: 3000 });
    });

    it('shows success alert after rejection', async () => {
      const user = userEvent.setup();
      renderOwnershipRequests();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByText('Reject');
      await user.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Reject Ownership Change')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /Reject Request/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Ownership request rejected successfully/i)).toBeInTheDocument();
      });
    });
  });
});

