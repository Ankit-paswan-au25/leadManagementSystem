import React from 'react';
import Card from '../components/ui/Card';

const Customers: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Customers</h2>
        <p className="text-text-secondary">
          Customer management page. Coming soon.
        </p>
      </Card>
    </div>
  );
};

export default Customers;

