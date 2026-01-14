/**
 * Assign Product Modal Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignProductModal from '../components/Customers/AssignProductModal';
import { productService } from '../services/product.service';
import { authStore } from '../store/auth.store';

// Mock product service
jest.mock('../services/product.service', () => ({
  productService: {
    assignProduct: jest.fn(),
  },
}));

// Mock auth store
jest.mock('../store/auth.store', () => ({
  authStore: {
    currentRole: 'ADMIN',
  },
}));

const mockProductService = productService as jest.Mocked<typeof productService>;

describe('AssignProductModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly when open', () => {
      render(
        <AssignProductModal
          isOpen={true}
          onClose={jest.fn()}
          customerId="1"
          customerName="John Doe"
        />
      );

      expect(screen.getByRole('heading', { name: 'Assign Product' })).toBeInTheDocument();
      expect(screen.getByText(/Assigning product to:/i)).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByLabelText(/^Product\s*\*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <AssignProductModal
          isOpen={false}
          onClose={jest.fn()}
          customerId="1"
          customerName="John Doe"
        />
      );

      expect(screen.queryByText('Assign Product')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation error if no product selected', async () => {
      const user = userEvent.setup();
      render(
        <AssignProductModal
          isOpen={true}
          onClose={jest.fn()}
          customerId="1"
          customerName="John Doe"
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Assign Product' });
      await user.click(submitButton);

      expect(screen.getByText('Product is required')).toBeInTheDocument();
      expect(mockProductService.assignProduct).not.toHaveBeenCalled();
    });

    it('shows validation error if no start date selected', async () => {
      const user = userEvent.setup();
      render(
        <AssignProductModal
          isOpen={true}
          onClose={jest.fn()}
          customerId="1"
          customerName="John Doe"
        />
      );

      const productSelect = screen.getByRole('combobox', { name: /^Product/i });
      await user.selectOptions(productSelect, 'prod-1');

      const submitButton = screen.getByRole('button', { name: 'Assign Product' });
      await user.click(submitButton);

      expect(screen.getByText('Start date is required')).toBeInTheDocument();
      expect(mockProductService.assignProduct).not.toHaveBeenCalled();
    });
  });

  describe('Expiry Date Preview', () => {
    it('shows expiry date preview when product and start date selected', async () => {
      const user = userEvent.setup();
      render(
        <AssignProductModal
          isOpen={true}
          onClose={jest.fn()}
          customerId="1"
          customerName="John Doe"
        />
      );

      const productSelect = screen.getByRole('combobox', { name: /^Product/i });
      await user.selectOptions(productSelect, 'prod-1');

      const startDateInput = screen.getByLabelText(/Start Date/i);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await user.type(startDateInput, tomorrow.toISOString().split('T')[0]);

      await waitFor(() => {
        expect(screen.getByText(/Estimated Expiry Date/i)).toBeInTheDocument();
      });
    });
  });

  describe('Product Assignment', () => {
    it('calls assignProduct on valid submit', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      mockProductService.assignProduct.mockResolvedValue({
        productName: 'Premium Support',
        expiryDate: '2025-01-15T00:00:00Z',
        status: 'ACTIVE',
      });

      render(
        <AssignProductModal
          isOpen={true}
          onClose={jest.fn()}
          customerId="1"
          customerName="John Doe"
          onSuccess={onSuccess}
        />
      );

      const productSelect = screen.getByRole('combobox', { name: /^Product/i });
      await user.selectOptions(productSelect, 'prod-1');

      const startDateInput = screen.getByLabelText(/Start Date/i);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await user.type(startDateInput, tomorrow.toISOString().split('T')[0]);

      const submitButton = screen.getByRole('button', { name: 'Assign Product' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockProductService.assignProduct).toHaveBeenCalledWith('1', {
          productId: 'prod-1',
          startDate: expect.any(String),
        });
      });
    });

    it('shows SuccessAlert on successful assignment', async () => {
      const user = userEvent.setup();
      mockProductService.assignProduct.mockResolvedValue({
        productName: 'Premium Support',
        expiryDate: '2025-01-15T00:00:00Z',
        status: 'ACTIVE',
      });

      render(
        <AssignProductModal
          isOpen={true}
          onClose={jest.fn()}
          customerId="1"
          customerName="John Doe"
        />
      );

      const productSelect = screen.getByRole('combobox', { name: /^Product/i });
      await user.selectOptions(productSelect, 'prod-1');

      const startDateInput = screen.getByLabelText(/Start Date/i);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await user.type(startDateInput, tomorrow.toISOString().split('T')[0]);

      const submitButton = screen.getByRole('button', { name: 'Assign Product' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Product assigned successfully')).toBeInTheDocument();
      });
    });

    it('shows ErrorAlert for API failure', async () => {
      const user = userEvent.setup();
      mockProductService.assignProduct.mockRejectedValue(
        new Error('Failed to assign product')
      );

      render(
        <AssignProductModal
          isOpen={true}
          onClose={jest.fn()}
          customerId="1"
          customerName="John Doe"
        />
      );

      const productSelect = screen.getByRole('combobox', { name: /^Product/i });
      await user.selectOptions(productSelect, 'prod-1');

      const startDateInput = screen.getByLabelText(/Start Date/i);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await user.type(startDateInput, tomorrow.toISOString().split('T')[0]);

      const submitButton = screen.getByRole('button', { name: 'Assign Product' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to assign product')).toBeInTheDocument();
      });
    });

    it('shows inline validation errors from backend (422)', async () => {
      const user = userEvent.setup();
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            errors: {
              productId: 'Invalid product',
            },
          },
        },
      };
      mockProductService.assignProduct.mockRejectedValue(axiosError);

      render(
        <AssignProductModal
          isOpen={true}
          onClose={jest.fn()}
          customerId="1"
          customerName="John Doe"
        />
      );

      const productSelect = screen.getByRole('combobox', { name: /^Product/i });
      await user.selectOptions(productSelect, 'prod-1');

      const startDateInput = screen.getByLabelText(/Start Date/i);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await user.type(startDateInput, tomorrow.toISOString().split('T')[0]);

      const submitButton = screen.getByRole('button', { name: 'Assign Product' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid product')).toBeInTheDocument();
      });
    });

    it('disables submit button while loading', async () => {
      const user = userEvent.setup();
      mockProductService.assignProduct.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({} as any), 500))
      );

      render(
        <AssignProductModal
          isOpen={true}
          onClose={jest.fn()}
          customerId="1"
          customerName="John Doe"
        />
      );

      const productSelect = screen.getByRole('combobox', { name: /^Product/i });
      await user.selectOptions(productSelect, 'prod-1');

      const startDateInput = screen.getByLabelText(/Start Date/i);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await user.type(startDateInput, tomorrow.toISOString().split('T')[0]);

      const submitButton = screen.getByRole('button', { name: 'Assign Product' });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      await waitFor(() => expect(submitButton).not.toBeDisabled(), { timeout: 1000 });
    });
  });
});

