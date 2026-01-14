import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import { authStore } from '../store/auth.store';

// Mock auth store
jest.mock('../store/auth.store', () => ({
  authStore: {
    isAuthenticated: false,
    currentRole: null,
    hasRole: jest.fn(),
  },
}));

const mockAuthStore = authStore as jest.Mocked<typeof authStore>;

const TestComponent: React.FC = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Check', () => {
    it('redirects to login when user is not authenticated', () => {
      mockAuthStore.isAuthenticated = false;
      
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      // Should redirect, so protected content should not be visible
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('allows access when user is authenticated', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.hasRole.mockReturnValue(true);
      
      const { getByText } = render(
        <BrowserRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </BrowserRouter>
      );
      
      expect(getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access', () => {
    it('allows access when user has required role (single role)', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.currentRole = 'ADMIN';
      mockAuthStore.hasRole.mockReturnValue(true);
      
      const { getByText } = render(
        <BrowserRouter>
          <ProtectedRoute allowedRoles="ADMIN">
            <TestComponent />
          </ProtectedRoute>
        </BrowserRouter>
      );
      
      expect(getByText('Protected Content')).toBeInTheDocument();
      expect(mockAuthStore.hasRole).toHaveBeenCalledWith('ADMIN');
    });

    it('allows access when user has one of the required roles (multiple roles)', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.currentRole = 'USER';
      mockAuthStore.hasRole.mockReturnValue(true);
      
      const { getByText } = render(
        <BrowserRouter>
          <ProtectedRoute allowedRoles={['ADMIN', 'USER']}>
            <TestComponent />
          </ProtectedRoute>
        </BrowserRouter>
      );
      
      expect(getByText('Protected Content')).toBeInTheDocument();
      expect(mockAuthStore.hasRole).toHaveBeenCalledWith(['ADMIN', 'USER']);
    });

    it('blocks access when user does not have required role', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.currentRole = 'USER';
      mockAuthStore.hasRole.mockReturnValue(false);
      
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute allowedRoles="ADMIN">
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(mockAuthStore.hasRole).toHaveBeenCalledWith('ADMIN');
      // Should redirect, content not visible
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('allows access when no allowedRoles specified and user is authenticated', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.currentRole = 'USER';
      
      const { getByText } = render(
        <BrowserRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </BrowserRouter>
      );
      
      expect(getByText('Protected Content')).toBeInTheDocument();
      expect(mockAuthStore.hasRole).not.toHaveBeenCalled();
    });
  });

  describe('Custom Redirect', () => {
    it('uses custom redirectTo path', () => {
      mockAuthStore.isAuthenticated = false;
      
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute redirectTo="/custom-login">
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      // Should redirect to custom path, content not visible
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null role gracefully', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.currentRole = null;
      mockAuthStore.hasRole.mockReturnValue(false);
      
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute allowedRoles="ADMIN">
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(mockAuthStore.hasRole).toHaveBeenCalled();
    });

    it('works with empty allowedRoles array', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.currentRole = 'USER';
      mockAuthStore.hasRole.mockReturnValue(false);
      
      render(
        <MemoryRouter initialEntries={['/protected']}>
          <ProtectedRoute allowedRoles={[]}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      );
      
      expect(mockAuthStore.hasRole).toHaveBeenCalledWith([]);
    });
  });
});

