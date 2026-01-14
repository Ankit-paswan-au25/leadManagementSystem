import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authStore } from '../store/auth.store';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background-secondary p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
            <p className="text-text-secondary">
              Welcome, {authStore.currentEmail} (Admin)
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Admin-Only Content
          </h2>
          <p className="text-text-secondary">
            This dashboard is only accessible to users with ADMIN role.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;

