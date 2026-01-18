import { get, post } from './httpClient';
import type { ApiResponse } from './httpClient';
import axios, { AxiosError } from 'axios';

export type UserRole = 'ADMIN' | 'USER';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  role: UserRole;
  email: string;
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken?: string;
  user?: User;
  role: UserRole;
}

/**
 * Validation errors from backend
 */
export interface ValidationErrors {
  [field: string]: string;
}

/**
 * Auth Service
 * Handles authentication API calls
 * Errors are handled by httpClient interceptor - this service just throws errors
 */
export const authService = {
  /**
   * Login user
   * @param email User email
   * @param password User password
   * @returns Login response with token and user data
   * @throws AxiosError with validation errors in error.response.data.errors for 422
   * @throws Error for other failures
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await post<{ token: string; user: User }>('/auth/login', {
        email,
        password,
      });

      // Backend returns { status: 'success', message, data }
      // Check for status field from backend response
      const backendResponse = response as any;
      const isSuccess = backendResponse.status === 'success' || response.success === true;
      
      if (!isSuccess || !response.data) {
        throw new Error(response.message || 'Login failed');
      }

      // Transform backend response to match LoginResponse interface
      const { token, user } = response.data;

      if (!token || !user || !user.role || !user.email) {
        throw new Error('Invalid response from server');
      }

      return {
        token,
        user,
        role: user.role,
        email: user.email,
        refreshToken: (response.data as any).refreshToken,
      };
    } catch (error) {
      // Handle AxiosError
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string> }>;
        const status = axiosError.response?.status;
        const errorData = axiosError.response?.data;

        // Handle 401 - Invalid credentials
        if (status === 401) {
          const message = errorData?.message || 'Invalid email or password';
          throw new Error(message);
        }

        // Handle 403 - Account disabled
        if (status === 403) {
          const message = errorData?.message || 'Account is not active. Please contact administrator.';
          throw new Error(message);
        }

        // Handle 422 - Validation errors
        if (status === 422) {
          if (errorData?.errors) {
            const errorMessages = Object.values(errorData.errors).join(', ');
            throw new Error(errorMessages || errorData?.message || 'Validation failed');
          }
          throw new Error(errorData?.message || 'Validation failed');
        }

        // Handle other HTTP errors
        if (errorData?.message) {
          throw new Error(errorData.message);
        }

        // Handle network/timeout errors
        if (axiosError.code === 'ECONNABORTED' || (axiosError.message && axiosError.message.includes('timeout'))) {
          throw new Error('Request timed out. Please try again.');
        }

        if (!axiosError.response) {
          throw new Error('Network error. Please check your connection and try again.');
        }

        throw new Error(errorData?.message || 'Login failed. Please try again.');
      }

      // Re-throw if it's already an Error
      if (error instanceof Error) {
        throw error;
      }

      // Handle unknown error types
      throw new Error('Login failed. Please try again.');
    }
  },

  /**
   * Register new user
   * @param name User name
   * @param email User email
   * @param password User password
   * @returns Register response with user data
   * @throws AxiosError with validation errors in error.response.data.errors for 422
   * @throws Error for other failures
   */
  async register(name: string, email: string, password: string): Promise<RegisterResponse> {
    const response = await post<{ user: User; message: string }>('/auth/register', {
      name,
      email,
      password,
    });

    // Backend returns { status: 'success', message, data }
    const backendResponse = response as any;
    const isSuccess = backendResponse.status === 'success' || response.success === true;
    
    if (!isSuccess || !response.data) {
      throw new Error(response.message || 'Registration failed');
    }

    const { user, message } = response.data;

    if (!user || !user.email) {
      throw new Error('Invalid response from server');
    }

    return {
      user,
      message: message || 'Registration successful. Your account is pending activation.',
    };
  },

  /**
   * Refresh access token using refresh token
   * @param refreshToken Refresh token
   * @returns New access token and optional refresh token
   * @throws Error if refresh fails
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    // Use axios directly to avoid interceptor loops
    // Create a separate axios instance without interceptors
    const baseURL = getBaseURL();
    
    const response = await axios.post(
      `${baseURL}/auth/refresh`,
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        // Don't use httpClient to avoid interceptor loops
      }
    );

    const data = response.data;

    if (!data.success || !data.data || !data.data.token) {
      throw new Error(data.message || 'Token refresh failed');
    }

    const { token, refreshToken: newRefreshToken, user, role } = data.data;

    if (!token || !role) {
      throw new Error('Invalid response from server');
    }

    return {
      token,
      refreshToken: newRefreshToken,
      user,
      role,
    };
  },

  /**
   * Get all active users
   * @returns Array of active users
   */
  async getUsers(): Promise<User[]> {
    const response = await get<any>('/auth/users');

    // Handle backend format: { status: 'success', data: [...] }
    if (response.status === 'success' && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }

    // Handle ApiResponse format: { success: true, data: [...] }
    if (response.success === true && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }

    console.error('Invalid users response format:', response);
    throw new Error(response.message || 'Failed to fetch users');
  },
};

/**
 * Get base URL for API calls (duplicated from httpClient to avoid circular dependency)
 */
function getBaseURL(): string {
  // Check process.env first (works in both Node/Jest and can be set for Vite)
  if (typeof process !== 'undefined' && process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  
  // Default fallback (use same-origin proxy on prod)
  return '/api';
}
