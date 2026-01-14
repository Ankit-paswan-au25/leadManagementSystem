import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authStore } from '../../store/auth.store';
import { customersService } from '../../services/customers.service';
import type { Customer, CustomerProduct } from '../../types/customer.types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import ExpiryBadge from '../../components/ui/ExpiryBadge';
import Skeleton from '../../components/ui/Skeleton';
import ErrorAlert from '../../components/alerts/ErrorAlert';
import AssignProductModal from '../../components/Customers/AssignProductModal';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const isAdmin = authStore.currentRole === 'ADMIN';

  useEffect(() => {
    if (id) {
      loadCustomerData();
    } else {
      setError('Customer ID is required');
      setIsLoading(false);
    }
  }, [id]);

  const loadCustomerData = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);
    setIsLoadingProducts(true);
    setProductsError(null);

    // Fetch customer detail and products in parallel
    Promise.all([
      customersService.getCustomerById(id).catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load customer');
        throw err;
      }),
      customersService.getCustomerProducts(id).catch((err) => {
        setProductsError(err instanceof Error ? err.message : 'Failed to load products');
        return [];
      }),
    ])
      .then(([customerData, productsData]) => {
        setCustomer(customerData);
        setProducts(productsData);
      })
      .catch(() => {
        // Errors already set in catch blocks above
      })
      .finally(() => {
        setIsLoading(false);
        setIsLoadingProducts(false);
      });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <ErrorAlert message={error || 'Customer not found'} onClose={() => navigate('/dashboard/customers')} />
        <Card>
          <Button onClick={() => navigate('/dashboard/customers')} variant="primary">
            Back to Customers
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/dashboard/customers')}
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-sm font-medium mb-2"
          >
            ← Back to Customers
          </button>
          <h1 className="text-2xl font-semibold text-text-primary">{customer.customerName}</h1>
          <p className="text-text-secondary mt-1">{customer.companyName || 'No company'}</p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={() => setAssignModalOpen(true)}>
            Assign Product
          </Button>
        )}
      </div>

      {/* Customer Details */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Customer Name</label>
            <p className="text-text-primary">{customer.customerName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Company</label>
            <p className="text-text-primary">{customer.companyName || 'N/A'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
            <a
              href={`mailto:${customer.primaryEmail}`}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              {customer.primaryEmail}
            </a>
          </div>

          {customer.phone && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
              <p className="text-text-primary">{customer.phone}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
            <StatusBadge status={customer.status === 'ACTIVE' ? 'QUALIFIED' : customer.status === 'INACTIVE' ? 'LOST' : 'NEW'} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Account Owner</label>
            <p className="text-text-primary">{customer.accountOwnerName}</p>
          </div>
        </div>
      </Card>

      {/* Products */}
      <Card>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Products</h2>

        {productsError && (
          <div className="mb-4">
            <ErrorAlert message={productsError} onClose={() => setProductsError(null)} />
          </div>
        )}

        {isLoadingProducts ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">No products assigned</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product, index) => (
              <div
                key={index}
                className="border border-border-default rounded-lg p-4 hover:bg-background-secondary transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-text-primary">{product.productName}</h3>
                      <StatusBadge status={product.status === 'ACTIVE' ? 'QUALIFIED' : product.status === 'EXPIRED' ? 'LOST' : 'NEW'} />
                      <ExpiryBadge
                        status={product.status}
                        daysRemaining={product.daysRemaining}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <label className="block text-text-secondary mb-1">Category</label>
                        <p className="text-text-primary">{product.category || 'N/A'}</p>
                      </div>

                      <div>
                        <label className="block text-text-secondary mb-1">Start Date</label>
                        <p className="text-text-primary">
                          {product.startDate
                            ? new Date(product.startDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-text-secondary mb-1">Expiry Date</label>
                        <p className="text-text-primary">
                          {product.expiryDate
                            ? new Date(product.expiryDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {product.daysRemaining !== undefined && product.daysRemaining !== null && (
                      <div className="mt-2 text-sm text-text-secondary">
                        {product.daysRemaining > 0
                          ? `${product.daysRemaining} days remaining`
                          : product.daysRemaining === 0
                          ? 'Expires today'
                          : `Expired ${Math.abs(product.daysRemaining)} days ago`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Assign Product Modal */}
      {customer && (
        <AssignProductModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          customerId={customer.id}
          customerName={customer.customerName}
          onSuccess={() => {
            // Refresh products list after successful assignment
            if (id) {
              customersService
                .getCustomerProducts(id)
                .then((productsData) => {
                  setProducts(productsData);
                })
                .catch(() => {
                  // Silent failure - products will be refreshed on next load
                });
            }
          }}
        />
      )}
    </div>
  );
};

export default CustomerDetail;
