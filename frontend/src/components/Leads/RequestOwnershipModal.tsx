import React, { useState, useEffect } from 'react';
import { ownershipService } from '../../services/ownership.service';
import { authService, type User } from '../../services/auth.service';
import { authStore } from '../../store/auth.store';
import AppModal from '../modal/AppModal';
import Button from '../ui/Button';
import ErrorAlert from '../alerts/ErrorAlert';
import axios from 'axios';
import type { ValidationErrors } from '../../services/auth.service';

interface RequestOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  companyName?: string | null;
  productName?: string | null;
  productCode?: string | null;
  onSuccess?: () => void;
}

interface FormErrors {
  requestedOwnerId?: string;
  [key: string]: string | undefined;
}

const RequestOwnershipModal: React.FC<RequestOwnershipModalProps> = ({
  isOpen,
  onClose,
  leadId,
  leadName,
  companyName,
  productName,
  productCode,
  onSuccess,
}) => {
  const [requestedOwnerId, setRequestedOwnerId] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error'; message: string } | null>(null);
  const [owners, setOwners] = useState<User[]>([]);

  const currentUser = authStore.currentUser;

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      setRequestedOwnerId('');
      setReason('');
      setErrors({});
      setAlert(null);
      loadUsers();
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
      setAlert({
        type: 'error',
        message: 'Failed to load users. Please try again.',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setErrors({});

    // Validation
    if (!requestedOwnerId) {
      setErrors({ requestedOwnerId: 'Owner is required' });
      return;
    }

    setIsLoading(true);

    ownershipService
      .requestOwnershipChange(leadId, {
        requestedOwnerId,
        reason: reason.trim() || undefined,
      })
      .then(() => {
        onSuccess?.();
        onClose();
      })
      .catch((error: unknown) => {
        // Handle validation errors (422) - show inline
        if (axios.isAxiosError(error) && error.response?.status === 422) {
          const validationErrors = (error.response.data as any)?.errors as ValidationErrors | undefined;

          if (validationErrors) {
            const formErrors: FormErrors = {};
            Object.keys(validationErrors).forEach((key) => {
              formErrors[key] = validationErrors[key];
            });
            setErrors(formErrors);
            return;
          }
        }

        // Handle other errors - show ErrorAlert
        const message = error instanceof Error ? error.message : 'Failed to request ownership change';
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
    <AppModal isOpen={isOpen} onClose={onClose} title="Request Ownership Change">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lead Details */}
        <div className="bg-background-secondary p-4 rounded-lg space-y-2">
          <div>
            <span className="text-sm font-medium text-text-secondary">Lead Name:</span>
            <span className="ml-2 text-text-primary">{leadName}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-text-secondary">Company:</span>
            <span className="ml-2 text-text-primary">{companyName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-text-secondary">Product:</span>
            <span className="ml-2 text-text-primary">
              {productName ? (
                <>
                  {productName}
                  {productCode && (
                    <span className="text-text-secondary ml-1">({productCode})</span>
                  )}
                </>
              ) : (
                'N/A'
              )}
            </span>
          </div>
        </div>

        {alert && (
          <ErrorAlert message={alert.message} onClose={() => setAlert(null)} />
        )}

        <div>
          <label htmlFor="requestedOwnerId" className="block text-sm font-medium text-text-primary mb-1">
            Requested Owner <span className="text-error-600">*</span>
          </label>
          <select
            id="requestedOwnerId"
            value={requestedOwnerId}
            onChange={(e) => {
              setRequestedOwnerId(e.target.value);
              if (errors.requestedOwnerId) {
                setErrors({ ...errors, requestedOwnerId: undefined });
              }
            }}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary ${
              errors.requestedOwnerId
                ? 'border-error-500 focus:ring-error-500'
                : 'border-border-default'
            }`}
            disabled={isLoading || isLoadingUsers}
          >
            <option value="">{isLoadingUsers ? 'Loading users...' : 'Select owner'}</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
                {owner.id === currentUser?.id && ' (You)'}
              </option>
            ))}
          </select>
          {errors.requestedOwnerId && (
            <p className="mt-1 text-sm text-error-600 dark:text-error-400">{errors.requestedOwnerId}</p>
          )}
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-text-primary mb-1">
            Reason (Optional)
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-background-secondary dark:text-text-primary"
            placeholder="Optional reason for ownership change..."
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
            Submit Request
          </Button>
        </div>
      </form>
    </AppModal>
  );
};

export default RequestOwnershipModal;
