import React, { useState, useEffect } from 'react';
import { authStore } from '../../store/auth.store';
import { leadsService } from '../../services/leads.service';
import { productService, type Product } from '../../services/product.service';
import { authService, type User } from '../../services/auth.service';
import { calculateNextFollowUp, formatFollowUpDate } from '../../utils/scheduleCalculator';
import type { ScheduleConfig, FrequencyType } from '../../types/schedule.types';
import type { ValidationErrors } from '../../services/auth.service';
import AppModal from '../modal/AppModal';
import Button from '../ui/Button';
import ErrorAlert from '../alerts/ErrorAlert';
import SuccessAlert from '../alerts/SuccessAlert';
import axios from 'axios';

export interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormErrors {
  leadName?: string;
  email?: string;
  ownerId?: string;
  schedule?: string;
  frequencyValue?: string;
  [key: string]: string | undefined;
}

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const isAdmin = authStore.currentRole === 'ADMIN';
  const currentUser = authStore.currentUser;

  const [formData, setFormData] = useState({
    leadName: '',
    companyName: '',
    email: '',
    phone: '',
    ownerId: isAdmin ? '' : currentUser?.id || '',
    productId: '',
  });

  const [schedule, setSchedule] = useState<ScheduleConfig>({
    frequencyType: 'WEEKLY',
    frequencyValue: undefined,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<{ date: Date; description: string } | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        leadName: '',
        companyName: '',
        email: '',
        phone: '',
        ownerId: isAdmin ? '' : currentUser?.id || '',
        productId: '',
      });
      setSchedule({
        frequencyType: 'WEEKLY',
        frequencyValue: undefined,
      });
      setErrors({});
      setAlert(null);
      setSchedulePreview(null);
    }
  }, [isOpen, isAdmin, currentUser?.id]);

  // Calculate schedule preview when schedule changes
  useEffect(() => {
    if (!isOpen) return;
    
    try {
      if (schedule.frequencyType === 'CUSTOM' && (!schedule.frequencyValue || schedule.frequencyValue <= 0)) {
        setSchedulePreview(null);
        return;
      }
      const preview = calculateNextFollowUp(schedule);
      setSchedulePreview({
        date: preview.nextFollowUpDate,
        description: preview.description,
      });
    } catch (error) {
      setSchedulePreview(null);
    }
  }, [schedule, isOpen]);

  // Get owners for dropdown
  const [owners, setOwners] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Load users and products when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadProducts();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await authService.getUsers();
      // Include current user if not already in the list
      const allUsers = [...users];
      if (currentUser && !users.find(u => u.id === currentUser.id)) {
        allUsers.push({
          id: currentUser.id,
          name: currentUser.name || 'Current User',
          email: currentUser.email || '',
          role: currentUser.role || 'USER',
        });
      }
      setOwners(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

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

  const handleScheduleChange = (field: keyof ScheduleConfig, value: FrequencyType | number | undefined) => {
    setSchedule((prev) => {
      const newSchedule = { ...prev, [field]: value };
      // Reset frequencyValue when switching away from CUSTOM
      if (field === 'frequencyType' && value !== 'CUSTOM') {
        newSchedule.frequencyValue = undefined;
      }
      return newSchedule;
    });
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

    if (!formData.ownerId) {
      newErrors.ownerId = 'Owner is required';
    }

    if (!schedule.frequencyType) {
      newErrors.schedule = 'Follow-up frequency is required';
    }

    if (schedule.frequencyType === 'CUSTOM') {
      if (!schedule.frequencyValue || schedule.frequencyValue <= 0) {
        newErrors.frequencyValue = 'Frequency value is required for custom schedule';
      }
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

    setIsLoading(true);
    setErrors({});

    // Build payload
    const payload: {
      leadName: string;
      companyName?: string;
      email: string;
      phone?: string;
      frequencyType: 'DAILY' | 'WEEKLY' | 'CUSTOM';
      frequencyValue?: number;
      ownerId?: string;
      productId?: string;
    } = {
      leadName: formData.leadName,
      email: formData.email,
      frequencyType: schedule.frequencyType,
    };

    if (formData.companyName) {
      payload.companyName = formData.companyName;
    }

    if (formData.phone) {
      payload.phone = formData.phone;
    }

    if (schedule.frequencyType === 'CUSTOM' && schedule.frequencyValue) {
      payload.frequencyValue = schedule.frequencyValue;
    }

    if (formData.ownerId) {
      payload.ownerId = formData.ownerId;
    }

    if (formData.productId) {
      payload.productId = formData.productId;
    }

    leadsService
      .createLead(payload)
      .then(() => {
        // Call onSuccess to refresh the table first
        onSuccess?.();
        
        // Close modal immediately - use setTimeout to ensure state update is processed
        setTimeout(() => {
          onClose();
        }, 0);
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
        const message = error instanceof Error ? error.message : 'Failed to create lead';
        setAlert({
          type: 'error',
          message,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Lead"
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
            </div>
          </div>

          {/* Ownership */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Ownership</h2>
            <div>
              <label htmlFor="ownerId" className="block text-sm font-medium text-text-primary mb-1">
                Assign To <span className="text-error-600">*</span>
              </label>
              <select
                id="ownerId"
                value={formData.ownerId}
                onChange={(e) => handleInputChange('ownerId', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
                  errors.ownerId
                    ? 'border-error-500 focus:ring-error-500'
                    : 'border-border-default'
                }`}
                disabled={isLoading || isLoadingUsers}
              >
                <option value="">{isLoadingUsers ? 'Loading users...' : 'Select user'}</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                    {owner.id === currentUser?.id && ' (You)'}
                  </option>
                ))}
              </select>
              {errors.ownerId && (
                <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.ownerId}</p>
              )}
            </div>
          </div>

          {/* Follow-up Schedule */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Follow-up Schedule</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="frequencyType" className="block text-sm font-medium text-text-primary mb-1">
                  Frequency Type <span className="text-error-600">*</span>
                </label>
                <select
                  id="frequencyType"
                  value={schedule.frequencyType}
                  onChange={(e) => handleScheduleChange('frequencyType', e.target.value as FrequencyType)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
                    errors.schedule
                      ? 'border-error-500 focus:ring-error-500'
                      : 'border-border-default'
                  }`}
                  disabled={isLoading}
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="CUSTOM">Custom</option>
                </select>
                {errors.schedule && (
                  <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.schedule}</p>
                )}
              </div>

              {schedule.frequencyType === 'CUSTOM' && (
                <div>
                  <label htmlFor="frequencyValue" className="block text-sm font-medium text-text-primary mb-1">
                    Frequency Value (days) <span className="text-error-600">*</span>
                  </label>
                  <input
                    id="frequencyValue"
                    type="number"
                    min="1"
                    value={schedule.frequencyValue || ''}
                    onChange={(e) =>
                      handleScheduleChange('frequencyValue', e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
                      errors.frequencyValue
                        ? 'border-error-500 focus:ring-error-500'
                        : 'border-border-default'
                    }`}
                    placeholder="Enter number of days"
                    disabled={isLoading}
                  />
                  {errors.frequencyValue && (
                    <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.frequencyValue}</p>
                  )}
                </div>
              )}

              {/* Schedule Preview */}
              {schedulePreview && (
                <div className="p-4 bg-info-50 dark:bg-info-900/20 rounded-lg border border-info-200 dark:border-info-800">
                  <p className="text-sm font-medium text-info-800 dark:text-info-400 mb-1">
                    Schedule Preview
                  </p>
                  <p className="text-sm text-info-700 dark:text-info-500">
                    {schedulePreview.description}
                  </p>
                  <p className="text-sm font-semibold text-info-800 dark:text-info-400 mt-2">
                    Next follow-up will be on: {formatFollowUpDate(schedulePreview.date)}
                  </p>
                </div>
              )}
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
              Create Lead
            </Button>
          </div>
        </div>
      </form>
    </AppModal>
  );
};

export default CreateLeadModal;

