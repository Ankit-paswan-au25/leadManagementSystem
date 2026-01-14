/**
 * Auth Service Tests
 */

import { authService } from '../services/auth.service';
import { post } from '../services/httpClient';
import axios from 'axios';

// Mock httpClient
jest.mock('../services/httpClient', () => ({
  post: jest.fn(),
}));

const mockPost = post as jest.MockedFunction<typeof post>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('successfully logs in and returns LoginResponse', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'test-token-123',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            role: 'USER' as const,
            name: 'Test User',
          },
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        token: 'test-token-123',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'USER',
          name: 'Test User',
        },
        role: 'USER',
        email: 'test@example.com',
      });
    });

    it('throws error for invalid credentials (401)', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            message: 'Invalid email or password',
          },
        },
      } as any;

      mockPost.mockRejectedValue(axiosError);

      await expect(authService.login('wrong@example.com', 'wrongpass')).rejects.toEqual(axiosError);
      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'wrong@example.com',
        password: 'wrongpass',
      });
    });

    it('throws error for disabled user (403)', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            message: 'Account is not active. Please contact administrator.',
          },
        },
      } as any;

      mockPost.mockRejectedValue(axiosError);

      await expect(authService.login('disabled@example.com', 'password')).rejects.toEqual(axiosError);
      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'disabled@example.com',
        password: 'password',
      });
    });

    it('throws error when response is not successful', async () => {
      const mockResponse = {
        success: false,
        message: 'Login failed',
      };

      mockPost.mockResolvedValue(mockResponse as any);

      await expect(authService.login('test@example.com', 'password')).rejects.toThrow('Login failed');
    });

    it('throws error when response data is missing', async () => {
      const mockResponse = {
        success: true,
        data: null,
      };

      mockPost.mockResolvedValue(mockResponse as any);

      await expect(authService.login('test@example.com', 'password')).rejects.toThrow('Login failed');
    });

    it('throws error when token is missing in response', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: 'user-1',
            email: 'test@example.com',
            role: 'USER' as const,
          },
        },
      };

      mockPost.mockResolvedValue(mockResponse as any);

      await expect(authService.login('test@example.com', 'password')).rejects.toThrow('Invalid response from server');
    });

    it('throws error when user is missing in response', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'test-token',
        },
      };

      mockPost.mockResolvedValue(mockResponse as any);

      await expect(authService.login('test@example.com', 'password')).rejects.toThrow('Invalid response from server');
    });
  });
});

