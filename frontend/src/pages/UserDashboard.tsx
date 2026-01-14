import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authStore } from '../store/auth.store';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const UserDashboard: React.FC = () => {
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
            <h1 className="text-3xl font-bold text-text-primary mb-2">User Dashboard</h1>
            <p className="text-text-secondary">
              Welcome, {authStore.currentEmail} (User)
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            User Dashboard
          </h2>
          <p className="text-text-secondary">
            This dashboard is accessible to all authenticated users.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default UserDashboard;

