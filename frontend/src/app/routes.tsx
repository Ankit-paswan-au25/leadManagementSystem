import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { authStore } from '../store/auth.store';
import Login from '../pages/Login';
import Register from '../pages/Register';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from '../components/routing/ProtectedRoute';
import Dashboard from '../pages/Dashboard';
import Leads from '../pages/Leads';
import CreateLead from '../pages/Leads/CreateLead';
import LeadDetail from '../pages/Leads/LeadDetail';
import CustomersList from '../pages/Customers/CustomersList';
import CustomerDetail from '../pages/Customers/CustomerDetail';
import Products from '../pages/Products';
import Integrations from '../pages/Integrations/Integrations';
import ActivityLogs from '../pages/ActivityLogs';
import Settings from '../pages/Settings';
import OwnershipRequests from '../pages/Admin/OwnershipRequests';
import NotificationsLog from '../pages/Notifications/NotificationsLog';

/**
 * Root redirect component
 * Redirects to appropriate route based on authentication status
 */
const RootRedirect: React.FC = () => {
  if (authStore.isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected routes with AppLayout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/create" element={<CreateLead />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="customers" element={<CustomersList />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="products" element={<Products />} />
        <Route path="integrations" element={<Integrations />} />
        <Route
          path="activity-logs"
          element={
            <ProtectedRoute allowedRoles="ADMIN">
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<NotificationsLog />} />
        <Route
          path="admin/ownership-requests"
          element={
            <ProtectedRoute allowedRoles="ADMIN">
              <OwnershipRequests />
            </ProtectedRoute>
          }
        />
      </Route>
      
      {/* Catch all - redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

