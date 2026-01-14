import React, { useState, useEffect } from 'react';
import { leadsService } from '../../services/leads.service';
import { productService, type Product } from '../../services/product.service';
import type { Lead } from '../../types/lead.types';
import type { ValidationErrors } from '../../services/auth.service';
import AppModal from '../modal/AppModal';
import Button from '../ui/Button';
import ErrorAlert from '../alerts/ErrorAlert';
import SuccessAlert from '../alerts/SuccessAlert';
import axios from 'axios';

export interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSuccess?: () => void;
}

interface FormErrors {
  leadName?: string;
  email?: string;
  [key: string]: string | undefined;
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    leadName: '',
    companyName: '',
    email: '',
    phone: '',
    productId: '',
    nextFollowUpAt: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  // Load products when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Populate form when lead changes
  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        leadName: lead.leadName || '',
        companyName: lead.companyName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        productId: lead.productId || '',
        nextFollowUpAt: formatDateForInput(lead.nextFollowUpAt),
      });
      setErrors({});
      setAlert(null);
    }
  }, [lead, isOpen]);

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const productsList = await productService.getProducts();
      setProducts(productsList);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.leadName.trim()) {
      newErrors.leadName = 'Lead name is required';
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!validateForm()) {
      setAlert({
        type: 'error',
        message: 'Please fix the errors in the form',
      });
      return;
    }

    if (!lead) {
      setAlert({
        type: 'error',
        message: 'Lead not found',
      });
      return;
    }

    setIsLoading(true);
    setErrors({});

    // Build payload
    const payload: {
      leadName?: string;
      companyName?: string;
      email?: string;
      phone?: string;
      productId?: string | null;
      nextFollowUpAt?: string | null;
    } = {};

    // Only include fields that have changed
    if (formData.leadName !== lead.leadName) {
      payload.leadName = formData.leadName;
    }
    if (formData.companyName !== (lead.companyName || '')) {
      payload.companyName = formData.companyName || null;
    }
    if (formData.email !== lead.email) {
      payload.email = formData.email;
    }
    if (formData.phone !== (lead.phone || '')) {
      payload.phone = formData.phone || null;
    }
    if (formData.productId !== (lead.productId || '')) {
      payload.productId = formData.productId || null;
    }
    
    // Compare nextFollowUpAt
    const currentNextFollowUp = formatDateForInput(lead.nextFollowUpAt);
    if (formData.nextFollowUpAt !== currentNextFollowUp) {
      // Convert datetime-local format to ISO string, or null if empty
      if (formData.nextFollowUpAt) {
        payload.nextFollowUpAt = new Date(formData.nextFollowUpAt).toISOString();
      } else {
        payload.nextFollowUpAt = null;
      }
    }

    // If no changes, just close
    if (Object.keys(payload).length === 0) {
      setAlert({
        type: 'success',
        message: 'No changes to save',
      });
      setTimeout(() => {
        onClose();
      }, 1000);
      setIsLoading(false);
      return;
    }

    leadsService
      .updateLead(lead.id, payload)
      .then(() => {
        setAlert({
          type: 'success',
          message: 'Lead updated successfully!',
        });

        // Close modal and refresh after short delay
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      })
      .catch((error: unknown) => {
        // Handle validation errors (422) - show inline
        if (axios.isAxiosError(error) && error.response?.status === 422) {
          const validationErrors = (error.response.data as any)?.errors as ValidationErrors | undefined;

          if (validationErrors) {
            // Map backend validation errors to form errors
            const formErrors: FormErrors = {};
            Object.keys(validationErrors).forEach((key) => {
              formErrors[key] = validationErrors[key];
            });
            setErrors(formErrors);
            return; // Don't show generic ErrorAlert for validation errors
          }
        }

        // Handle other errors - show ErrorAlert
        const message = error instanceof Error ? error.message : 'Failed to update lead';
        setAlert({
          type: 'error',
          message,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (!lead) {
    return null;
  }

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Lead"
      size="xl"
      showCloseButton={!isLoading}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          {/* Alerts */}
          {alert && (
            <div>
              {alert.type === 'error' ? (
                <ErrorAlert message={alert.message} onClose={() => setAlert(null)} />
              ) : (
                <SuccessAlert message={alert.message} onClose={() => setAlert(null)} />
              )}
            </div>
          )}

          {/* Lead Information */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Lead Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="leadName" className="block text-sm font-medium text-text-primary mb-1">
                  Lead Name <span className="text-error-600">*</span>
                </label>
                <input
                  id="leadName"
                  type="text"
                  value={formData.leadName}
                  onChange={(e) => handleInputChange('leadName', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
                    errors.leadName
                      ? 'border-error-500 focus:ring-error-500'
                      : 'border-border-default'
                  }`}
                  placeholder="Enter lead name"
                  disabled={isLoading}
                />
                {errors.leadName && (
                  <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.leadName}</p>
                )}
              </div>

              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-text-primary mb-1">
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary"
                  placeholder="Enter company name"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                  Email <span className="text-error-600">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
                    errors.email
                      ? 'border-error-500 focus:ring-error-500'
                      : 'border-border-default'
                  }`}
                  placeholder="Enter email address"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-text-primary mb-1">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary"
                  placeholder="Enter phone number"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="productId" className="block text-sm font-medium text-text-primary mb-1">
                  Product
                </label>
                <select
                  id="productId"
                  value={formData.productId}
                  onChange={(e) => handleInputChange('productId', e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary"
                  disabled={isLoading || isLoadingProducts}
                >
                  <option value="">{isLoadingProducts ? 'Loading products...' : 'Select product (optional)'}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.productName} {product.productCode && `(${product.productCode})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="nextFollowUpAt" className="block text-sm font-medium text-text-primary mb-1">
                  Next Follow-up Date
                </label>
                <input
                  id="nextFollowUpAt"
                  type="datetime-local"
                  value={formData.nextFollowUpAt}
                  onChange={(e) => handleInputChange('nextFollowUpAt', e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary"
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-text-secondary">
                  Leave empty to clear the follow-up date
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-border-default">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
              Update Lead
            </Button>
          </div>
        </div>
      </form>
    </AppModal>
  );
};

export default EditLeadModal;

