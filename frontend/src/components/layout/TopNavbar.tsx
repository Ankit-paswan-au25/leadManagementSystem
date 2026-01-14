import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../app/Providers';
import { authStore } from '../../store/auth.store';
import { menuItems } from '../../config/menu.config';

const TopNavbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const userEmail = authStore.currentEmail;
  const userRole = authStore.currentRole;

  // Get page title based on current route
  const getPageTitle = (): string => {
    const pathname = location.pathname;

    // Handle special cases for detail pages first (more specific routes)
    if (pathname.match(/^\/dashboard\/leads\/create$/)) {
      return 'Create Lead';
    }
    if (pathname.match(/^\/dashboard\/leads\/[^/]+$/)) {
      return 'Lead Details';
    }
    if (pathname.match(/^\/dashboard\/customers\/[^/]+$/)) {
      return 'Customer Details';
    }

    // Find matching menu item based on route (sort by route length desc to match longest first)
    const sortedMenuItems = [...menuItems].sort((a, b) => b.route.length - a.route.length);

    const matchingItem = sortedMenuItems.find((item) => {
      // Exact match
      if (pathname === item.route) {
        return true;
      }
      // Check if pathname starts with the menu item route (for nested routes)
      // But make sure it's not just a partial match (e.g., /dashboard/lead should not match /dashboard/leads)
      if (pathname.startsWith(`${item.route}/`)) {
        return true;
      }
      return false;
    });

    if (matchingItem) {
      return matchingItem.label;
    }

    // Check exact dashboard index match last
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return 'Dashboard';
    }

    // Default fallback
    return 'Dashboard';
  };

  const pageTitle = getPageTitle();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  return (
    <div className="bg-background-primary border-b border-border-default px-6 py-4 flex items-center justify-between">
      {/* Page Title - Dynamic based on route */}
      <h1 className="text-xl font-semibold text-text-primary">{pageTitle}</h1>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-background-secondary transition-colors text-text-secondary hover:text-text-primary"
          aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
        >
          {mode === 'light' ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          )}
        </button>

        {/* Notifications (Placeholder) */}
        <button
          className="p-2 rounded-lg hover:bg-background-secondary transition-colors text-text-secondary hover:text-text-primary relative"
          aria-label="Notifications"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-background-secondary transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
              {userEmail?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-text-primary">{userEmail || 'User'}</p>
              <p className="text-xs text-text-secondary">{userRole || 'Unknown'}</p>
            </div>
            <svg
              className={`w-4 h-4 text-text-secondary transition-transform ${showUserMenu ? 'rotate-180' : ''
                }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-background-primary rounded-lg shadow-lg border border-border-default py-1 z-50">
              <div className="px-4 py-2 border-b border-border-default">
                <p className="text-sm font-medium text-text-primary">{userEmail || 'User'}</p>
                <p className="text-xs text-text-secondary">{userRole || 'Unknown'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-background-secondary transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;

