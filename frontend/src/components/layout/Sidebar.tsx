import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authStore } from '../../store/auth.store';
import { getMenuItemsByRole } from '../../config/menu.config';

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved === 'true';
  });

  const role = authStore.currentRole;
  const menuItems = getMenuItemsByRole(role);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div
      className={`bg-background-secondary border-r border-border-default transition-all duration-300 flex flex-col ${isCollapsed ? 'w-16' : 'w-64'
        }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border-default flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-text-primary">Sales Management</h2>
        )}
        <button
          onClick={toggleCollapse}
          className="p-2 rounded-lg hover:bg-background-tertiary transition-colors text-text-secondary hover:text-text-primary"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
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
                d="M9 5l7 7-7 7"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            // Determine if this menu item is active based on current route
            let isActive = false;

            if (item.route === '/dashboard') {
              // Dashboard should only be active on exact match (not on sub-routes)
              isActive = location.pathname === '/dashboard' || location.pathname === '/dashboard/';
            } else {
              // Other routes: match if pathname starts with the route (for nested routes)
              // But exclude exact dashboard match
              isActive =
                location.pathname === item.route ||
                location.pathname.startsWith(`${item.route}/`);
            }

            return (
              <li key={item.route}>
                <Link
                  to={item.route}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
                    }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="font-medium truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;

