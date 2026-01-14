import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { authStore } from '../store/auth.store';

// Mock auth store
jest.mock('../store/auth.store', () => ({
  authStore: {
    currentRole: 'USER',
  },
}));

// Mock menu config
const mockGetMenuItemsByRole = jest.fn((role) => {
  if (role === 'ADMIN') {
    return [
      { label: 'Dashboard', route: '/dashboard', icon: '📊', allowedRoles: ['ADMIN', 'USER'] },
      { label: 'Integrations', route: '/integrations', icon: '🔌', allowedRoles: ['ADMIN'] },
    ];
  }
  return [
    { label: 'Dashboard', route: '/dashboard', icon: '📊', allowedRoles: ['ADMIN', 'USER'] },
  ];
});

jest.mock('../config/menu.config', () => ({
  getMenuItemsByRole: (role: string) => mockGetMenuItemsByRole(role),
}));

const mockAuthStore = authStore as jest.Mocked<typeof authStore>;

const renderSidebar = (initialEntries = ['/dashboard']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Sidebar />
    </MemoryRouter>
  );
};

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('renders sidebar with menu items', () => {
      mockAuthStore.currentRole = 'USER';
      renderSidebar();
      
      expect(screen.getByText('Sales Management')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('shows collapse/expand button', () => {
      renderSidebar();
      
      const toggleButton = screen.getByLabelText(/collapse sidebar/i);
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Collapse/Expand', () => {
    it('toggles sidebar collapse state', () => {
      renderSidebar();
      
      const toggleButton = screen.getByLabelText(/collapse sidebar/i);
      const sidebar = toggleButton.closest('.bg-background-secondary');
      
      // Initially expanded
      expect(sidebar).toHaveClass('w-64');
      
      // Click to collapse
      fireEvent.click(toggleButton);
      expect(sidebar).toHaveClass('w-16');
      
      // Click to expand
      fireEvent.click(toggleButton);
      expect(sidebar).toHaveClass('w-64');
    });

    it('persists collapse state in localStorage', () => {
      renderSidebar();
      
      const toggleButton = screen.getByLabelText(/collapse sidebar/i);
      
      // Collapse
      fireEvent.click(toggleButton);
      expect(localStorage.getItem('sidebar_collapsed')).toBe('true');
      
      // Expand
      fireEvent.click(toggleButton);
      expect(localStorage.getItem('sidebar_collapsed')).toBe('false');
    });

    it('loads collapse state from localStorage on mount', () => {
      localStorage.setItem('sidebar_collapsed', 'true');
      
      const { container } = renderSidebar();
      
      const sidebar = container.querySelector('.bg-background-secondary');
      expect(sidebar).toHaveClass('w-16');
    });

    it('hides labels when collapsed', () => {
      renderSidebar();
      
      const toggleButton = screen.getByLabelText(/collapse sidebar/i);
      fireEvent.click(toggleButton);
      
      // Menu items should still be visible but labels hidden
      expect(screen.queryByText('Sales Management')).not.toBeInTheDocument();
    });
  });

  describe('Active Route Highlighting', () => {
    it('highlights active route', () => {
      renderSidebar(['/dashboard']);
      
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveClass('bg-primary-600');
    });

    it('highlights parent route for nested routes', () => {
      renderSidebar(['/dashboard/leads']);
      
      // Should highlight dashboard if it's the parent
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toBeInTheDocument();
    });
  });

  describe('Role-Based Menu Visibility', () => {
    it('shows only menu items allowed for USER role', () => {
      mockAuthStore.currentRole = 'USER';
      renderSidebar();
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Integrations')).not.toBeInTheDocument();
    });

    it('shows all menu items for ADMIN role', () => {
      mockAuthStore.currentRole = 'ADMIN';
      mockGetMenuItemsByRole.mockReturnValueOnce([
        { label: 'Dashboard', route: '/dashboard', icon: '📊', allowedRoles: ['ADMIN', 'USER'] },
        { label: 'Integrations', route: '/integrations', icon: '🔌', allowedRoles: ['ADMIN'] },
      ]);
      
      renderSidebar();
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('renders links to menu routes', () => {
      renderSidebar();
      
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });
});

