import React, { useState, useEffect } from 'react';
import { productService } from '../services/product.service';
import type { Product } from '../services/product.service';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Skeleton from '../components/ui/Skeleton';
import ErrorAlert from '../components/alerts/ErrorAlert';
import Button from '../components/ui/Button';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);

    productService
      .getProducts()
      .then((data) => {
        setProducts(data);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to load products';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const formatDuration = (durationType: string, defaultDuration?: number) => {
    if (durationType === 'NONE' || !defaultDuration) {
      return 'No expiry';
    }
    const durationText = defaultDuration === 1 
      ? durationType.slice(0, -1) // Remove 'S' from DAYS, MONTHS, YEARS
      : durationType.toLowerCase();
    return `${defaultDuration} ${durationText}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const columns: Array<{
    key: string;
    header: string;
    render?: (product: Product) => React.ReactNode;
    className?: string;
  }> = [
    {
      key: 'productName',
      header: 'Product Name',
      render: (product: Product) => (
        <div>
          <div className="font-medium text-text-primary">{product.productName}</div>
          <div className="text-sm text-text-secondary">{product.productCode}</div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (product: Product) => (
        <div className="text-text-secondary">{product.description || 'N/A'}</div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (product: Product) => (
        <div className="text-text-secondary">{product.category || 'N/A'}</div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (product: Product) => (
        <div className="text-text-secondary">
          {formatDuration(product.durationType, product.defaultDuration)}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (product: Product) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            product.isActive
              ? 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
          }`}
        >
          {product.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (product: Product) => (
        <div className="text-text-secondary">{formatDate(product.updatedAt)}</div>
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
          <Button onClick={loadProducts} variant="primary">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Products</h1>
        <p className="text-text-secondary mt-1">
          {products.length} {products.length === 1 ? 'product' : 'products'} available
        </p>
      </div>

      {/* Products Table */}
      <Card>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">No products found</p>
          </div>
        ) : (
          <Table
            data={products}
            columns={columns}
            emptyMessage="No products available"
          />
        )}
      </Card>
    </div>
  );
};

export default Products;
