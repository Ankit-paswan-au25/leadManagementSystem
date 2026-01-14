import React from 'react';
import { Navigate } from 'react-router-dom';
import { authStore } from '../../store/auth.store';
import type { UserRole } from '../../services/auth.service';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole | UserRole[];
  redirectTo?: string;
}

/**
 * ProtectedRoute component
 * - Redirects to login if not authenticated
 * - Blocks access if user role doesn't match allowedRoles
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/login',
}) => {
  // Check authentication
  if (!authStore.isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role if specified
  if (allowedRoles) {
    if (!authStore.hasRole(allowedRoles)) {
      // User is authenticated but doesn't have required role
      // Redirect to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;

