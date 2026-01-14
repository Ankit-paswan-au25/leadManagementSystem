/**
 * Customers List Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CustomersList from '../pages/Customers/CustomersList';
import { customersService } from '../services/customers.service';

// Mock customer service
jest.mock('../services/customers.service', () => ({
  customersService: {
    getCustomers: jest.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockCustomersService = customersService as jest.Mocked<typeof customersService>;

const mockCustomers = [
  {
    id: '1',
    customerName: 'John Doe',
    companyName: 'Acme Corp',
    primaryEmail: 'john.doe@acme.com',
    phone: '+1-555-0100',
    status: 'ACTIVE' as const,
    accountOwnerName: 'Admin User',
  },
  {
    id: '2',
    customerName: 'Jane Smith',
    companyName: 'Tech Solutions Inc',
    primaryEmail: 'jane.smith@techsolutions.com',
    status: 'ACTIVE' as const,
    accountOwnerName: 'Regular User',
  },
];

const renderCustomersList = () => {
  return render(
    <MemoryRouter>
      <CustomersList />
    </MemoryRouter>
  );
};

describe('CustomersList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Loading State', () => {
    it('shows skeleton while loading', () => {
      mockCustomersService.getCustomers.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      renderCustomersList();

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Successful Data Fetch', () => {
    it('renders customers from API', async () => {
      mockCustomersService.getCustomers.mockResolvedValue(mockCustomers);

      renderCustomersList();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('displays customer count', async () => {
      mockCustomersService.getCustomers.mockResolvedValue(mockCustomers);

      renderCustomersList();

      await waitFor(() => {
        expect(screen.getByText(/2 customers/i)).toBeInTheDocument();
      });
    });

    it('renders all table columns', async () => {
      mockCustomersService.getCustomers.mockResolvedValue(mockCustomers);

      renderCustomersList();

      await waitFor(() => {
        expect(screen.getByText('Customer Name')).toBeInTheDocument();
        expect(screen.getByText('Company')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Account Owner')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no customers', async () => {
      mockCustomersService.getCustomers.mockResolvedValue([]);

      renderCustomersList();

      await waitFor(() => {
        expect(screen.getByText(/No customers found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows ErrorAlert on fetch failure', async () => {
      const errorMessage = 'Failed to load customers';
      mockCustomersService.getCustomers.mockRejectedValue(new Error(errorMessage));

      renderCustomersList();

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockCustomersService.getCustomers.mockRejectedValue(new Error('Failed to load'));

      renderCustomersList();

      await waitFor(() => {
        expect(screen.getByText(/Retry/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to customer detail when row clicked', async () => {
      mockCustomersService.getCustomers.mockResolvedValue(mockCustomers);

      renderCustomersList();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Find the row and click it
      const customerRow = screen.getByText('John Doe').closest('tr');
      if (customerRow) {
        await userEvent.click(customerRow);
      }

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard/customers/1');
      });
    });
  });
});
