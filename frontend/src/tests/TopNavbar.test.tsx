import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import TopNavbar from '../components/layout/TopNavbar';
import { authStore } from '../store/auth.store';
import { useTheme } from '../app/Providers';

// Mock auth store
jest.mock('../store/auth.store', () => ({
  authStore: {
    currentEmail: 'user@example.com',
    currentRole: 'USER',
    logout: jest.fn(),
  },
}));

// Mock useTheme
const mockToggleTheme = jest.fn();
jest.mock('../app/Providers', () => ({
  useTheme: jest.fn(() => ({
    mode: 'light',
    toggleTheme: mockToggleTheme,
  })),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockAuthStore = authStore as jest.Mocked<typeof authStore>;

const renderTopNavbar = () => {
  return render(
    <BrowserRouter>
      <TopNavbar />
    </BrowserRouter>
  );
};

describe('TopNavbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockAuthStore.currentEmail = 'user@example.com';
    mockAuthStore.currentRole = 'USER';
    (useTheme as jest.Mock).mockReturnValue({
      mode: 'light',
      toggleTheme: mockToggleTheme,
    });
  });

  describe('Rendering', () => {
    it('renders page title', () => {
      renderTopNavbar();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders user email and role', () => {
      mockAuthStore.currentEmail = 'admin@example.com';
      mockAuthStore.currentRole = 'ADMIN';
      
      renderTopNavbar();
      
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    it('renders theme toggle button', () => {
      renderTopNavbar();
      
      const themeButton = screen.getByLabelText(/switch to dark mode/i);
      expect(themeButton).toBeInTheDocument();
    });

    it('renders notifications button', () => {
      renderTopNavbar();
      
      const notificationsButton = screen.getByLabelText('Notifications');
      expect(notificationsButton).toBeInTheDocument();
    });

    it('renders user menu button', () => {
      renderTopNavbar();
      
      // User email might be hidden on small screens, so check for avatar instead
      const avatar = screen.getByText('U');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('Theme Toggle', () => {
    it('calls toggleTheme when theme button is clicked', () => {
      renderTopNavbar();
      
      const themeButton = screen.getByLabelText(/switch to dark mode/i);
      fireEvent.click(themeButton);
      
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('shows correct icon for light mode', () => {
      (useTheme as jest.Mock).mockReturnValue({
        mode: 'light',
        toggleTheme: mockToggleTheme,
      });
      
      renderTopNavbar();
      
      const themeButton = screen.getByLabelText(/switch to dark mode/i);
      expect(themeButton).toBeInTheDocument();
    });

    it('shows correct icon for dark mode', () => {
      (useTheme as jest.Mock).mockReturnValue({
        mode: 'dark',
        toggleTheme: mockToggleTheme,
      });
      
      renderTopNavbar();
      
      const themeButton = screen.getByLabelText(/switch to light mode/i);
      expect(themeButton).toBeInTheDocument();
    });
  });

  describe('User Menu Dropdown', () => {
    it('opens dropdown when user button is clicked', () => {
      renderTopNavbar();
      
      // Find button by avatar
      const avatar = screen.getByText('U');
      const userButton = avatar.closest('button');
      fireEvent.click(userButton!);
      
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      renderTopNavbar();
      
      const avatar = screen.getByText('U');
      const userButton = avatar.closest('button');
      fireEvent.click(userButton!);
      
      expect(screen.getByText('Logout')).toBeInTheDocument();
      
      // Click outside
      fireEvent.mouseDown(document.body);
      
      await waitFor(() => {
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
      });
    });

    it('shows user email and role in dropdown', () => {
      mockAuthStore.currentEmail = 'test@example.com';
      mockAuthStore.currentRole = 'ADMIN';
      
      renderTopNavbar();
      
      const avatar = screen.getByText('T');
      const userButton = avatar.closest('button');
      fireEvent.click(userButton!);
      
      // Check for email in dropdown (there will be two instances - one in button, one in dropdown)
      const emails = screen.getAllByText('test@example.com');
      expect(emails.length).toBeGreaterThan(0);
      // Check for role (there will be two instances - one in button, one in dropdown)
      const roles = screen.getAllByText('ADMIN');
      expect(roles.length).toBeGreaterThan(0);
    });
  });

  describe('Logout', () => {
    it('calls logout and navigates to login when logout is clicked', () => {
      renderTopNavbar();
      
      const avatar = screen.getByText('U');
      const userButton = avatar.closest('button');
      fireEvent.click(userButton!);
      
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      expect(mockAuthStore.logout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('User Avatar', () => {
    it('shows first letter of email as avatar', () => {
      mockAuthStore.currentEmail = 'admin@example.com';
      
      renderTopNavbar();
      
      const avatar = screen.getByText('A');
      expect(avatar).toBeInTheDocument();
    });

    it('shows "U" as avatar when email is not available', () => {
      mockAuthStore.currentEmail = null;
      
      renderTopNavbar();
      
      const avatar = screen.getByText('U');
      expect(avatar).toBeInTheDocument();
    });
  });
});

