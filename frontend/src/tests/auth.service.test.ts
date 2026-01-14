import { authService } from '../services/auth.service';
import { post } from '../services/httpClient';
import axios, { AxiosError } from 'axios';

// Mock httpClient
jest.mock('../services/httpClient', () => ({
  post: jest.fn(),
}));

const mockPost = post as jest.MockedFunction<typeof post>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login and return token, role, and email', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'user123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'ADMIN' as const,
            status: 'ACTIVE',
          },
          token: 'jwt_token_123',
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        token: 'jwt_token_123',
        user: {
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        role: 'ADMIN',
        email: 'test@example.com',
        refreshToken: undefined,
      });
    });

    it('should handle USER role correctly', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'user456',
            name: 'Regular User',
            email: 'user@example.com',
            role: 'USER' as const,
            status: 'ACTIVE',
          },
          token: 'jwt_token_456',
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await authService.login('user@example.com', 'password123');

      expect(result).toEqual({
        token: 'jwt_token_456',
        user: {
          id: 'user456',
          name: 'Regular User',
          email: 'user@example.com',
          role: 'USER',
          status: 'ACTIVE',
        },
        role: 'USER',
        email: 'user@example.com',
        refreshToken: undefined,
      });
    });

    it('should throw error for 401 - Invalid credentials', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            status: 'error',
            message: 'Invalid email or password',
          },
        },
        code: undefined,
      } as AxiosError<{ message?: string }>;

      mockPost.mockRejectedValue(axiosError);

      await expect(
        authService.login('wrong@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });
    });

    it('should throw error for 401 with default message when message is missing', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {},
        },
        code: undefined,
      } as AxiosError<{ message?: string }>;

      mockPost.mockRejectedValue(axiosError);

      await expect(
        authService.login('wrong@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for 403 - Account disabled', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            status: 'error',
            message: 'Account is not active. Please contact administrator.',
          },
        },
        code: undefined,
      } as AxiosError<{ message?: string }>;

      mockPost.mockRejectedValue(axiosError);

      await expect(
        authService.login('disabled@example.com', 'password123')
      ).rejects.toThrow('Account is not active. Please contact administrator.');
    });

    it('should throw error for 403 with default message when message is missing', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {},
        },
        code: undefined,
      } as AxiosError<{ message?: string }>;

      mockPost.mockRejectedValue(axiosError);

      await expect(
        authService.login('disabled@example.com', 'password123')
      ).rejects.toThrow('Account is not active. Please contact administrator.');
    });

    it('should throw error for 422 - Validation error with field errors', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            status: 'error',
            message: 'Validation failed',
            errors: {
              email: 'Email is required',
              password: 'Password is required',
            },
          },
        },
        code: undefined,
      } as AxiosError<{ message?: string; errors?: Record<string, string> }>;

      mockPost.mockRejectedValue(axiosError);

      await expect(
        authService.login('', '')
      ).rejects.toThrow('Email is required, Password is required');
    });

    it('should throw error for 422 - Validation error with message only', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {
            status: 'error',
            message: 'Validation failed',
          },
        },
        code: undefined,
      } as AxiosError<{ message?: string; errors?: Record<string, string> }>;

      mockPost.mockRejectedValue(axiosError);

      await expect(
        authService.login('invalid', 'short')
      ).rejects.toThrow('Validation failed');
    });

    it('should throw error for 422 with default message when message is missing', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 422,
          data: {},
        },
        code: undefined,
      } as AxiosError<{ message?: string; errors?: Record<string, string> }>;

      mockPost.mockRejectedValue(axiosError);

      await expect(
        authService.login('invalid', 'short')
      ).rejects.toThrow('Validation failed');
    });

    it('should throw error for other HTTP errors (500)', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {
            status: 'error',
            message: 'Internal server error',
          },
        },
        code: undefined,
      } as AxiosError<{ message?: string }>;

      mockPost.mockRejectedValue(axiosError);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Internal server error');
    });

    it('should throw error for network timeout', async () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        response: undefined,
      } as AxiosError;

      mockPost.mockRejectedValue(axiosError);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Request timed out. Please try again.');
    });

    it('should throw error for network error (no response)', async () => {
      const axiosError = {
        isAxiosError: true,
        code: undefined,
        response: undefined,
      } as AxiosError;

      mockPost.mockRejectedValue(axiosError);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Network error. Please check your connection and try again.');
    });

    it('should throw error when response data is invalid (missing token)', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'user123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'ADMIN' as const,
            status: 'ACTIVE',
          },
          // token is missing
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Invalid response from server');
    });

    it('should throw error when response data is invalid (missing user)', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'jwt_token_123',
          // user is missing
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Invalid response from server');
    });

    it('should throw error when response data is invalid (missing user.role)', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'user123',
            name: 'Test User',
            email: 'test@example.com',
            // role is missing
            status: 'ACTIVE',
          },
          token: 'jwt_token_123',
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Invalid response from server');
    });

    it('should throw error when response data is invalid (missing user.email)', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'user123',
            name: 'Test User',
            // email is missing
            role: 'ADMIN' as const,
            status: 'ACTIVE',
          },
          token: 'jwt_token_123',
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Invalid response from server');
    });

    it('should throw error for non-Axios errors', async () => {
      const regularError = new Error('Some unexpected error');
      mockPost.mockRejectedValue(regularError);

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Some unexpected error');
    });

    it('should throw default error for unknown error types', async () => {
      mockPost.mockRejectedValue('String error');

      await expect(
        authService.login('test@example.com', 'password123')
      ).rejects.toThrow('Login failed. Please try again.');
    });
  });
});

