import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersService } from '../../services/customers.service';
import type { Customer } from '../../types/customer.types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Skeleton from '../../components/ui/Skeleton';
import ErrorAlert from '../../components/alerts/ErrorAlert';
import StatusBadge from '../../components/ui/StatusBadge';

const CustomersList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    setError(null);

    customersService
      .getCustomers()
      .then((data) => {
        setCustomers(data);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load customers';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Map customer status to lead status format for StatusBadge compatibility
  const mapCustomerStatusToLeadStatus = (status: Customer['status']): 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'LOST' | 'WON' => {
    switch (status) {
      case 'ACTIVE':
        return 'QUALIFIED';
      case 'INACTIVE':
        return 'LOST';
      case 'CHURNED':
        return 'LOST';
      default:
        return 'NEW';
    }
  };

  const columns: Array<{
    key: string;
    header: string;
    render?: (customer: Customer) => React.ReactNode;
  }> = [
    {
      key: 'customerName',
      header: 'Customer Name',
      render: (customer: Customer) => (
        <div className="font-medium text-text-primary">{customer.customerName}</div>
      ),
    },
    {
      key: 'companyName',
      header: 'Company',
      render: (customer: Customer) => (
        <div className="text-text-secondary">{customer.companyName}</div>
      ),
    },
    {
      key: 'primaryEmail',
      header: 'Email',
      render: (customer: Customer) => (
        <a
          href={`mailto:${customer.primaryEmail}`}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {customer.primaryEmail}
        </a>
      ),
    },
    {
      key: 'accountOwnerName',
      header: 'Account Owner',
      render: (customer: Customer) => (
        <div className="text-text-secondary">{customer.accountOwnerName}</div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (customer: Customer) => (
        <StatusBadge status={mapCustomerStatusToLeadStatus(customer.status)} />
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorAlert message={error} onClose={() => setError(null)} />
        <Card>
          <button
            onClick={loadCustomers}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Customers</h1>
          <p className="text-text-secondary mt-1">
            {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
          </p>
        </div>
      </div>

      {/* Table */}
      <Card>
        {customers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">No customers found</p>
          </div>
        ) : (
          <Table
            data={customers}
            columns={columns}
            onRowClick={(customer) => navigate(`/dashboard/customers/${customer.id}`)}
          />
        )}
      </Card>
    </div>
  );
};

export default CustomersList;
