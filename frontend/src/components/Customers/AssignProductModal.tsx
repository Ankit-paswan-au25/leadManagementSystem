import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { productService, type AssignProductPayload } from '../../services/product.service';
import AppModal from '../modal/AppModal';
import Button from '../ui/Button';
import ErrorAlert from '../alerts/ErrorAlert';
import SuccessAlert from '../alerts/SuccessAlert';

interface AssignProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onSuccess?: () => void;
}

// Mock product list - in real app, this would come from a products API
const AVAILABLE_PRODUCTS = [
  { id: 'prod-1', name: 'Premium Support', durationMonths: 12 },
  { id: 'prod-2', name: 'Enterprise License', durationMonths: 6 },
  { id: 'prod-3', name: 'Basic Plan', durationMonths: 3 },
  { id: 'prod-4', name: 'Professional License', durationMonths: 12 },
];

interface FormErrors {
  productId?: string;
  startDate?: string;
}

const AssignProductModal: React.FC<AssignProductModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  onSuccess,
}) => {
  const [productId, setProductId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setProductId('');
      setStartDate('');
      setExpiryDate(null);
      setErrors({});
      setApiError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // Calculate preview expiry date when product or start date changes
  useEffect(() => {
    if (productId && startDate) {
      const product = AVAILABLE_PRODUCTS.find((p) => p.id === productId);
      if (product) {
        const start = new Date(startDate);
        const expiry = new Date(start);
        expiry.setMonth(expiry.getMonth() + product.durationMonths);
        setExpiryDate(expiry.toISOString().split('T')[0]);
      }
    } else {
      setExpiryDate(null);
    }
  }, [productId, startDate]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!productId) {
      newErrors.productId = 'Product is required';
    }
    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    const payload: AssignProductPayload = {
      productId,
      startDate: new Date(startDate).toISOString(),
    };

    productService
      .assignProduct(customerId, payload)
      .then((response) => {
        setSuccessMessage('Product assigned successfully');
        onSuccess?.();
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 1500);
      })
      .catch((err: unknown) => {
        // Handle validation errors (422) - show inline
        if (axios.isAxiosError(err) && err.response?.status === 422) {
          const validationErrors = (err.response.data as any)?.errors;
          if (validationErrors) {
            const formErrors: FormErrors = {};
            Object.keys(validationErrors).forEach((key) => {
              formErrors[key as keyof FormErrors] = validationErrors[key];
            });
            setErrors(formErrors);
            return;
          }
        }
        // Handle other API errors
        const message = err instanceof Error ? err.message : 'Failed to assign product';
        setApiError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleClose = () => {
    if (!isLoading) {
      setProductId('');
      setStartDate('');
      setExpiryDate(null);
      setErrors({});
      setApiError(null);
      setSuccessMessage(null);
      onClose();
    }
  };

  return (
    <AppModal isOpen={isOpen} onClose={handleClose} title="Assign Product">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-text-secondary mb-4">
            Assigning product to: <span className="font-medium">{customerName}</span>
          </p>
        </div>

        {apiError && <ErrorAlert message={apiError} onClose={() => setApiError(null)} />}
        {successMessage && (
          <SuccessAlert message={successMessage} onClose={() => setSuccessMessage(null)} />
        )}

        <div>
          <label htmlFor="product" className="block text-sm font-medium text-text-primary mb-1">
            Product <span className="text-error-600">*</span>
          </label>
          <select
            id="product"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              if (errors.productId) {
                setErrors((prev) => ({ ...prev, productId: undefined }));
              }
            }}
            disabled={isLoading}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
              errors.productId
                ? 'border-error-500 focus:ring-error-500'
                : 'border-border-default'
            }`}
          >
            <option value="">Select product...</option>
            {AVAILABLE_PRODUCTS.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.durationMonths} months)
              </option>
            ))}
          </select>
          {errors.productId && (
            <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.productId}</p>
          )}
        </div>

        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-text-primary mb-1">
            Start Date <span className="text-error-600">*</span>
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (errors.startDate) {
                setErrors((prev) => ({ ...prev, startDate: undefined }));
              }
            }}
            disabled={isLoading}
            min={new Date().toISOString().split('T')[0]}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
              errors.startDate
                ? 'border-error-500 focus:ring-error-500'
                : 'border-border-default'
            }`}
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.startDate}</p>
          )}
        </div>

        {expiryDate && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Estimated Expiry Date (Preview)
            </label>
            <div className="px-4 py-2 bg-background-secondary rounded-lg text-text-primary">
              {new Date(expiryDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <p className="mt-1 text-xs text-text-tertiary">
              Actual expiry date will be calculated by the backend
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
            Assign Product
          </Button>
        </div>
      </form>
    </AppModal>
  );
};

export default AssignProductModal;

