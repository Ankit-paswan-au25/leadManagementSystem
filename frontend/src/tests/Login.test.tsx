/**
 * Login Page Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { authStore } from '../store/auth.store';
import axios from 'axios';

// Mock auth store
jest.mock('../store/auth.store', () => ({
  authStore: {
    login: jest.fn(),
    isAuthenticated: false,
    currentRole: null,
    currentEmail: null,
  },
}));

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockAuthStore = authStore as jest.Mocked<typeof authStore>;

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.currentRole = null;
    mockAuthStore.currentEmail = null;
  });

  describe('Rendering', () => {
    it('renders login form with email and password fields', () => {
      renderLogin();

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation error when email is empty on submit', async () => {
      const user = userEvent.setup();
      renderLogin();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('shows validation error when password is empty on submit', async () => {
      const user = userEvent.setup();
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid email format', async () => {
      const user = userEvent.setup();
      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Login', () => {
    it('redirects to dashboard on successful login', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        token: 'test-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'USER' as const,
        },
        role: 'USER' as const,
        email: 'test@example.com',
      };

      mockAuthStore.login.mockResolvedValue(mockResponse);

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAuthStore.login).toHaveBeenCalledWith('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(screen.getByText(/Login successful/i)).toBeInTheDocument();
      });

      // Check redirect after delay
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        },
        { timeout: 1000 }
      );
    });

    it('shows success alert on successful login', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        token: 'test-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'USER' as const,
        },
        role: 'USER' as const,
        email: 'test@example.com',
      };

      mockAuthStore.login.mockResolvedValue(mockResponse);

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Login successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows ErrorAlert for 401 (invalid credentials)', async () => {
      const user = userEvent.setup();
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            message: 'Invalid email or password',
          },
        },
      };

      mockAuthStore.login.mockRejectedValue(axiosError);

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpass');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
      });
    });

    it('shows ErrorAlert for 403 (disabled user)', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Account is not active. Please contact administrator.';
      const error = new Error(errorMessage);
      // Make it look like an axios error
      (error as any).isAxiosError = true;
      (error as any).response = {
        status: 403,
        data: {
          message: errorMessage,
        },
      };

      mockAuthStore.login.mockRejectedValue(error);

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'disabled@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Account is not active/i)).toBeInTheDocument();
      });
    });

    it('shows inline validation errors for 422 (validation error)', async () => {
      const user = userEvent.setup();
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            errors: {
              email: 'Invalid email format',
              password: 'Password must be at least 8 characters',
            },
          },
        },
      };

      // Set up axios.isAxiosError to return true
      mockedAxios.isAxiosError = jest.fn().mockReturnValue(true);

      mockAuthStore.login.mockRejectedValue(axiosError);

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'pass');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid email format/i)).toBeInTheDocument();
        expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
      });

      // Should NOT show generic ErrorAlert for validation errors (only inline errors)
      const alert = screen.queryByRole('alert');
      if (alert) {
        expect(alert).not.toHaveTextContent(/login failed/i);
      }
    });

    it('shows ErrorAlert for network errors', async () => {
      const user = userEvent.setup();
      const error = new Error('Network error');

      mockAuthStore.login.mockRejectedValue(error);

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('disables submit button during login', async () => {
      const user = userEvent.setup();
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      mockAuthStore.login.mockReturnValue(loginPromise as any);

      renderLogin();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      // Resolve the promise
      resolveLogin!({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com', role: 'USER' },
        role: 'USER',
        email: 'test@example.com',
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Redirect if Authenticated', () => {
    it('redirects to dashboard if already authenticated', () => {
      mockAuthStore.isAuthenticated = true;

      renderLogin();

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
