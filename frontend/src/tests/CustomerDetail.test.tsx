/**
 * Customer Detail Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CustomerDetail from '../pages/Customers/CustomerDetail';
import { customersService } from '../services/customers.service';

// Mock customers service
jest.mock('../services/customers.service', () => ({
  customersService: {
    getCustomerById: jest.fn(),
    getCustomerProducts: jest.fn(),
  },
}));

const mockCustomersService = customersService as jest.Mocked<typeof customersService>;

const mockCustomer = {
  id: '1',
  customerName: 'John Doe',
  companyName: 'Acme Corp',
  primaryEmail: 'john.doe@acme.com',
  phone: '+1-555-0100',
  status: 'ACTIVE' as const,
  accountOwnerName: 'Admin User',
};

const mockProducts = [
  {
    productName: 'Premium Support',
    category: 'Support',
    startDate: '2024-01-01T00:00:00Z',
    expiryDate: '2024-12-31T23:59:59Z',
    status: 'ACTIVE' as const,
    daysRemaining: 45,
  },
  {
    productName: 'Enterprise License',
    category: 'License',
    startDate: '2023-06-01T00:00:00Z',
    expiryDate: '2024-02-15T23:59:59Z',
    status: 'ACTIVE' as const,
    daysRemaining: 15,
  },
  {
    productName: 'Expired Product',
    category: 'Subscription',
    startDate: '2024-01-01T00:00:00Z',
    expiryDate: '2024-01-10T23:59:59Z',
    status: 'EXPIRED' as const,
    daysRemaining: -5,
  },
];

const renderCustomerDetail = (customerId = '1') => {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/customers/${customerId}`]}>
      <Routes>
        <Route path="/dashboard/customers/:id" element={<CustomerDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('CustomerDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCustomersService.getCustomerById.mockResolvedValue(mockCustomer);
    mockCustomersService.getCustomerProducts.mockResolvedValue(mockProducts);
  });

  describe('Loading State', () => {
    it('shows skeleton while loading', () => {
      mockCustomersService.getCustomerById.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockCustomer), 100))
      );

      renderCustomerDetail();

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Customer Information', () => {
    it('renders customer details', async () => {
      renderCustomerDetail();

      await waitFor(() => {
        // John Doe appears in header - use getAllByText
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        // Acme Corp appears multiple times - use getAllByText
        expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
        expect(screen.getByText('john.doe@acme.com')).toBeInTheDocument();
        expect(screen.getByText('+1-555-0100')).toBeInTheDocument();
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });
    });

    it('renders email as clickable link', async () => {
      renderCustomerDetail();

      await waitFor(() => {
        const emailLink = screen.getByText('john.doe@acme.com');
        expect(emailLink).toHaveAttribute('href', 'mailto:john.doe@acme.com');
      });
    });
  });

  describe('Products', () => {
    it('renders customer products', async () => {
      renderCustomerDetail();

      await waitFor(() => {
        expect(screen.getByText('Premium Support')).toBeInTheDocument();
        expect(screen.getByText('Enterprise License')).toBeInTheDocument();
        expect(screen.getByText('Expired Product')).toBeInTheDocument();
      });
    });

    it('displays product details', async () => {
      renderCustomerDetail();

      await waitFor(() => {
        expect(screen.getByText('Support')).toBeInTheDocument();
        expect(screen.getByText('License')).toBeInTheDocument();
        expect(screen.getByText('Subscription')).toBeInTheDocument();
      });
    });

    it('displays daysRemaining from backend', async () => {
      renderCustomerDetail();

      // First wait for products to render
      await waitFor(() => {
        expect(screen.getByText('Premium Support')).toBeInTheDocument();
        expect(screen.getByText('Enterprise License')).toBeInTheDocument();
        expect(screen.getByText('Expired Product')).toBeInTheDocument();
      });

      // Then check for days remaining text - check each product separately
      await waitFor(() => {
        // Check for 45 days (Premium Support)
        const premiumSupport = screen.getByText('Premium Support');
        const premiumContainer = premiumSupport.closest('div')?.textContent || '';
        expect(premiumContainer).toMatch(/45.*day/i);
        
        // Check for 15 days (Enterprise License)
        const enterpriseLicense = screen.getByText('Enterprise License');
        const enterpriseContainer = enterpriseLicense.closest('div')?.textContent || '';
        expect(enterpriseContainer).toMatch(/15.*day/i);
      }, { timeout: 3000 });
    });

    it('shows empty state when no products', async () => {
      mockCustomersService.getCustomerProducts.mockResolvedValue([]);

      renderCustomerDetail();

      await waitFor(() => {
        expect(screen.getByText(/No products assigned/i)).toBeInTheDocument();
      });
    });
  });

  describe('Expiry Badge', () => {
    it('displays expiry badge for each product', async () => {
      renderCustomerDetail();

      await waitFor(() => {
        // ExpiryBadge should be rendered for each product
        const badges = screen.getAllByText(/days remaining|Expired/i);
        expect(badges.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('Error Handling', () => {
    it('shows ErrorAlert for 404 customer not found', async () => {
      mockCustomersService.getCustomerById.mockRejectedValue(new Error('Customer not found'));

      renderCustomerDetail('non-existent');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Customer not found/i);
        expect(screen.getByText(/Back to Customers/i)).toBeInTheDocument();
      });
    });

    it('handles product fetch error gracefully', async () => {
      mockCustomersService.getCustomerProducts.mockRejectedValue(new Error('Failed to load products'));

      renderCustomerDetail();

      await waitFor(() => {
        // Customer detail should still render (John Doe appears multiple times)
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      await waitFor(() => {
        // Products error should be shown
        expect(screen.getByText(/Failed to load products/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
