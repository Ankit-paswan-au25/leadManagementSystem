/**
 * Register Page Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Register from '../pages/Register';
import { authService } from '../services/auth.service';

// Mock auth service
jest.mock('../services/auth.service', () => ({
  authService: {
    register: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

const renderRegister = () => {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );
};

describe('Register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders register form', () => {
      renderRegister();

      // Check heading (h1)
      expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument();
      expect(screen.getByText(/Sign up to get started/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('renders link to login page', () => {
      renderRegister();

      const loginLink = screen.getByRole('link', { name: /sign in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Form Validation', () => {
    it('shows error for empty name', async () => {
      const user = userEvent.setup();
      renderRegister();

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty email', async () => {
      const user = userEvent.setup();
      renderRegister();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Test User');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup();
      renderRegister();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Test User');

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'password123');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });

    it('shows error for empty password', async () => {
      const user = userEvent.setup();
      renderRegister();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Test User');

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegister();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Test User');

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'password123');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, 'differentpassword');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });
  });

  describe('Registration Flow', () => {
    it('calls register service on form submit', async () => {
      const user = userEvent.setup();
      mockAuthService.register.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
        },
        message: 'Registration successful',
      });

      renderRegister();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Test User');

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'password123');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAuthService.register).toHaveBeenCalledWith(
          'Test User',
          'test@example.com',
          'password123'
        );
      });
    });

    it('shows success message on successful registration', async () => {
      const user = userEvent.setup();
      mockAuthService.register.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
        },
        message: 'Registration successful. Your account is pending activation.',
      });

      renderRegister();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Test User');

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'password123');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
      });
    });

    it('shows error message on registration failure', async () => {
      const user = userEvent.setup();
      mockAuthService.register.mockRejectedValue(new Error('Registration failed'));

      renderRegister();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Test User');

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'password123');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
      });
    });

    it('disables submit button while loading', async () => {
      const user = userEvent.setup();
      mockAuthService.register.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          user: {
            id: '123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'USER',
          },
          message: 'Success',
        }), 500))
      );

      renderRegister();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, 'Test User');

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'password123');

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();
    });
  });
});

