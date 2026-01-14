import type { UserRole } from '../services/auth.service';

export interface MenuItem {
  label: string;
  route: string;
  icon: string;
  allowedRoles: UserRole[];
}

export const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    route: '/dashboard',
    icon: '📊',
    allowedRoles: ['ADMIN', 'USER'],
  },
  {
    label: 'Leads',
    route: '/dashboard/leads',
    icon: '🎯',
    allowedRoles: ['ADMIN', 'USER'],
  },
  {
    label: 'Customers',
    route: '/dashboard/customers',
    icon: '👥',
    allowedRoles: ['ADMIN', 'USER'],
  },
  {
    label: 'Products',
    route: '/dashboard/products',
    icon: '📦',
    allowedRoles: ['ADMIN', 'USER'],
  },
  {
    label: 'Integrations',
    route: '/dashboard/integrations',
    icon: '🔌',
    allowedRoles: ['ADMIN', 'USER'],
  },
  {
    label: 'Activity Logs',
    route: '/dashboard/activity-logs',
    icon: '📋',
    allowedRoles: ['ADMIN'],
  },
  {
    label: 'Ownership Requests',
    route: '/dashboard/admin/ownership-requests',
    icon: '🔄',
    allowedRoles: ['ADMIN'],
  },
  {
    label: 'Notifications',
    route: '/dashboard/notifications',
    icon: '🔔',
    allowedRoles: ['ADMIN', 'USER'],
  },
  {
    label: 'Settings',
    route: '/dashboard/settings',
    icon: '⚙️',
    allowedRoles: ['ADMIN', 'USER'],
  },
];

/**
 * Get menu items filtered by user role
 */
export const getMenuItemsByRole = (role: UserRole | null): MenuItem[] => {
  if (!role) return [];
  return menuItems.filter((item) => item.allowedRoles.includes(role));
};

