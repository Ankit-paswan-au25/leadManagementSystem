/**
 * Auth Store Tests
 */

import { authStore } from '../store/auth.store';
import { authService } from '../services/auth.service';

// Mock auth service
jest.mock('../services/auth.service', () => ({
  authService: {
    login: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
    // Reset authStore state by calling logout
    authStore.logout();
  });

  describe('restoreSession', () => {
    it('restores session when token, role, and email exist in localStorage', () => {
      localStorage.setItem('auth_token', 'test-token-123');
      localStorage.setItem('auth_role', 'USER');
      localStorage.setItem('auth_email', 'test@example.com');
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          id: 'user-1',
          email: 'test@example.com',
          role: 'USER',
        })
      );

      authStore.restoreSession();

      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.getToken()).toBe('test-token-123');
      expect(authStore.currentRole).toBe('USER');
      expect(authStore.currentEmail).toBe('test@example.com');
    });

    it('does not restore session when token is missing', () => {
      localStorage.setItem('auth_role', 'USER');
      localStorage.setItem('auth_email', 'test@example.com');

      authStore.restoreSession();

      expect(authStore.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('does not restore session when role is missing', () => {
      localStorage.setItem('auth_token', 'test-token-123');
      localStorage.setItem('auth_email', 'test@example.com');

      authStore.restoreSession();

      expect(authStore.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('clears incomplete session data', () => {
      localStorage.setItem('auth_token', 'test-token-123');
      // Missing role and email

      authStore.restoreSession();

      expect(authStore.isAuthenticated).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_role')).toBeNull();
      expect(localStorage.getItem('auth_email')).toBeNull();
    });

    it('creates minimal user object when user is missing from storage', () => {
      localStorage.setItem('auth_token', 'test-token-123');
      localStorage.setItem('auth_role', 'ADMIN');
      localStorage.setItem('auth_email', 'admin@example.com');

      authStore.restoreSession();

      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.currentUser).toEqual({
        id: '',
        email: 'admin@example.com',
        role: 'ADMIN',
      });
    });
  });

  describe('setAuth', () => {
    it('sets authentication data and saves to localStorage', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER' as const,
      };

      authStore.setAuth('test-token-123', 'USER', user);

      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.getToken()).toBe('test-token-123');
      expect(authStore.currentRole).toBe('USER');
      expect(authStore.currentEmail).toBe('test@example.com');
      expect(authStore.currentUser).toEqual(user);

      expect(localStorage.getItem('auth_token')).toBe('test-token-123');
      expect(localStorage.getItem('auth_role')).toBe('USER');
      expect(localStorage.getItem('auth_email')).toBe('test@example.com');
      expect(JSON.parse(localStorage.getItem('auth_user')!)).toEqual(user);
    });
  });

  describe('login', () => {
    it('calls authService.login and sets auth data', async () => {
      const mockResponse = {
        token: 'test-token-123',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: 'USER' as const,
        },
        role: 'USER' as const,
        email: 'test@example.com',
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      const result = await authStore.login('test@example.com', 'password123');

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(authStore.isAuthenticated).toBe(true);
      expect(authStore.getToken()).toBe('test-token-123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('logout', () => {
    it('clears authentication data and localStorage', () => {
      // Set up authenticated state
      authStore.setAuth('test-token', 'USER', {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER',
      });

      authStore.logout();

      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.getToken()).toBeNull();
      expect(authStore.currentRole).toBeNull();
      expect(authStore.currentEmail).toBeNull();
      expect(authStore.currentUser).toBeNull();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_role')).toBeNull();
      expect(localStorage.getItem('auth_email')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });
  });

  describe('hasRole', () => {
    beforeEach(() => {
      authStore.setAuth('test-token', 'USER', {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER',
      });
    });

    it('returns true for matching role', () => {
      expect(authStore.hasRole('USER')).toBe(true);
    });

    it('returns false for non-matching role', () => {
      expect(authStore.hasRole('ADMIN')).toBe(false);
    });

    it('returns true when role is in array', () => {
      expect(authStore.hasRole(['USER', 'ADMIN'])).toBe(true);
    });

    it('returns false when role is not in array', () => {
      expect(authStore.hasRole(['ADMIN'])).toBe(false);
    });

    it('returns false when not authenticated', () => {
      authStore.logout();
      expect(authStore.hasRole('USER')).toBe(false);
    });
  });
});

