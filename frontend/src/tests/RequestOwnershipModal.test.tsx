import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestOwnershipModal from '../components/Leads/RequestOwnershipModal';
import { ownershipService } from '../services/ownership.service';

// Mock ownership service
jest.mock('../services/ownership.service', () => ({
  ownershipService: {
    requestOwnershipChange: jest.fn(),
  },
}));

const mockOwnershipService = ownershipService as jest.Mocked<typeof ownershipService>;

describe('RequestOwnershipModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOwnershipService.requestOwnershipChange.mockResolvedValue({
      id: 'req-1',
      leadId: '1',
      leadName: 'Test Lead',
      currentOwnerId: 'user-1',
      currentOwnerName: 'Regular User',
      requestedOwnerId: 'admin-1',
      requestedOwnerName: 'Admin User',
      requestedById: 'user-1',
      requestedByName: 'Regular User',
      requestedAt: '2024-01-14T10:00:00Z',
      status: 'PENDING',
    });
  });

  describe('Rendering', () => {
    it('renders modal when open', () => {
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      );

      expect(screen.getByText('Request Ownership Change')).toBeInTheDocument();
      expect(screen.getByText(/Requesting ownership change for:/i)).toBeInTheDocument();
      expect(screen.getByText('Test Lead')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <RequestOwnershipModal
          isOpen={false}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      );

      expect(screen.queryByText('Request Ownership Change')).not.toBeInTheDocument();
    });

    it('loads available owners on open', async () => {
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      );

      // Owners are hardcoded in the component, so we just check they're rendered
      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });
    });
  });

  describe('Form Fields', () => {
    it('renders requested owner dropdown', async () => {
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Requested Owner/i)).toBeInTheDocument();
      });
    });

    it('renders reason textarea', () => {
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      );

      expect(screen.getByLabelText(/Reason/i)).toBeInTheDocument();
    });

    it('populates user dropdown with available owners', async () => {
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('shows error when submitting without owner', async () => {
      const user = userEvent.setup();
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Submit Request')).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Submit Request');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Owner is required')).toBeInTheDocument();
      });
    });

    it('does not show error when owner is selected', async () => {
      const user = userEvent.setup();
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Requested Owner/i)).toBeInTheDocument();
      });

      const ownerSelect = screen.getByLabelText(/Requested Owner/i);
      await user.selectOptions(ownerSelect, 'admin-1');

      const submitButton = screen.getByText('Submit Request');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Owner is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Submission', () => {
    it('calls requestOwnershipChange on valid submit', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Requested Owner/i)).toBeInTheDocument();
      });

      const ownerSelect = screen.getByLabelText(/Requested Owner/i);
      await user.selectOptions(ownerSelect, 'admin-1');

      const submitButton = screen.getByText('Submit Request');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOwnershipService.requestOwnershipChange).toHaveBeenCalledWith('1', {
          requestedOwnerId: 'admin-1',
          reason: undefined,
        });
      });
    });

    it('includes reason when provided', async () => {
      const user = userEvent.setup();
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Requested Owner/i)).toBeInTheDocument();
      });

      const ownerSelect = screen.getByLabelText(/Requested Owner/i);
      await user.selectOptions(ownerSelect, 'admin-1');

      const reasonTextarea = screen.getByLabelText(/Reason/i);
      await user.type(reasonTextarea, 'Need admin expertise');

      const submitButton = screen.getByText('Submit Request');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOwnershipService.requestOwnershipChange).toHaveBeenCalledWith('1', {
          requestedOwnerId: 'admin-1',
          reason: 'Need admin expertise',
        });
      });
    });

    it('calls onSuccess callback on successful submit', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Requested Owner/i)).toBeInTheDocument();
      });

      const ownerSelect = screen.getByLabelText(/Requested Owner/i);
      await user.selectOptions(ownerSelect, 'admin-1');

      const submitButton = screen.getByText('Submit Request');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('closes modal on successful submit', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={onClose}
          leadId="1"
          leadName="Test Lead"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Requested Owner/i)).toBeInTheDocument();
      });

      const ownerSelect = screen.getByLabelText(/Requested Owner/i);
      await user.selectOptions(ownerSelect, 'admin-1');

      const submitButton = screen.getByText('Submit Request');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('disables form during submission', async () => {
      const user = userEvent.setup();
      mockOwnershipService.requestOwnershipChange.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          id: 'req-1',
          leadId: '1',
          leadName: 'Test Lead',
          currentOwnerId: 'user-1',
          currentOwnerName: 'Regular User',
          requestedOwnerId: 'admin-1',
          requestedOwnerName: 'Admin User',
          requestedById: 'user-1',
          requestedByName: 'Regular User',
          requestedAt: '2024-01-14T10:00:00Z',
          status: 'PENDING',
        } as any), 100))
      );

      render(
        <RequestOwnershipModal
          isOpen={true}
          onClose={jest.fn()}
          leadId="1"
          leadName="Test Lead"
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Requested Owner/i)).toBeInTheDocument();
      });

      const ownerSelect = screen.getByLabelText(/Requested Owner/i);
      await user.selectOptions(ownerSelect, 'admin-1');

      const submitButton = screen.getByText('Submit Request');
      await user.click(submitButton);

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();
    });
  });
});

